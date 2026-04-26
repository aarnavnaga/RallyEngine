import { AppShell } from "@/components/shell/AppShell";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
