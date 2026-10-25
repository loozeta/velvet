"use client";

import { useRouter } from "next/navigation";

export function AdminButton(props: {
  action: "remove" | "dismiss" | "ban" | "unban";
  id: string;
  reportId?: string;
  label: string;
  danger?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      className={`rounded border px-3 py-1 text-xs ${props.danger ? "border-red-500/50 text-red-400" : "border-border text-muted"}`}
      onClick={async () => {
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(props),
        });
        router.refresh();
      }}
    >
      {props.label}
    </button>
  );
}
