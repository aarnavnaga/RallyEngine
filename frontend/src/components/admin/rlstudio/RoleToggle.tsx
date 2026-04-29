export type RlStudioRole = "Writer" | "Reviewer";

interface RoleToggleProps {
  role: RlStudioRole;
  onChange: (next: RlStudioRole) => void;
}

const ROLES: RlStudioRole[] = ["Writer", "Reviewer"];

export function RoleToggle({ role, onChange }: RoleToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="RL Studio role"
      className="inline-flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-0.5"
    >
      {ROLES.map((r) => {
        const active = r === role;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(r)}
            className={`rounded-[5px] px-3 py-1 text-[12px] font-medium tracking-tight transition-colors ${
              active
                ? "bg-[var(--accent-soft)] text-[#7857FF]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
