interface LikertSliderProps {
  label: string;
  helper?: string;
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
  minLabel?: string;
  maxLabel?: string;
}

export function LikertSlider({
  label,
  helper,
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
}: LikertSliderProps) {
  const stops: number[] = [];
  for (let i = min; i <= max; i += 1) stops.push(i);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium text-[var(--fg)]">{label}</div>
          {helper ? (
            <div className="text-[11px] text-[var(--fg-muted)]">{helper}</div>
          ) : null}
        </div>
        <div
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-0.5 text-[12px] font-semibold tabular-nums"
          style={{ color: "#7857FF" }}
        >
          {value}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {stops.map((s) => {
          const active = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-label={`Set ${label} to ${s}`}
              className={`flex-1 rounded-md border py-1.5 text-[12px] font-medium transition-colors ${
                active
                  ? "border-[#7857FF] bg-[var(--accent-soft)] text-[#7857FF]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-1 flex items-center justify-between text-[10.5px] text-[var(--fg-muted)]">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
