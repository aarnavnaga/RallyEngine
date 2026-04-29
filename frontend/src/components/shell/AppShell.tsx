"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MercorFooter } from "./MercorFooter";
import { ResetDemoButton } from "./ResetDemoButton";
import { useUser } from "@/lib/state/user";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { identity, hydrated } = useUser();

  // Footer is the creator-side public footer (Mercor brand links, careers,
  // press, etc.). Admin routes don't use it — hiding it on /admin/* avoids
  // exposing dead-link footer items (`href="#"`) that the demo presenter
  // shouldn't be clicking.
  const showFooter = !pathname?.startsWith("/admin");

  useEffect(() => {
    // Wait until UserProvider has read localStorage. Otherwise a hard
    // refresh on /home (or anywhere else) sees identity === null on the
    // first render and bounces back to /, which then forwards to /explore —
    // so refresh always lands on /explore regardless of what page you were on.
    if (hydrated && !identity) router.replace("/");
  }, [hydrated, identity, router]);

  // Demo ticker (pop-up toasts) intentionally disabled for the live demo —
  // the floating notifications were distracting Aaron during the walkthrough.

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
      <main className="ml-[88px] min-h-screen">
        <div className="w-full px-8 py-8">{children}</div>
        {showFooter ? <MercorFooter /> : null}
      </main>
      <ResetDemoButton />
    </div>
  );
}
