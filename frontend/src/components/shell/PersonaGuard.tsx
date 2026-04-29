"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, type Persona } from "@/lib/state/user";

/**
 * Wraps protected route trees and bounces users whose persona doesn't match.
 *
 * AppShell already enforces "must be signed in" — this component layers
 * persona-specific gating on top so an admin doesn't browse creator-only
 * routes and a creator doesn't browse admin routes.
 *
 * Gate condition: hydrated && identity != null && identity.persona !== required.
 * The hydrated check matters because identity is null on first render before
 * UserProvider reads localStorage; bouncing before hydration would always
 * forward to the fallback even for the correct-persona user.
 */
export function PersonaGuard({
  required,
  fallback,
  children,
}: {
  required: Persona;
  fallback: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { identity, hydrated } = useUser();

  useEffect(() => {
    if (!hydrated) return;
    if (!identity) return; // AppShell handles the !identity case (redirects to /).
    if (identity.persona !== required) router.replace(fallback);
  }, [hydrated, identity, required, fallback, router]);

  // While we're still confirming the persona, render nothing instead of the
  // wrong-persona content. Avoids a flash of admin pages to a creator (or
  // vice versa) during the redirect frame.
  if (hydrated && identity && identity.persona !== required) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--fg-muted)]">
        Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
