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
        <div aria-hidden="true" />
        <div className="flex items-center gap-3">
          <a
            href="mailto:loganmann@ucsb.edu?subject=Mercor%20demo%20%E2%80%94%20FAQ"
            className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            FAQ
          </a>
          <a
            href="mailto:loganmann@ucsb.edu?subject=Mercor%20demo%20%E2%80%94%20support&body=Hi%20Logan%2C%0A%0A"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-[13px] hover:bg-[var(--bg-hover)]"
          >
            Contact support
          </a>
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
