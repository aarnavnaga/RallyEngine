"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Home,
  UserPlus,
  CircleDollarSign,
  User as UserIcon,
  HelpCircle,
  LayoutDashboard,
  TableProperties,
  Inbox,
  GitMerge,
  TrendingUp,
  Send,
} from "lucide-react";
import { NotificationsDropdown } from "@/components/shell/NotificationsDropdown";
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
  { href: "/admin/creators", label: "Creators", icon: TableProperties },
  { href: "/admin/match", label: "Match", icon: GitMerge },
  { href: "/admin/outreach", label: "Outreach", icon: Inbox },
  { href: "/admin/campaigns", label: "Campaigns", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const { identity, switchPersona } = useUser();
  const items = identity?.persona === "admin" ? ADMIN_ITEMS : CREATOR_ITEMS;

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 flex w-[80px] flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--bg)] py-5">
      {/* Top: Mercor-style M wordmark */}
      <div className="flex flex-col items-center gap-4">
        <Link
          href={identity?.persona === "admin" ? "/admin" : "/explore"}
          aria-label="Mercor home"
          className="grid h-10 w-10 place-items-center rounded-md text-[var(--accent)]"
        >
          <MercorMark />
        </Link>

        <nav className="mt-2 flex w-full flex-col items-stretch gap-1 px-2">
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
                <Icon size={20} strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: help + bell + avatar */}
      <div className="flex flex-col items-center gap-2">
        <button
          className="grid h-10 w-10 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
          aria-label="Help"
        >
          <HelpCircle size={20} strokeWidth={1.7} />
        </button>
        <NotificationsDropdown />
        <button
          onClick={switchPersona}
          className="mt-1 grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--bg-hover)] text-[12px] font-semibold text-[var(--fg-muted)] ring-1 ring-[var(--border)] hover:ring-2 hover:ring-[var(--accent-soft)]"
          aria-label="Switch persona"
          title="Switch persona"
          data-test-id="sidebar-persona-switcher"
        >
          {identity?.persona === "admin" ? (
            <img src="/avatars/aaron-langerman.jpg" alt="Aaron Langerman" className="h-10 w-10 object-cover" />
          ) : identity ? (
            <img src="/avatars/loganmann32.jpg" alt="Logan Mann" className="h-10 w-10 object-cover" />
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
