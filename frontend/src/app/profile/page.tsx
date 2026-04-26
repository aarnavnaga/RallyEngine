"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Info,
  Code2,
  Wrench,
  Heart,
  Scale,
  BarChart2,
  DollarSign,
  Briefcase,
  Atom,
  Palette,
  Mic,
  BookOpen,
  MoreHorizontal,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { LOGAN } from "@/lib/data/creators";
import { LOGAN_PROFILE } from "@/lib/data/logan-resume";
import { fmtFollowers } from "@/lib/util/score";

// ─── Tab config ──────────────────────────────────────────────────────────────
const TABS = [
  "Resume",
  "Location & Work authorization",
  "Availability",
  "Work preferences",
  "Communications",
  "Account",
] as const;
type Tab = (typeof TABS)[number];

const TAB_SLUG: Record<Tab, string> = {
  Resume: "resume",
  "Location & Work authorization": "location",
  Availability: "availability",
  "Work preferences": "work-preferences",
  Communications: "communications",
  Account: "account",
};

const SLUG_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_SLUG).map(([k, v]) => [v, k as Tab]),
);

const TAB_DESCRIPTION: Record<Tab, string> = {
  Resume: "This will be shown to companies to find you opportunities",
  "Location & Work authorization": "Where you are legally authorized to work.",
  Availability: "Set when you are typically available for work.",
  "Work preferences": "Define how and when you'd like to work",
  Communications: "Choose how and where you'd like to receive updates",
  Account: "Input your preference and delete your account.",
};

// ─── Icon map for domain interests ───────────────────────────────────────────
const DOMAIN_ICON: Record<string, React.ElementType> = {
  code: Code2,
  wrench: Wrench,
  heart: Heart,
  scale: Scale,
  chart: BarChart2,
  dollar: DollarSign,
  briefcase: Briefcase,
  atom: Atom,
  palette: Palette,
  mic: Mic,
  book: BookOpen,
  ellipsis: MoreHorizontal,
  sparkles: Sparkles,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
}) {
  return (
    <label className="block text-[12px] text-[var(--fg-muted)]">
      <span className="label-cap">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)]">
        <input defaultValue={value} className="min-w-0 flex-1 bg-transparent outline-none" />
        {suffix}
      </div>
    </label>
  );
}

function SectionHeader({
  title,
  help,
}: {
  title: string;
  help?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[15px] font-semibold tracking-tight">{title}</span>
      {help && <Info size={12} className="text-[var(--fg-muted)]" />}
    </div>
  );
}

function AddBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="mt-2 text-[12px] text-[var(--accent)] hover:underline"
    >
      + Add {label}
    </button>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  on,
  testId,
  onChange,
}: {
  on: boolean;
  testId?: string;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-test-id={testId}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
        on ? "bg-[var(--accent)]" : "bg-[var(--border-strong,#c8c8c8)]"
      }`}
    >
      <span
        className={`mt-0.5 ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Resume tab ───────────────────────────────────────────────────────────────
