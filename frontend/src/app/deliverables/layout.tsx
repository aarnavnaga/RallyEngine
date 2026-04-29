import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaGuard } from "@/components/shell/PersonaGuard";
import { DeliverablesProvider } from "@/lib/state/deliverables";

export const metadata: Metadata = { title: "Deliverables" };

export default function DeliverablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PersonaGuard required="creator" fallback="/admin">
        <DeliverablesProvider>{children}</DeliverablesProvider>
      </PersonaGuard>
    </AppShell>
  );
}
