"use client";

import Link from "next/link";
import { useUser } from "@/lib/state/user";
import { ResetDemoButton } from "./ResetDemoButton";

/** Mercor-style apply-page shell - no sidebar, just topbar with job title + progress.
 * Mirrors work.mercor.com/jobs/apply/<id> layout. */
export function AppShellLite({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-6 py-4">
        <Link
          href="/explore"
          className="text-[14px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          ← Go back
        </Link>
        <div className="text-[14px] font-medium tracking-tight text-[var(--accent)]">Mercor</div>
        <div className="flex items-center gap-3">
          <button className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
            FAQ
          </button>
          <button className="rounded-md border border-[var(--border)] px-3 py-1 text-[13px] hover:bg-[var(--bg-hover)]">
            Contact support
          </button>
          <UserChip />
        </div>
      </header>
      {children}
      <ResetDemoButton />
    </div>
  );
}

function UserChip() {
  const { identity } = useUser();
  if (!identity) return null;
  return (
    <div className="text-[12px] text-[var(--fg-muted)]">
      {identity.persona === "creator" ? identity.name : identity.name}
    </div>
  );
}