function ResumeTab() {
  return (
    <div className="space-y-8">
      {/* Personal */}
      <section>
        <SectionHeader title="Personal" />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full name *" value={LOGAN_PROFILE.full_name} />
          <Field
            label="Email"
            value={LOGAN_PROFILE.email}
            suffix={<CheckCircle2 size={14} className="text-[var(--success)]" />}
          />
          <Field
            label="Phone"
            value={LOGAN_PROFILE.phone}
            suffix={<CheckCircle2 size={14} className="text-[var(--success)]" />}
          />
          <Field
            label="LinkedIn URL *"
            value={LOGAN_PROFILE.linkedin}
            suffix={
              <span className="pill pill-success whitespace-nowrap text-[10px]">
                LinkedIn Linked
              </span>
            }
          />
          <Field
            label="TikTok handle"
            value="@loganmann32"
            suffix={
              <span className="pill pill-success whitespace-nowrap text-[10px]">
                {fmtFollowers(LOGAN.followers)} followers
              </span>
            }
          />
          <Field
            label="Instagram handle"
            value="@loganmann"
            suffix={
              <span className="pill pill-success whitespace-nowrap text-[10px]">
                {fmtFollowers(LOGAN.ig_followers ?? 4200)} followers
              </span>
            }
          />
        </div>
        <AddBtn label="social link" />
      </section>

      {/* Resume file */}
      <section>
        <p className="label-cap">Resume *</p>
        <div className="mt-2 flex items-center gap-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium truncate">
              {LOGAN_PROFILE.resume_filename}
            </p>
            <p className="text-[12px] text-[var(--fg-muted)]">
              Uploaded on {LOGAN_PROFILE.resume_uploaded}
            </p>
            <p className="text-[12px] text-[var(--fg-muted)]">No file chosen</p>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section>
        <SectionHeader title="Summary" />
        <textarea
          rows={4}
          defaultValue={LOGAN_PROFILE.summary}
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </section>

      {/* Education */}
      <section>
        <SectionHeader title="Education" />
        <div className="mt-3 space-y-3">
          {LOGAN_PROFILE.education.map((edu, i) => (
            <div
              key={i}
              className="relative rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <button className="absolute right-3 top-3 text-[11px] text-[var(--fg-muted)] hover:text-red-500">
                Remove
              </button>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="School" value={edu.school} />
                <Field label="Degree" value={edu.degree} />
                <Field label="Major" value={edu.major} />
                <Field label="GPA" value={String(edu.gpa)} />
                <Field label="Start year" value={String(edu.start_year)} />
                <Field label="End year" value={String(edu.end_year)} />
              </div>
            </div>
          ))}
        </div>
        <AddBtn label="education" />
      </section>

      {/* Work Experience */}
      <section>
        <SectionHeader title="Work Experience" />
        <div className="mt-3 space-y-3">
          {LOGAN_PROFILE.work_experience.map((job, i) => (
            <div
              key={i}
              className="relative rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <button className="absolute right-3 top-3 text-[11px] text-[var(--fg-muted)] hover:text-red-500">
                Remove
              </button>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Company" value={job.company} />
                <Field label="Role" value={job.role} />
                <Field label="Start year" value={String(job.start_year)} />
                <Field label="End year" value={String(job.end_year)} />
                <Field label="City" value={job.city} />
                <Field label="State / Country" value={job.country} />
              </div>
              <label className="mt-3 block text-[12px] text-[var(--fg-muted)]">
                <span className="label-cap">Description</span>
                <textarea
                  rows={4}
                  defaultValue={job.description}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
          ))}
        </div>
        <AddBtn label="experience" />
      </section>

      {/* Projects */}
      <section>
        <SectionHeader title="Projects" />
        <div className="mt-3 space-y-3">
          {LOGAN_PROFILE.projects.map((proj, i) => (
            <div
              key={i}
              className="relative rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <button className="absolute right-3 top-3 text-[11px] text-[var(--fg-muted)] hover:text-red-500">
                Remove
              </button>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Project name" value={proj.name} />
                {"start_year" in proj ? (
                  <Field label="Start year" value={String(proj.start_year)} />
                ) : (
                  <div />
                )}
                {"end_year" in proj ? (
                  <Field label="End year" value={String(proj.end_year)} />
                ) : (
                  <div />
                )}
              </div>
              <label className="mt-3 block text-[12px] text-[var(--fg-muted)]">
                <span className="label-cap">Description</span>
                <textarea
                  rows={3}
                  defaultValue={proj.description}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
          ))}
        </div>
        <AddBtn label="project" />
      </section>

      {/* Publications */}
      <section>
        <SectionHeader title="Publications" />
        <div className="mt-3 space-y-3">
          {LOGAN_PROFILE.publications.map((pub, i) => (
            <div
              key={i}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <p className="text-[14px] font-medium">{pub.title}</p>
              <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{pub.venue}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--fg-muted)]">
                <span>{pub.date}</span>
                <a
                  href={pub.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  View paper
                </a>
              </div>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                {pub.authors.join(", ")}
              </p>
            </div>
          ))}
        </div>
        <AddBtn label="publication" />
      </section>

      {/* Certifications */}
      <section>
        <SectionHeader title="Certifications" />
        <ul className="mt-2 space-y-1">
          {LOGAN_PROFILE.certifications.map((cert) => (
            <li key={cert} className="text-[13px] text-[var(--fg)]">
              • {cert}
            </li>
          ))}
        </ul>
        <AddBtn label="certification" />
      </section>

      {/* Awards */}
      <section>
        <SectionHeader title="Awards" />
        <ul className="mt-2 space-y-1">
          {LOGAN_PROFILE.awards.map((award) => (
            <li key={award} className="text-[13px] text-[var(--fg)]">
              • {award}
            </li>
          ))}
        </ul>
        <AddBtn label="award" />
      </section>

      {/* Profiles */}
      <section>
        <SectionHeader title="Profiles" />
        <div className="mt-3 space-y-3">
          <Field label="GitHub" value={LOGAN_PROFILE.profiles.github} />
          <Field label="LeetCode" value={LOGAN_PROFILE.profiles.leetcode} />
          <Field label="CodeChef" value="" />
          <Field label="Codeforces" value="" />
        </div>
        <AddBtn label="profile" />
      </section>

      {/* Links */}
      <section>
        <SectionHeader title="Links" />
        <div className="mt-3 space-y-3">
          <Field label="Portfolio" value={LOGAN_PROFILE.links.portfolio} />
          <Field label="Other links" value="" />
        </div>
        <button
          type="button"
          className="mt-2 text-[12px] text-[var(--accent)] hover:underline"
        >
          + Add more links
        </button>
      </section>

      {/* Skills */}
      <section>
        <SectionHeader title="Skills" />
        <div className="mt-3 flex flex-wrap gap-2">
          {LOGAN_PROFILE.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-[12px] text-[var(--fg)]"
            >
              {skill}
            </span>
          ))}
        </div>
        <AddBtn label="skill" />
      </section>

      {/* Languages */}
      <section>
        <SectionHeader title="Languages" />
        <div className="mt-3 flex flex-wrap gap-2">
          {LOGAN_PROFILE.languages.map((lang) => (
            <span
              key={lang}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-[12px] text-[var(--fg)]"
            >
              {lang}
            </span>
          ))}
        </div>
        <AddBtn label="language" />
      </section>

      {/* Hobbies */}
      <section>
        <SectionHeader title="Hobbies" />
        <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
          Select all that apply: Others (please specify)
        </p>
        <AddBtn label="hobby" />
      </section>
    </div>
  );
}

