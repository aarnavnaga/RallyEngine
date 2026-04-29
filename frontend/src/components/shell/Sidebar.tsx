"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// LOCKED ICON SET — copies work.mercor.com Logan-side sidebar 1:1.
// Mapping (Logan reconfirmed 2026-04-28 — Earnings now uses a money icon to
// match the latest Mercor screenshot, not the older CreditCard variant):
//   Explore   → Search             (magnifying glass)
//   Home      → Home                (house)
//   Referrals → UserPlus            (single person + plus badge — NOT Users/group)
//   Earnings  → CircleDollarSign    (dollar sign in a circle — the live mercor.com sidebar)
//   Profile   → User                (single person silhouette)
import {
  Search,
  Home,
  UserPlus,
  CircleDollarSign,
  User as UserIcon,
  LayoutDashboard,
  Sparkles,
  Inbox,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { NotificationsDropdown } from "@/components/shell/NotificationsDropdown";
import { CookieConsentButton } from "@/components/shell/CookieConsent";
import { useUser } from "@/lib/state/user";
import clsx from "clsx";

type Item = {
  href: string;
  label: string;
  icon: React.ElementType;
  testId?: string;
  /** Render a small "BETA" (or similar) pill next to the label. */
  betaPill?: boolean;
};

// Mirrors work.mercor.com Logan-side sidebar 1:1: 5 items, no Deliverables.
// (Deliverables is still reachable via /home → Contracts row + /contracts/[id]
// CTAs — Mercor doesn't surface a UGC deliverables route, so it stays out of
// the rail to match.)
const CREATOR_ITEMS: Item[] = [
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/home", label: "Home", icon: Home },
  { href: "/referrals", label: "Referrals", icon: UserPlus },
  { href: "/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

// Experts tab cut 2026-04-29 — Match workbench already covers expert
// discovery (filter by brand, sortable Impact column, expand-row detail with
// the same RAG rationale + niche tag overlap that the standalone
// /admin/creators page shows). Logan asked to condense the two so admins
// have one entry point. The /admin/creators route stays accessible by direct
// URL (deep links from older threads still resolve) but is no longer
// surfaced in the rail.
// /admin/verification is the new mod queue surfacing the 4-step verification
// ladder for recently-attempted-onboarding creators. Sits before Match in the
// rail so admins audit identity before they wire experts to brands. BETA pill
// per Logan 2026-04-29 — copy is stubbed pending live data hookup.
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/verification",
    label: "Verification",
    icon: ShieldCheck,
    betaPill: true,
    testId: "sidebar-admin-verification",
  },
  { href: "/admin/match", label: "Match", icon: Sparkles },
  { href: "/admin/outreach", label: "Inbox", icon: Inbox },
  { href: "/admin/campaigns", label: "Campaigns", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { identity, switchPersona } = useUser();
  const items = identity?.persona === "admin" ? ADMIN_ITEMS : CREATOR_ITEMS;

  function handleSwitchPersona() {
    // Land on each persona's home: creator → /home, admin → /admin.
    // Without this, switching from /admin/campaigns to creator left the URL
    // on the admin route with creator nav showing — no nav item matched the
    // path so nothing highlighted.
    const nextPersona = identity?.persona === "admin" ? "creator" : "admin";
    switchPersona();
    router.push(nextPersona === "admin" ? "/admin" : "/home");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 flex w-[88px] flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--bg)] py-4">
      {/* Top: Mercor-style M wordmark */}
      <div className="flex w-full flex-col items-center gap-3">
        <Link
          href={identity?.persona === "admin" ? "/admin" : "/home"}
          aria-label="Mercor home"
          className="grid h-10 w-10 place-items-center rounded-md text-[var(--accent)]"
        >
          <MercorMark />
        </Link>

        <nav className="mt-1 flex w-full flex-col items-stretch gap-0.5 px-2">
          {items.map((item) => {
            // Use the most-specific match: a sidebar entry is active iff its
            // href is the longest of the entries that prefix the current
            // pathname. Without this, /admin/creators highlights both
            // Overview (/admin) AND Creators because /admin/creators
            // starts with /admin/.
            const candidates = items.filter(
              (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
            );
            const bestMatchHref = candidates.reduce(
              (best, it) => (it.href.length > best.length ? it.href : best),
              "",
            );
            const active = item.href === bestMatchHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx("nav-row", active && "active")}
                aria-current={active ? "page" : undefined}
                data-test-id={item.testId}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2 : 1.5}
                  fill="none"
                />
                <span className="inline-flex items-center gap-1">
                  {item.label}
                  {item.betaPill ? (
                    <span
                      className="rounded-sm px-1 py-px text-[8px] font-semibold uppercase tracking-wide leading-none"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-on-soft)",
                      }}
                    >
                      Beta
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: cookie-consent help + bell + avatar */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <CookieConsentButton />
        <NotificationsDropdown />
        <button
          onClick={handleSwitchPersona}
          className="mt-1 grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--bg-hover)] text-[12px] font-semibold text-[var(--fg-muted)] ring-1 ring-[var(--border)] hover:ring-2 hover:ring-[var(--accent-soft)]"
          aria-label="Switch persona"
          title="Switch persona"
          data-test-id="sidebar-persona-switcher"
        >
          {identity?.persona === "admin" ? (
            <img src="/avatars/aaron-langerman.jpg" alt="Aaron Langerman" className="h-9 w-9 object-cover" />
          ) : identity ? (
            <img src="/avatars/loganmann32.jpg" alt="Logan Mann" className="h-9 w-9 object-cover" />
          ) : (
            "?"
          )}
        </button>
      </div>
    </aside>
  );
}

function MercorMark() {
  return (
    <img
      src="/mercor-logo.png"
      alt="Mercor"
      width={28}
      height={28}
      className="h-7 w-7 object-contain"
    />
  );
}
