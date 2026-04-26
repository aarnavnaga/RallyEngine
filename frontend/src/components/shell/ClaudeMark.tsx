"use client";

type Props = { model?: "haiku" | "sonnet" | "opus"; size?: "xs" | "sm" };

export function ClaudeMark({ model = "haiku", size = "sm" }: Props) {
  const label = `Claude ${model.charAt(0).toUpperCase() + model.slice(1)}`;
  const px = size === "xs" ? 10 : 12;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
      title={`Powered by ${label}`}
    >
      <svg width={px} height={px} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M6 1 L7.2 4.3 L10.5 5.5 L7.2 6.7 L6 10 L4.8 6.7 L1.5 5.5 L4.8 4.3 Z"
          fill="#cc785c"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}
