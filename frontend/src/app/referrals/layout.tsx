import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "Referrals" };

// Centered max-width matches work.mercor.com/refer 1:1 — see HomeLayout note.
export default function L({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1080px]">{children}</div>
    </AppShell>
  );
}
