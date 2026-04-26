"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MercorFooter } from "./MercorFooter";
import { useDemoTicker } from "./ToastContainer";
import { ResetDemoButton } from "./ResetDemoButton";
import { useUser } from "@/lib/state/user";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { identity, hydrated } = useUser();

  useEffect(() => {
    // Wait until UserProvider has read localStorage. Otherwise a hard
    // refresh on /home (or anywhere else) sees identity === null on the
    // first render and bounces back to /, which then forwards to /explore —
    // so refresh always lands on /explore regardless of what page you were on.
    if (hydrated && !identity) router.replace("/");
  }, [hydrated, identity, router]);

  useDemoTicker(!!identity, identity?.persona ?? null);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--fg-muted)]" />
    );
  }

  if (!identity) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--fg-muted)]">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Sidebar />
      <main className="ml-[68px] min-h-screen">
        <div className="w-full px-10 py-10">{children}</div>
        <MercorFooter />
      </main>
      <ResetDemoButton />
    </div>
  );
}
