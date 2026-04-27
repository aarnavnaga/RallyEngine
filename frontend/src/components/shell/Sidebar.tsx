"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Home,
  UserPlus,
  CircleDollarSign,
  User as UserIcon,
  LayoutDashboard,
  TableProperties,
  Inbox,
  TrendingUp,
  Send,
} from "lucide-react";
import { NotificationsDropdown } from "@/components/shell/NotificationsDropdown";
import { CookieConsentButton } from "@/components/shell/CookieConsent";
import { useUser } from "@/lib/state/user";
import clsx from "clsx";

type Item = { href: string; label: string; icon: React.ElementType; testId?: string };

const CREATOR_ITEMS: Item[] = [
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/home", label: "Home", icon: Home },
  { href: "/referrals", label: "Referrals", icon: UserPlus },
  { href: "/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/deliverables", label: "Deliverables", icon: Send, testId: "nav-deliverables" },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/creators", label: "Creators & Match", icon: TableProperties },
  { href: "/admin/outreach", label: "Outreach", icon: Inbox },
  { href: "/admin/campaigns", label: "Campaigns", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const { identity, switchPersona } = useUser();
  const items = identity?.persona === "admin" ? ADMIN_ITEMS : CREATOR_ITEMS;

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 flex w-[88px] flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--bg)] py-4">
      {/* Top: Mercor-style M wordmark */}
      <div className="flex w-full flex-col items-center gap-3">
        <Link
          href={identity?.persona === "admin" ? "/admin" : "/explore"}
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
                  strokeWidth={active ? 1.6 : 1.5}
                  fill={active ? "currentColor" : "none"}
                  stroke={active ? "var(--bg)" : "currentColor"}
                />
                <span>{item.label}</span>
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
          onClick={switchPersona}
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