// ─── Location tab ─────────────────────────────────────────────────────────────
function LocationTab() {
  const loc = LOGAN_PROFILE.location;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Country" value={loc.country} />
        <Field label="State" value={loc.state} />
        <Field label="City" value={loc.city} />
        <Field label="Postal code" value={loc.postal} />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[13px]">
        <input type="checkbox" className="accent-[var(--accent)]" />
        I will be physically working from a different country
      </label>

      <section className="space-y-4">
        <SectionHeader title="Legal attestation" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Date of Birth" value={LOGAN_PROFILE.date_of_birth} />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
          <div className="text-[13px]">
            <p className="font-medium">
              I confirm that I am legally authorized to work from United States.
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] text-[var(--fg-muted)]">
              <li>I am a citizen or permanent resident of United States.</li>
              <li>I have the right to work in United States without restriction.</li>
            </ul>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
          <div className="text-[13px]">
            <p className="font-medium">
              I agree to remain working from United States, and to notify Mercor in writing
              prior to any change.
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] text-[var(--fg-muted)]">
              <li>I will notify Mercor before relocating internationally.</li>
              <li>I understand this may affect my eligibility for certain roles.</li>
            </ul>
          </div>
        </label>
      </section>
    </div>
  );
}

// ─── Availability tab ─────────────────────────────────────────────────────────
function AvailabilityTab() {
  const avail = LOGAN_PROFILE.availability;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-[12px] text-[var(--fg-muted)]">
          <span className="label-cap">Availability to start</span>
          <select
            defaultValue={avail.start}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          >
            <option>Immediately</option>
            <option>In 2 weeks</option>
            <option>In 1 month</option>
          </select>
        </label>

        <label className="block text-[12px] text-[var(--fg-muted)]">
          <span className="label-cap">Preferred time commitment (hrs/week)</span>
          <input
            type="number"
            defaultValue={avail.hours_per_week}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block text-[12px] text-[var(--fg-muted)] md:col-span-2">
          <span className="label-cap">Timezone</span>
          <select
            defaultValue={avail.timezone}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          >
            <option>{avail.timezone}</option>
          </select>
        </label>
      </div>

      {/* Working hours */}
      <section>
        <SectionHeader title="Working hours" />
        <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
          Select when you are typically available to work
        </p>
        <div className="mt-3 space-y-2">
          {avail.weekly.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white">
                {row.day}
              </div>
              <input
                type="text"
                defaultValue={row.from}
                className="w-[90px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[12px] text-[var(--fg-muted)]">-</span>
              <input
                type="text"
                defaultValue={row.to}
                className="w-[90px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
              />
              <button type="button" className="text-[var(--fg-muted)] hover:text-red-500">
                <X size={14} />
              </button>
              <button type="button" className="text-[var(--accent)] hover:opacity-70">
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Date-specific hours */}
      <section>
        <SectionHeader title="Date-specific hours" />
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">No active exceptions</p>
        <button
          type="button"
          className="mt-2 rounded-md border border-[var(--accent)] px-3 py-1.5 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          Add exceptions
        </button>
      </section>
    </div>
  );
}

