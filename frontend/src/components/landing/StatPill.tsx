"use client";

interface StatPillProps {
  label: string;
  value: string;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-1.5 px-5 py-2">
      <span className="text-[13px] text-[var(--fg-muted)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--fg)]">{value}</span>
    </div>
  );
}
