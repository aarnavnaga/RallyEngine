"use client";

interface RoleCardProps {
  title: string;
  pay: string;
  hired: number;
  href?: string;
  isNew?: boolean;
  highlighted?: boolean;
  "data-test-id"?: string;
}

/** Overlapping avatar stack - colored circles as stand-ins for real applicant photos */
function AvatarStack({ count }: { count: number }) {
  const colors = ["#7857ff", "#a78bfa", "#c4b5fd", "#818cf8"];
  const shown = Math.min(count, 4);
  return (
    <div className="flex items-center">
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
          style={{
            background: colors[i % colors.length],
            marginLeft: i === 0 ? 0 : "-6px",
            zIndex: shown - i,
          }}
        >
          {String.fromCharCode(65 + i)}
        </span>
      ))}
    </div>
  );
}

export function RoleCard({
  title,
  pay,
  hired,
  href = "/explore",
  isNew = false,
  highlighted = false,
  "data-test-id": testId,
}: RoleCardProps) {
  return (
    <div
      data-test-id={testId}
      className={[
        "relative flex flex-col gap-4 rounded-[12px] border p-5 transition-shadow hover:shadow-[var(--shadow-pop)]",
        highlighted
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-0"
          : "border-[var(--border)]",
      ].join(" ")}
    >
      {isNew && (
        <span className="absolute right-4 top-4 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          NEW
        </span>
      )}

      <div>
        <p className="pr-10 text-[15px] font-medium leading-snug text-[var(--fg)] line-clamp-2">
          {title}
        </p>
        <p className="mt-1 text-[13px] text-[var(--fg-muted)]">{pay}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AvatarStack count={Math.min(hired, 4)} />
          <span className="text-[12px] text-[var(--fg-muted)]">
            {hired} hired recently
          </span>
        </div>
        <a
          href={href}
          className="text-[13px] font-medium text-[var(--accent)] hover:underline"
        >
          Apply
        </a>
      </div>
    </div>
  );
}
