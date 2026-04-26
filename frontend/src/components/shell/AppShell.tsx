"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MercorFooter } from "./MercorFooter";
import { useDemoTicker } from "./ToastContainer";
import { useUser } from "@/lib/state/user";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { identity } = useUser();

  useEffect(() => {
    if (!identity) router.replace("/");
  }, [identity, router]);

  useDemoTicker(!!identity, identity?.persona ?? null);

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
    </div>
  );
}
