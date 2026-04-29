interface RubricRailProps {
  brandName: string;
  brandVoice: string[];
  adThemes?: string[];
  worldName: string;
}

export function RubricRail({
  brandName,
  brandVoice,
  adThemes,
  worldName,
}: RubricRailProps) {
  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="label-cap">Rubric</div>
        <h4 className="mt-1 text-[14px] font-semibold tracking-tight text-[var(--fg)]">
          {brandName} — {worldName} world
        </h4>
        <p className="mt-1 text-[11.5px] leading-[1.45] text-[var(--fg-muted)]">
          Rate the pairwise winner against {brandName}&apos;s brand voice. Anchor
          on the bullets below; defer to the verbatim brand voice when in doubt.
        </p>
      </section>

      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="label-cap">Brand voice anchors</div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {brandVoice.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2 text-[12.5px] text-[var(--fg)]"
            >
              <span
                className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full"
                style={{ backgroundColor: "#7857FF" }}
              />
              <span className="leading-snug">{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {adThemes && adThemes.length > 0 ? (
        <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="label-cap">Ad themes (current quarter)</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {adThemes.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-0.5 text-[11px] text-[var(--fg-muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="label-cap">Reviewer guardrails</div>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] leading-snug text-[var(--fg-muted)]">
          <li>Pairwise winner reflects which variant a real shopper acts on.</li>
          <li>Brand-fit overrides creative cleverness when they conflict.</li>
          <li>
            Mark <span className="font-semibold">Needs Edits</span> when the
            hook is salvageable; <span className="font-semibold">Discarded</span>{" "}
            when off-brand or unsafe.
          </li>
          <li>Improvement notes train the next iteration of the writer model.</li>
        </ul>
      </section>
    </aside>
  );
}