// ─── Work preferences tab ─────────────────────────────────────────────────────
function WorkPrefsTab() {
  const allDomains = LOGAN_PROFILE.domain_interests_all;
  const selectedIds = new Set<string>(LOGAN_PROFILE.domain_interests_selected);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-1.5 mb-1">
          <SectionHeader title="Domain Interests" help />
        </div>
        <p className="text-[13px] text-[var(--fg-muted)] mb-3">
          What domains are you interested in?&nbsp; Select all that apply:
        </p>

        <div className="flex flex-wrap gap-2">
          {allDomains.map((domain) => {
            const selected = selectedIds.has(domain.id);
            const isNew = "new" in domain && domain.new;
            const IconComp = DOMAIN_ICON[domain.icon] ?? MoreHorizontal;
            const isCreators = domain.id === "creators-influencers";

            return (
              <button
                key={domain.id}
                type="button"
                data-test-id={`profile-domain-${domain.id}`}
                className={[
                  "relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-all",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
                  isCreators
                    ? "ring-2 ring-[var(--accent)] ring-offset-2"
                    : "",
                ].join(" ")}
              >
                <IconComp size={13} />
                <span>{domain.label}</span>
                {isNew && (
                  <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white leading-none">
                    NEW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <Field label="Others (please specify)" value="" />
        </div>
      </section>

      <section>
        <SectionHeader title="Minimum expected compensation" help />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-[12px] text-[var(--fg-muted)]">
            <span className="label-cap">Full-time ($/year)</span>
            <input
              type="number"
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--fg-muted)]">
              Minimum annual salary for full-time roles
            </span>
          </label>

          <label className="block text-[12px] text-[var(--fg-muted)]">
            <span className="label-cap">Part-time ($/hour)</span>
            <input
              type="number"
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--fg-muted)]">
              Minimum hourly rate for part-time roles
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

// ─── Communications tab ───────────────────────────────────────────────────────
function CommsTab() {
  const comms = LOGAN_PROFILE.communications;
  const [state, setState] = useState({ ...comms });

  function toggle(key: keyof typeof state) {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-1.5">
          <SectionHeader title="Communication channels" help />
        </div>
        <div className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {(
            [
              { key: "email" as const, label: "Email" },
              { key: "sms" as const, label: "Text message (SMS)" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px]">{label}</span>
              <Toggle
                on={state[key]}
                testId={`profile-toggle-${key}`}
                onChange={() => toggle(key)}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Opportunity types" />
        <div className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {(
            [
              {
                key: "fulltime" as const,
                label: "Full-time",
                sub: "Opportunities for full-time employment",
              },
              {
                key: "parttime" as const,
                label: "Part-time",
                sub: "Opportunities for part-time work",
              },
              {
                key: "referral" as const,
                label: "Referral",
                sub: "Referral bonuses and friend invites",
              },
            ] as const
          ).map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-medium">{label}</p>
                <p className="text-[11px] text-[var(--fg-muted)]">{sub}</p>
              </div>
              <Toggle
                on={state[key]}
                testId={`profile-toggle-${key}`}
                onChange={() => toggle(key)}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="General" />
        <div className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {(
            [
              {
                key: "job_opportunities" as const,
                label: "Job opportunities",
              },
              {
                key: "work_updates" as const,
                label: "Work-related updates",
              },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px]">{label}</span>
              <Toggle
                on={state[key]}
                testId={`profile-toggle-${key}`}
                onChange={() => toggle(key)}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-4 py-3">
          <span className="text-[13px] font-medium text-red-500">Unsubscribe from all</span>
          <Toggle
            on={state.unsubscribe_all}
            testId="profile-toggle-unsubscribe_all"
            onChange={() => toggle("unsubscribe_all")}
          />
        </div>
      </section>
    </div>
  );
}

// ─── Account tab ──────────────────────────────────────────────────────────────
function AccountTab() {
  const [genPfp, setGenPfp] = useState<boolean>(LOGAN_PROFILE.generative_profile_pictures);

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <section>
        <SectionHeader title="Avatar" />
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
          >
            Change avatar
          </button>
          <p className="text-[11px] text-[var(--fg-muted)]">
            JPG, PNG, or GIF. Max 2 MB. Files over 150KB will be compressed.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Generative profile pictures</p>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Allow Mercor to generate a profile picture on your behalf.
            </p>
          </div>
          <Toggle
            on={genPfp}
            testId="profile-toggle-generative_pfp"
            onChange={setGenPfp}
          />
        </div>
      </section>

      {/* Payout */}
      <section>
        <SectionHeader title="Payout preferences" />
        <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
          {LOGAN_PROFILE.payout_description}
        </p>

        <div className="mt-3 rounded-md bg-[var(--accent-soft)] px-4 py-2 text-[12px] text-[var(--accent)]">
          Only one payout option available
        </div>

        <div className="mt-3 flex items-start gap-3 rounded-md border-2 border-[var(--accent)] bg-[var(--bg-card)] p-4">
          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold">
                {LOGAN_PROFILE.payout_method}
              </p>
              <span className="pill pill-success text-[10px]">Free</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              Up to 5 business days
            </p>
          </div>
        </div>
      </section>

      {/* Change email */}
      <section>
        <SectionHeader title="Change email" />
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
          Your current email is{" "}
          <span className="font-medium text-[var(--fg)]">
            {LOGAN_PROFILE.email}
          </span>
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
        >
          Change email
        </button>
      </section>

      {/* Delete account */}
      <section>
        <SectionHeader title="Delete account" />
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-red-400 px-4 py-2 text-[13px] font-medium text-red-500 hover:bg-red-500 hover:text-white transition-colors"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}

// ─── Inner page (reads search params) ────────────────────────────────────────
function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSlug = searchParams.get("tab") ?? "";
  const activeTab: Tab = SLUG_TO_TAB[paramSlug] ?? "Resume";

  function handleTab(t: Tab) {
    const slug = TAB_SLUG[t];
    router.push(`/profile?tab=${slug}`, { scroll: false });
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight">Profile</h1>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-6 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            data-test-id={`profile-tab-${TAB_SLUG[t]}`}
            className={`pb-3 text-[14px] ${
              activeTab === t
                ? "border-b-2 border-[var(--accent)] font-medium text-[var(--accent)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="text-[13px]">
          <p className="font-semibold">{activeTab}</p>
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            {TAB_DESCRIPTION[activeTab]}
          </p>
          {activeTab === "Location & Work authorization" && (
            <p className="mt-3 text-[11px] text-[var(--fg-muted)]">
              Last verified: {LOGAN_PROFILE.location.last_verified}
            </p>
          )}
          {activeTab === "Availability" && (
            <p className="mt-3 text-[11px] text-[var(--fg-muted)]">
              Last updated: {LOGAN_PROFILE.availability.last_updated}
            </p>
          )}
        </aside>

        <section>
          {activeTab === "Resume" && <ResumeTab />}
          {activeTab === "Location & Work authorization" && <LocationTab />}
          {activeTab === "Availability" && <AvailabilityTab />}
          {activeTab === "Work preferences" && <WorkPrefsTab />}
          {activeTab === "Communications" && <CommsTab />}
          {activeTab === "Account" && <AccountTab />}
        </section>
      </div>
    </div>
  );
}

// ─── Default export (wrapped in Suspense for useSearchParams) ─────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--fg-muted)]">Loading…</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
