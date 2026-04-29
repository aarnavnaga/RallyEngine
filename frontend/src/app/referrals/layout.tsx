import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaGuard } from "@/components/shell/PersonaGuard";

export const metadata: Metadata = { title: "Referrals" };

// Centered max-width matches work.mercor.com/refer 1:1 — see HomeLayout note.
export default function L({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PersonaGuard required="creator" fallback="/admin">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </PersonaGuard>
    </AppShell>
  );
}
