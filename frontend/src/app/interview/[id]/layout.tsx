import type { Metadata } from "next";
import { InterviewShell } from "@/components/interview/InterviewShell";

export const metadata: Metadata = { title: "Take interview | Mercor" };

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return <InterviewShell>{children}</InterviewShell>;
}
