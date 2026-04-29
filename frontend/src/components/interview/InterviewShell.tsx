"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useUser } from "@/lib/state/user";

/**
 * Minimal Mercor-style chrome for the standalone interview page.
 * Mirrors work.mercor.com/interview/<id>: small purple M top-left,
 * FAQ + "Back to dashboard" + circular avatar top-right. Nothing else.
 *
 * The Suspense wrapper around BackToDashboardLink is required because
 * useSearchParams is read during prerender and Next 15 marks the closest
 * Suspense boundary as dynamic. Without it, build fails with
 * "useSearchParams() should be wrapped in a suspense boundary".
 */
export function InterviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[var(--fg)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
        <Link href="/" aria-label="Mercor home">
          <Image
            src="/mercor-logo.png"
            alt="Mercor"
            width={28}
            height={28}
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="mailto:loganmann@ucsb.edu?subject=Mercor%20demo%20%E2%80%94%20FAQ"
            className="rounded-md px-3 py-1 text-[13px] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
          >
            FAQ
          </a>
          <Suspense fallback={<BackToDashboardFallback />}>
            <BackToDashboardLink />
          </Suspense>
          <UserAvatar />
        </div>
      </header>
      {children}
    </div>
  );
}

function BackToDashboardFallback() {
  return (
    <Link
      href="/home?tab=assessments"
      className="rounded-full border border-[var(--border)] px-4 py-1.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
    >
      Back to dashboard
    </Link>
  );
}

function BackToDashboardLink() {
  // Honor returnPath if present (mirrors Mercor's pattern). Without it we
  // default to the creator's home, which is where the assessment list lives.
  const params = useSearchParams();
  const returnPath = params.get("returnPath") ?? "/home?tab=assessments";
  return (
    <Link
      href={returnPath}
      className="rounded-full border border-[var(--border)] px-4 py-1.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
    >
      Back to dashboard
    </Link>
  );
}

function UserAvatar() {
  const { identity } = useUser();
  const src = identity?.persona === "admin" ? "/aaron.jpg" : "/avatars/loganmann32.jpg";
  const alt = identity?.name ?? "Profile";
  return (
    <span className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-[var(--border)]">
      <Image src={src} alt={alt} fill sizes="32px" className="object-cover" />
    </span>
  );
}
