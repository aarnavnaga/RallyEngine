import { RL_STUDIO_STATUSES } from "@/lib/data/source-of-truth";

export type RlStudioStatus = (typeof RL_STUDIO_STATUSES)[number];

interface StatusPillProps {
  status: RlStudioStatus;
  size?: "sm" | "md";
}

const TONE: Record<RlStudioStatus, { fg: string; bg: string; border: string }> = {
  Pending: {
    fg: "var(--fg-muted)",
    bg: "var(--bg-elev)",
    border: "var(--border)",
  },
  "In Review": {
    fg: "#7857FF",
    bg: "var(--accent-soft)",
    border: "var(--accent-soft)",
  },
  Approved: {
    fg: "#0e7c54",
    bg: "#dcfce7",
    border: "#bbf7d0",
  },
  "Needs Edits": {
    fg: "#a16207",
    bg: "#fef3c7",
    border: "#fde68a",
  },
  Discarded: {
    fg: "#991b1b",
    bg: "#fee2e2",
    border: "#fecaca",
  },
};

export function StatusPill({ status, size = "sm" }: StatusPillProps) {
  const tone = TONE[status];
  const padding = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const text = size === "md" ? "text-[12px]" : "text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${padding} ${text} font-medium tracking-tight`}
      style={{
        color: tone.fg,
        backgroundColor: tone.bg,
        borderColor: tone.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tone.fg }}
      />
      {status}
    </span>
  );
}
