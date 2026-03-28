"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const ICONS = {
  user: UserIcon,
  target: CheckBadgeIcon,
  alert: ExclamationTriangleIcon,
};

const ACCENT_COLORS = {
  indigo: {
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    icon: "text-indigo-400",
  },
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    icon: "text-emerald-400",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    icon: "text-amber-400",
  },
};

type Props = {
  title: string;
  icon: keyof typeof ICONS;
  content: string;
  delay?: number;
  accentColor?: keyof typeof ACCENT_COLORS;
};

export function ReportCard({
  title,
  icon,
  content,
  delay = 0,
  accentColor = "indigo",
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const IconComponent = ICONS[icon];
  const colors = ACCENT_COLORS[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`glass-card overflow-hidden transition-all hover:border-[var(--border-focus)]/30`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <IconComponent className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <h3 className="font-semibold text-base text-[var(--text-primary)]">{title}</h3>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]" />
        </motion.div>
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 pt-0">
          <div className={`w-full h-px ${colors.bg} mb-4`} />
          <div className="report-content text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
