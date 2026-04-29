import { RL_STUDIO_WORLDS } from "@/lib/data/source-of-truth";

export type RlStudioWorld = (typeof RL_STUDIO_WORLDS)[number];

interface ProjectWorldSelectorProps {
  projectName: string;
  world: RlStudioWorld;
  onWorldChange: (next: RlStudioWorld) => void;
}

export function ProjectWorldSelector({
  projectName,
  world,
  onWorldChange,
}: ProjectWorldSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="label-cap">Project</span>
        <span
          className="rounded-md border px-2 py-0.5 text-[12px] font-semibold"
          style={{
            color: "#7857FF",
            backgroundColor: "var(--accent-soft)",
            borderColor: "var(--accent-soft)",
          }}
        >
          {projectName}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="label-cap">World</span>
        <div className="flex flex-wrap gap-1.5">
          {RL_STUDIO_WORLDS.map((w) => {
            const active = w === world;
            return (
              <button
                key={w}
                type="button"
                onClick={() => onWorldChange(w)}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-[#7857FF] bg-[var(--accent-soft)] text-[#7857FF]"
                    : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
