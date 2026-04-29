"use client";

import { Suspense, use, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { LOGAN } from "@/lib/data/creators";
import { VideoInterviewStep } from "@/components/apply/VideoInterviewStep";

/**
 * Standalone interview page that mirrors work.mercor.com/interview/<id>.
 * Renders the VideoInterviewStep in mercorStyle so the pre-flight matches
 * Mercor's two-column layout (live camera + device pickers + info column
 * with tooltipped underlines + big Start CTA). On completion, bounces to
 * the returnPath query parameter (defaulting to /home?tab=assessments).
 */
export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <InterviewPageInner id={id} />
    </Suspense>
  );
}

function InterviewPageInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [done, setDone] = useState<boolean>(false);
  const campaign = CAMPAIGNS_BY_ID[id];
  const returnPath = searchParams.get("returnPath") ?? "/home?tab=assessments";

  const onComplete = useCallback(() => {
    setDone(true);
  }, []);

  const onFallbackToText = useCallback(() => {
    // The standalone interview page doesn't host the typed fallback (that
    // lives inside the apply stepper). If the user can't run the AI
    // interview, hand them back to the apply flow where the typed version
    // lives.
    router.push(`/jobs/apply/${id}`);
  }, [id, router]);

  if (!campaign) {
    return (
      <main className="mx-auto max-w-[600px] px-6 pt-12">
        <h1 className="text-[20px] font-semibold tracking-tight">Interview not found</h1>
        <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
          We couldn&apos;t find the campaign for this interview.
        </p>
        <a href="/home?tab=assessments" className="mt-4 inline-block text-[var(--accent)] underline">
          Back to assessments
        </a>
      </main>
    );
  }

  return (
    <main>
      <VideoInterviewStep
        creatorId={LOGAN.id}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        done={done}
        onComplete={onComplete}
        onFallbackToText={onFallbackToText}
        mercorStyle
      />
      {done ? (
        <div className="mx-auto mt-6 flex max-w-[1100px] items-center justify-between rounded-md border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-[13px] text-[var(--success)]">
          <span>
            Interview submitted. Mercor has the transcript and the confidence/engagement
            scores.
          </span>
          <button
            type="button"
            onClick={() => router.push(returnPath)}
            className="rounded-md border border-[var(--success)] px-3 py-1 text-[12px] hover:bg-white/40"
          >
            Back to dashboard
          </button>
        </div>
      ) : null}
    </main>
  );
}
