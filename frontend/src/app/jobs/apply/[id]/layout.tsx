import { AppShellLite } from "@/components/shell/AppShellLite";

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLite>{children}</AppShellLite>;
}
