import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { DeliverablesProvider } from "@/lib/state/deliverables";

export const metadata: Metadata = { title: "Deliverables" };

export default function DeliverablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <DeliverablesProvider>{children}</DeliverablesProvider>
    </AppShell>
  );
}
