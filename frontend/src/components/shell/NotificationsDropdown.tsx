"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { LOGAN_PROFILE } from "@/lib/data/logan-resume";

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        data-test-id="notifications-bell"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.7} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute bottom-0 left-full z-50 ml-3 w-80 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-modal)]"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--fg)]">Notifications</p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-[var(--border)] overflow-y-auto">
            {LOGAN_PROFILE.notifications.map((n) => (
              <li key={n.id} className="px-4 py-3 hover:bg-[var(--bg-hover)]">
                <p className="text-[13px] font-semibold text-[var(--fg)]">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{n.when}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
