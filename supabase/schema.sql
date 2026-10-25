-- Velvet: esquema inicial. Ejecutar en el SQL editor de Supabase.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  credits int not null default 10,
  plan text not null default 'free',
  role text not null default 'user' check (role in ('user', 'admin')),
  age_confirmed_at timestamptz,
  referred_by uuid references profiles(id),
  referral_code text unique default substr(md5(random()::text), 1, 8),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  prompt text not null,
  result_url text,
  status text not null default 'done' check (status in ('pending', 'done', 'failed', 'removed')),
  is_public boolean not null default false,
  cost int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists moderation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  prompt text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount_cents int not null,
  credits int not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references profiles(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  amount_cents int not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Descuenta créditos de forma atómica. Devuelve false si no alcanzan.
create or replace function spend_credits(uid uuid, amount int) returns boolean
language plpgsql security definer as $$
begin
  update profiles set credits = credits - amount
   where id = uid and credits >= amount and not banned;
  return found;
end $$;

alter table profiles enable row level security;
alter table generations enable row level security;
alter table moderation_log enable row level security;
alter table reports enable row level security;
alter table payments enable row level security;
alter table affiliate_commissions enable row level security;

create policy "profile: ver propio o admin" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profile: admin edita" on profiles for update using (is_admin());

create policy "gen: ver propias, públicas o admin" on generations for select
  using (user_id = auth.uid() or (is_public and status = 'done') or is_admin());
create policy "gen: editar propias" on generations for update
  using (user_id = auth.uid() or is_admin());
create policy "gen: borrar propias" on generations for delete
  using (user_id = auth.uid() or is_admin());

create policy "mod: solo admin" on moderation_log for select using (is_admin());

create policy "reports: crear" on reports for insert with check (auth.uid() is not null);
create policy "reports: admin" on reports for select using (is_admin());
create policy "reports: admin edita" on reports for update using (is_admin());

create policy "pagos: propios o admin" on payments for select
  using (user_id = auth.uid() or is_admin());
create policy "comisiones: propias o admin" on affiliate_commissions for select
  using (affiliate_id = auth.uid() or is_admin());

-- Inserciones en generations, moderation_log, payments y comisiones y cambios
-- de créditos se hacen solo desde el servidor con la service role key.
-- Importante: el usuario no puede cambiar sus propios credits/role (no hay
-- policy de update para él en profiles).

-- Endurecimiento: el usuario solo puede cambiar is_public en sus generaciones.
revoke update on generations from authenticated, anon;
grant update (is_public) on generations to authenticated;

-- Estudio: parámetros de generación, personajes (definidos por texto) y likes.
alter table generations add column if not exists params jsonb not null default '{}';

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text not null check (char_length(description) between 5 and 600),
  created_at timestamptz not null default now()
);

create table if not exists likes (
  user_id uuid not null references profiles(id) on delete cascade,
  generation_id uuid not null references generations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, generation_id)
);

alter table characters enable row level security;
alter table likes enable row level security;

create policy "characters: ver propios" on characters for select using (user_id = auth.uid());
create policy "characters: borrar propios" on characters for delete using (user_id = auth.uid());
-- Crear personajes pasa por /api/characters para moderar la descripción.

create policy "likes: ver propios" on likes for select using (user_id = auth.uid());
create policy "likes: crear propios" on likes for insert with check (user_id = auth.uid());
create policy "likes: borrar propios" on likes for delete using (user_id = auth.uid());

-- Seguridad: las funciones security definer no deben ser invocables desde el
-- cliente (/rest/v1/rpc). spend_credits y handle_new_user solo las usa el
-- servidor (service role) y el trigger; is_admin se usa dentro de las policies.
revoke execute on function spend_credits(uuid, int) from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- El trigger sobre auth.users lo dispara supabase_auth_admin: necesita EXECUTE.
grant execute on function handle_new_user() to supabase_auth_admin;
alter function handle_new_user() set search_path = public;
alter function spend_credits(uuid, int) set search_path = public;
alter function is_admin() set search_path = public;

-- Modelos propios: cada personaje puede fijar una cara de referencia, que debe ser
-- una imagen generada por el propio usuario en la plataforma (nunca una subida).
alter table characters add column if not exists face_generation_id uuid references generations(id) on delete set null;

-- Prompt visual detallado del modelo (generado a partir de sus caras/ángulos).
alter table characters add column if not exists visual_profile text check (char_length(visual_profile) <= 6000);
