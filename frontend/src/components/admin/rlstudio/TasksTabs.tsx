export type RlStudioTab = "Tasks" | "Approved Tasks" | "Submission";

interface TasksTabsProps {
  active: RlStudioTab;
  onChange: (next: RlStudioTab) => void;
  counts: Record<RlStudioTab, number>;
}

const TABS: RlStudioTab[] = ["Tasks", "Approved Tasks", "Submission"];

export function TasksTabs({ active, onChange, counts }: TasksTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="RL Studio sections"
      className="flex items-center gap-1 border-b border-[var(--border)]"
    >
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={`relative -mb-px flex items-center gap-2 px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
              isActive
                ? "border-b-2 border-[#7857FF] text-[#7857FF]"
                : "border-b-2 border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            <span>{t}</span>
            <span
              className={`rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[#7857FF]"
                  : "bg-[var(--bg-elev)] text-[var(--fg-muted)]"
              }`}
            >
              {counts[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
