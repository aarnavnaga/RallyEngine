"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/state/user";
import { MercorFooter } from "@/components/shell/MercorFooter";
import { StatPill } from "@/components/landing/StatPill";
import { RoleCard } from "@/components/landing/RoleCard";
import { MeetCard } from "@/components/landing/MeetCard";

/* ------------------------------------------------------------------ */
/* Nav persona dropdown                                                  */
/* ------------------------------------------------------------------ */
function LoginDropdown({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { signInAs } = useUser();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  function chooseCreator() {
    signInAs("creator");
    onClose();
    router.push("/explore");
  }
  function chooseAdmin() {
    signInAs("admin");
    onClose();
    router.push("/admin");
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[12px] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-modal)]"
    >
      <button
        type="button"
        onClick={chooseCreator}
        data-test-id="landing-nav-login-creator"
        className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)]">
          L
        </span>
        <span>I am a creator <span className="text-[var(--fg-muted)]">(Logan)</span></span>
      </button>
      <button
        type="button"
        onClick={chooseAdmin}
        data-test-id="landing-nav-login-admin"
        className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[11px] font-bold text-[var(--fg)]">
          A
        </span>
        <span>I am on the Mercor team <span className="text-[var(--fg-muted)]">(Aaron)</span></span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero CTA dropdown - reuses the same persona switcher                  */
/* ------------------------------------------------------------------ */
function HeroCtaDropdown({ onClose }: { onClose: () => void }) {
  return <LoginDropdown onClose={onClose} />;
}

/* ------------------------------------------------------------------ */
/* Role cards data                                                       */
/* ------------------------------------------------------------------ */
const ROLES = [
  {
    slug: "accounting-audit",
    title: "Accounting & Audit Expert",
    pay: "$500-$1k",
    hired: 44,
  },
  {
    slug: "compliance-officer",
    title: "Compliance Officer",
    pay: "$90-$150/hr",
    hired: 27,
  },
  {
    slug: "equity-research",
    title: "Equity Research Expert",
    pay: "$120/hr",
    hired: 46,
  },
  {
    slug: "biologist-phd",
    title: "Biologist (PhD)",
    pay: "$105/hr",
    hired: 21,
  },
  {
    slug: "buyers-purchasing",
    title: "Buyers and Purchasing Agents",
    pay: "$500-$1k",
    hired: 37,
  },
  {
    slug: "project-management",
    title: "Project Management Specialists (4+ yrs)",
    pay: "$90-$150/hr",
    hired: 23,
  },
  {
    slug: "first-line-supervisors",
    title: "First-Line Supervisors of Office and...",
    pay: "$80-$120/hr",
    hired: 23,
  },
  {
    slug: "physics-phd",
    title: "Physics PhD Experts (String theory, QFT,...",
    pay: "$70-$90/hr",
    hired: 56,
  },
];

/* ------------------------------------------------------------------ */
/* Meet cards data                                                       */
/* ------------------------------------------------------------------ */
interface MeetCardData {
  slug: string;
  name: string;
  headline: string;
  avatarSrc?: string;
}

