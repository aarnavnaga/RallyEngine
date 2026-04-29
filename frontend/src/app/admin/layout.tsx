import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaGuard } from "@/components/shell/PersonaGuard";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "Mercor | %s",
  },
};

export default function L({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PersonaGuard required="admin" fallback="/home">
        {children}
      </PersonaGuard>
    </AppShell>
  );
}
