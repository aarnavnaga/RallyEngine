"use client";

interface MeetCardProps {
  name: string;
  headline: string;
  avatarSrc?: string;
  "data-test-id"?: string;
}

export function MeetCard({
  name,
  headline,
  avatarSrc,
  "data-test-id": testId,
}: MeetCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      data-test-id={testId}
      className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-white p-4 transition-shadow hover:shadow-[var(--shadow-pop)]"
    >
      {/* Avatar */}
      <div className="relative h-12 w-12 flex-shrink-0">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={name}
            className="h-12 w-12 rounded-full object-cover"
            onError={(e) => {
              const t = e.currentTarget as HTMLImageElement;
              t.style.display = "none";
              const fb = t.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <span
          className="h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[15px] font-semibold text-[var(--accent)]"
          style={{ display: avatarSrc ? "none" : "flex" }}
          aria-hidden="true"
        >
          {initials}
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-[var(--fg)]">{headline}</p>
        <p className="text-[12px] text-[var(--fg-muted)]">by {name}</p>
      </div>
    </div>
  );
}
