import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaGuard } from "@/components/shell/PersonaGuard";

export const metadata: Metadata = { title: "Home" };

// Real work.mercor.com/home centers the content with a max-width container —
// the contracts/applications/offers list does NOT stretch edge-to-edge.
// Visual reference 2026-04-28: content spans ~1080px centered in main area.
// /explore keeps full-width because its card grid wants the breathing room.
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PersonaGuard required="creator" fallback="/admin">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </PersonaGuard>
    </AppShell>
  );
}
