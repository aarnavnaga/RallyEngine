import { LikertSlider } from "./LikertSlider";

export interface PairwiseVariant {
  id: string;
  label: string;
  creatorName: string;
  creatorHandle: string;
  thumbnailEmoji: string;
  thumbnailColor: string;
  caption: string;
  hashtags: string[];
  hookCopy: string;
}

export interface PairwiseRatings {
  winner: number; // 1..5  (1 = A much better, 5 = B much better)
  helpfulness: number; // 1..7
  brandFit: number; // 1..7
  creativeStyle: number; // 1..7
  improvement: string;
}

interface PairwiseABCardProps {
  taskTitle: string;
  taskPrompt: string;
  variantA: PairwiseVariant;
  variantB: PairwiseVariant;
  ratings: PairwiseRatings;
  onWinnerChange: (winner: number) => void;
  onLikertChange: (
    field: "helpfulness" | "brandFit" | "creativeStyle",
    next: number,
  ) => void;
  onImprovementChange: (text: string) => void;
  disabled?: boolean;
}

const WINNER_LABELS = ["A much better", "A better", "Tie", "B better", "B much better"];

function VariantCard({
  variant,
  letter,
  highlight,
}: {
  variant: PairwiseVariant;
  letter: "A" | "B";
  highlight: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-[var(--bg-card)] transition-colors ${
        highlight
          ? "border-[#7857FF] shadow-[0_0_0_3px_var(--accent-soft)]"
          : "border-[var(--border)]"
      }`}
    >
      <div
        className="relative flex aspect-[9/12] items-center justify-center overflow-hidden rounded-t-lg text-[64px]"
        style={{
          background: `linear-gradient(135deg, ${variant.thumbnailColor} 0%, #1a1a1a 100%)`,
        }}
      >
        <span aria-hidden>{variant.thumbnailEmoji}</span>
        <span
          className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur"
        >
          Variant {letter}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {variant.creatorHandle}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <div className="text-[12.5px] font-semibold text-[var(--fg)]">
            {variant.label}
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">
            by {variant.creatorName}
          </div>
        </div>
        <p className="line-clamp-3 text-[12px] leading-snug text-[var(--fg)]">
          <span className="font-semibold text-[#7857FF]">Hook:</span>{" "}
          {variant.hookCopy}
        </p>
        <p className="line-clamp-2 text-[11.5px] text-[var(--fg-muted)]">
          {variant.caption}
        </p>
        <div className="mt-auto flex flex-wrap gap-1">
          {variant.hashtags.slice(0, 4).map((h) => (
            <span
              key={h}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]"
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PairwiseABCard({
  taskTitle,
  taskPrompt,
  variantA,
  variantB,
  ratings,
  onWinnerChange,
  onLikertChange,
  onImprovementChange,
  disabled = false,
}: PairwiseABCardProps) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="label-cap">Active task</div>
            <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--fg)]">
              {taskTitle}
            </h3>
          </div>
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-[var(--fg-muted)]">
          {taskPrompt}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <VariantCard variant={variantA} letter="A" highlight={ratings.winner <= 2} />
        <VariantCard variant={variantB} letter="B" highlight={ratings.winner >= 4} />
      </div>

      <div className="border-t border-[var(--border)] px-5 py-4">
        <div className="label-cap">Pairwise winner</div>
        <p className="mt-1 text-[11.5px] text-[var(--fg-muted)]">
          1 = A much better · 3 = tie · 5 = B much better
        </p>
        <fieldset
          disabled={disabled}
          className="mt-2 grid grid-cols-5 gap-1.5"
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n === ratings.winner;
            return (
              <label
                key={n}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-2 text-center transition-colors ${
                  active
                    ? "border-[#7857FF] bg-[var(--accent-soft)] text-[#7857FF]"
                    : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                <input
                  type="radio"
                  name="pairwise-winner"
                  value={n}
                  checked={active}
                  onChange={() => onWinnerChange(n)}
                  className="sr-only"
                />
                <span className="text-[14px] font-semibold">{n}</span>
                <span className="text-[10px] leading-tight">
                  {WINNER_LABELS[n - 1]}
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="grid gap-5 border-t border-[var(--border)] px-5 py-4 md:grid-cols-3">
        <LikertSlider
          label="Helpfulness"
          helper="1 = unhelpful · 7 = very helpful"
          min={1}
          max={7}
          value={ratings.helpfulness}
          onChange={(v) => onLikertChange("helpfulness", v)}
          minLabel="Unhelpful"
          maxLabel="Very helpful"
        />
        <LikertSlider
          label="Brand fit"
          helper="1 = off-brand · 7 = perfect fit"
          min={1}
          max={7}
          value={ratings.brandFit}
          onChange={(v) => onLikertChange("brandFit", v)}
          minLabel="Off-brand"
          maxLabel="Perfect fit"
        />
        <LikertSlider
          label="Creative style"
          helper="1 = generic · 7 = distinctive voice"
          min={1}
          max={7}
          value={ratings.creativeStyle}
          onChange={(v) => onLikertChange("creativeStyle", v)}
          minLabel="Generic"
          maxLabel="Distinctive"
        />
      </div>

      <div className="border-t border-[var(--border)] px-5 py-4">
        <label htmlFor="improvement-areas" className="label-cap">
          Improvement areas
        </label>
        <textarea
          id="improvement-areas"
          rows={3}
          disabled={disabled}
          value={ratings.improvement}
          onChange={(e) => onImprovementChange(e.target.value)}
          placeholder="What would push the winning variant from a 5/7 to a 7/7? (Tone, hook, CTA, pacing.)"
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:border-[#7857FF] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>
    </div>
  );
}
