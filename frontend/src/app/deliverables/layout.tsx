import { AppShell } from "@/components/shell/AppShell";
import { DeliverablesProvider } from "@/lib/state/deliverables";

export default function DeliverablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <DeliverablesProvider>{children}</DeliverablesProvider>
    </AppShell>
  );
}
