import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaGuard } from "@/components/shell/PersonaGuard";

export const metadata: Metadata = { title: "Explore" };

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PersonaGuard required="creator" fallback="/admin">
        {children}
      </PersonaGuard>
    </AppShell>
  );
}
