"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CAMPAIGNS_BY_ID, listCampaigns } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { BrandMark } from "@/components/shell/BrandMark";
import { fmtCurrency } from "@/lib/util/score";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function ApplySubmittedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const c = CAMPAIGNS_BY_ID[id];
  const router = useRouter();
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    function update() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const similar = listCampaigns()
    .filter((x) => x.id !== id)
    .slice(0, 3);

  return (
    <main className="relative mx-auto max-w-[1100px] px-8 pt-24 pb-24">
      {size.w > 0 ? (
        <Confetti
          width={size.w}
          height={size.h}
          numberOfPieces={180}
          recycle={false}
          colors={["#7857ff", "#c4b5fd", "#fcd34d", "#fb7185", "#a78bfa"]}
        />
      ) : null}

      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          <span className="text-[26px]">✦</span>
        </div>
        <h1 className="mt-6 text-[28px] font-semibold tracking-tight">
          Your application has been submitted!
        </h1>
        <p className="mx-auto mt-3 max-w-[460px] text-[14px] text-[var(--fg-muted)]">
          You&apos;ll hear back within 4 weeks. We&apos;ll notify you if your application is
          selected to move forward.
        </p>

        {c ? (
          <Link
            href={`/explore?listingId=${c.id}`}
            className="mt-4 inline-block rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
            data-test-id="view-application"
          >
            View Application
          </Link>
        ) : null}
      </div>

      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold tracking-tight">Similar Opportunities</h2>
          <div className="flex gap-1">
            <button className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] hover:bg-[var(--bg-hover)]">
              <ChevronLeft size={14} />
            </button>
            <button className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] hover:bg-[var(--bg-hover)]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {similar.map((s) => (
            <Link
              key={s.id}
              href={`/explore?listingId=${s.id}`}
              className="card card-hover p-5"
            >
              <div className="flex items-center gap-2">
                <BrandMark brand={BRANDS_BY_ID[s.brand_id]} size={20} />
                <span className="text-[12px] text-[var(--fg-muted)]">{s.brand.name}</span>
              </div>
              <div className="mt-2 text-[14px] font-semibold leading-snug">{s.title}</div>
              <div className="mt-1 text-[13px] text-[var(--fg-muted)]">
                {fmtCurrency(s.rate_low)} - {fmtCurrency(s.rate_high)} / {s.rate_unit}
              </div>
              <span className="pill pill-accent mt-3 text-[10px]">★ Top applicant</span>
              <div className="mt-3 text-[12px] text-[var(--fg-muted)]">
                {s.hires_this_month} hired this month
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/explore")}
            className="btn-primary"
            data-test-id="back-to-explore"
          >
            Explore Additional Opportunities
          </button>
        </div>
      </section>
    </main>
  );
}
