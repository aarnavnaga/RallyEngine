"use client";

import { Twitter, Youtube, Linkedin, Instagram, MapPin } from "lucide-react";

export function MercorFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white px-6 pb-8 pt-12">
      <div className="mx-auto max-w-7xl">
        {/* 4-column link grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* For experts */}
          <div>
            <p className="label-cap mb-4">For experts</p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-find-work"
                >
                  Find work
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-help-center"
                >
                  Help center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-stories"
                >
                  Stories
                </a>
              </li>
            </ul>
          </div>

          {/* Our research */}
          <div>
            <p className="label-cap mb-4">Our research</p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-apex"
                >
                  APEX
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-apex-agents"
                >
                  APEX-Agents
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-apex-swe"
                >
                  APEX-SWE
                </a>
              </li>
            </ul>
          </div>

          {/* Contact us */}
          <div>
            <p className="label-cap mb-4">Contact us</p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-support"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-press"
                >
                  Press
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-sales"
                >
                  Sales
                </a>
              </li>
            </ul>
          </div>

          {/* Mercor */}
          <div>
            <p className="label-cap mb-4">Mercor</p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-careers"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-security"
                >
                  Security
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-blog"
                >
                  Blog
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <a
                  href="#"
                  className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  data-test-id="footer-link-creators-influencers"
                >
                  Creators &amp; Influencers
                </a>
                <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  NEW
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright + socials row */}
        <div className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-6">
          <div className="flex items-center gap-3 text-[13px] text-[var(--fg-muted)]">
            <span>© 2026 Mercor</span>
            <span className="flex items-center gap-1">
              <MapPin size={13} strokeWidth={1.7} />
              San Francisco, CA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://x.com/mercor_ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Mercor on X"
              data-test-id="footer-social-x"
              className="text-[var(--fg-muted)] hover:text-[var(--accent)]"
            >
              <Twitter size={18} strokeWidth={1.7} />
            </a>
            <a
              href="https://www.youtube.com/@mercor-ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Mercor on YouTube"
              data-test-id="footer-social-youtube"
              className="text-[var(--fg-muted)] hover:text-[var(--accent)]"
            >
              <Youtube size={18} strokeWidth={1.7} />
            </a>
            <a
              href="https://www.linkedin.com/company/mercor-ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Mercor on LinkedIn"
              data-test-id="footer-social-linkedin"
              className="text-[var(--fg-muted)] hover:text-[var(--accent)]"
            >
              <Linkedin size={18} strokeWidth={1.7} />
            </a>
            <a
              href="https://www.instagram.com/mercor.ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Mercor on Instagram"
              data-test-id="footer-social-instagram"
              className="text-[var(--fg-muted)] hover:text-[var(--accent)]"
            >
              <Instagram size={18} strokeWidth={1.7} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
