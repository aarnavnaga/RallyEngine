"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useToast } from "@/components/shell/ToastContainer";

const STORAGE_KEY = "mercor.cookies.v1";

type CookiePreference = "accepted" | "rejected" | "customized";

interface StoredPreference {
  choice: CookiePreference;
  ts: number;
}

function persist(choice: CookiePreference): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPreference = { choice, ts: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode, quota); fail silently.
  }
}

function isCookiePreference(value: unknown): value is CookiePreference {
  return value === "accepted" || value === "rejected" || value === "customized";
}

export function readCookieChoice(): CookiePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    if (!("choice" in parsed)) return null;
    const choice = (parsed as { choice: unknown }).choice;
    return isCookiePreference(choice) ? choice : null;
  } catch {
    return null;
  }
}

export function CookieConsentButton() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { push } = useToast();

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (
        modalRef.current &&
        !modalRef.current.contains(t) &&
        triggerRef.current &&
        !triggerRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleAcceptAll = useCallback(() => {
    persist("accepted");
    setOpen(false);
    push({
      title: "Cookie preferences saved",
      kind: "success",
    });
  }, [push]);

  const handleRejectAll = useCallback(() => {
    persist("rejected");
    setOpen(false);
  }, []);

  const handleCustomize = useCallback(() => {
    persist("customized");
    setOpen(false);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cookie preferences"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-test-id="cookie-consent-trigger"
        className="grid h-10 w-10 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
      >
        <HelpCircle size={20} strokeWidth={1.7} />
      </button>

      {open && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="false"
          aria-label="Cookie preferences"
          data-test-id="cookie-consent-modal"
          className="fixed bottom-6 left-6 z-[60] flex max-w-[640px] items-center gap-4 px-5 py-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <p className="text-[13px] leading-relaxed text-[var(--fg)]">
            We use cookies to enhance your experience, analyze site traffic, and
            improve our services. You can change your preferences anytime.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCustomize}
              data-test-id="cookie-consent-customize"
              className="rounded-full px-4 py-2 text-[12px] font-medium transition-colors"
              style={{
                color: "var(--fg-muted)",
                background: "transparent",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--fg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--fg-muted)";
              }}
            >
              Customize
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              data-test-id="cookie-consent-reject"
              className="rounded-full px-4 py-2 text-[12px] font-medium transition-colors"
              style={{
                color: "var(--fg)",
                background: "transparent",
                border: "1px solid var(--border-strong)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              data-test-id="cookie-consent-accept"
              className="rounded-full px-4 py-2 text-[12px] font-medium text-white transition-colors"
              style={{
                background: "var(--accent)",
                border: "1px solid var(--accent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
                e.currentTarget.style.borderColor = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
            >
              Accept all
            </button>
          </div>
        </div>
      )}
    </>
  );
}