const MEET_CARDS: MeetCardData[] = [
  {
    slug: "jay",
    name: "Jay",
    headline: "Meet Jay: International business consultant",
  },
  {
    slug: "mick",
    name: "Mick",
    headline: "Meet Mick: Computer information systems expert",
  },
  {
    slug: "michael",
    name: "Michael",
    headline: "Meet Michael: Corporate attorney",
  },
  {
    slug: "logan",
    name: "Logan",
    headline: "Meet Logan: TikTok creator + STEM researcher",
    avatarSrc: "/avatars/loganmann32.jpg",
  },
];

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */
function LandingContent() {
  const router = useRouter();
  const { identity, hydrated, signInAs } = useUser();
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroCtaOpen, setHeroCtaOpen] = useState(false);

  // If already signed in, redirect to the persona's home — but only after
  // UserProvider has had a chance to read localStorage. The AppShell-side
  // hydration gate already prevents `/home` etc. from bouncing through
  // here, but in case someone deep-links to `/`, wait for hydrated so we
  // don't briefly flash the landing page before redirecting.
  useEffect(() => {
    if (!hydrated) return;
    if (identity?.persona === "creator") router.replace("/explore");
    else if (identity?.persona === "admin") router.replace("/admin");
  }, [hydrated, identity, router]);

  return (
    <div className="min-h-screen bg-white text-[var(--fg)]">

      {/* ============================================================ */}
      {/* 1. Sticky top nav                                              */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* Left: Mercor logo */}
          <a href="/" aria-label="Mercor home" data-test-id="landing-nav-logo">
            <Image
              src="/mercor-logo.png"
              alt="Mercor"
              width={28}
              height={28}
              className="block"
              priority
            />
          </a>

          {/* Center: nav links */}
          <nav className="hidden items-center gap-7 md:flex">
            {(["APEX", "Research", "Enterprise", "Experts"] as const).map((label) => (
              <a
                key={label}
                href="#"
                data-test-id={`landing-nav-${label.toLowerCase()}`}
                className="text-[13px] font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right: Log in button + dropdown */}
          <div className="relative">
            <button
              type="button"
              data-test-id="landing-nav-login"
              onClick={() => setLoginOpen((v) => !v)}
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[13px] font-medium text-[var(--fg)] hover:bg-[var(--bg-hover)]"
            >
              Log in
            </button>
            {loginOpen && <LoginDropdown onClose={() => setLoginOpen(false)} />}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. Hero section                                                */}
      {/* ============================================================ */}
      <section className="mt-10 px-6 text-center sm:mt-24">
        <div className="mx-auto max-w-3xl">

          {/* Stat pills bar — vertical on mobile, horizontal pill bar on desktop */}
          <div className="mx-auto flex flex-col divide-y divide-[var(--border)] rounded-2xl bg-[var(--bg-elev)] shadow-[var(--shadow-card)] sm:inline-flex sm:flex-row sm:items-center sm:divide-x sm:divide-y-0 sm:rounded-full">
            <StatPill label="Average pay" value="$101/hr" />
            <StatPill label="Roles created" value="185.9k" />
            <StatPill label="Daily payouts" value="$2.0M+" />
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-[44px] font-medium leading-[1.05] tracking-tight text-[var(--fg)] sm:mt-8 sm:text-6xl sm:leading-tight">
            Shape the future of AI
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-3 max-w-xl text-base text-[var(--fg-muted)] sm:mt-4 sm:text-lg">
            Find top-tier, remote, AI roles for your expertise. Available only on Mercor.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="relative">
              <button
                type="button"
                data-test-id="landing-cta-start-working"
                onClick={() => setHeroCtaOpen((v) => !v)}
                className="btn-primary text-[15px]"
              >
                Start working
              </button>
              {heroCtaOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2">
                  <HeroCtaDropdown onClose={() => setHeroCtaOpen(false)} />
                </div>
              )}
            </div>
            <a
              href="/home"
              data-test-id="landing-cta-learn-more"
              className="btn-outline text-[15px]"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. Latest roles section                                        */}
      {/* ============================================================ */}
      <section className="mx-auto mt-24 max-w-7xl px-6">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <span className="text-[18px] font-medium text-[var(--fg)]">Latest roles</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous roles"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--fg-faint)] cursor-not-allowed"
              disabled
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Next roles"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 8 standard role cards - 4 columns */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <RoleCard
              key={role.slug}
              title={role.title}
              pay={role.pay}
              hired={role.hired}
              href="/explore"
              data-test-id={`landing-role-card-${role.slug}`}
            />
          ))}
        </div>

        {/* 9th card: Creators & Influencers - highlighted, full width bottom row with ring */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RoleCard
            title="Creators & Influencers"
            pay="$700-$1.5k/post"
            hired={18}
            href="/explore?domain=creators-influencers"
            isNew
            highlighted
            data-test-id="landing-role-card-creators-influencers"
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. APEX promo block                                            */}
      {/* ============================================================ */}
      <section className="mx-auto mt-32 max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Gradient APEX card */}
            <div className="flex items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--accent)] to-[#a78bfa] py-32">
              <span className="text-7xl font-medium tracking-tight text-white">APEX</span>
            </div>
            {/* Label below */}
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-[var(--fg)]">
                The AI Productivity Index
              </h2>
              <p className="mt-1 text-[13px] text-[var(--fg-muted)]">Release - 5 min read</p>
            </div>
          </div>

          {/* Right column - Meet cards stack */}
          <div className="flex flex-col gap-3">
            {MEET_CARDS.map((card) => (
              <MeetCard
                key={card.slug}
                name={card.name}
                headline={card.headline}
                avatarSrc={card.avatarSrc}
                data-test-id={`landing-meet-${card.slug}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. Footer                                                       */}
      {/* ============================================================ */}
      <div className="mt-24">
        <MercorFooter />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
