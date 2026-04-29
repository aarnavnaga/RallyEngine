import type { Metadata } from "next";
import { AppShellLite } from "@/components/shell/AppShellLite";
import { PersonaGuard } from "@/components/shell/PersonaGuard";

export const metadata: Metadata = { title: "Apply" };

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellLite>
      <PersonaGuard required="creator" fallback="/admin">
        {children}
      </PersonaGuard>
    </AppShellLite>
  );
}
