"use client";

import { motion } from "framer-motion";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

type Props = {
  creator: string;
  numDocs: number;
  numChunks: number;
  onDownload: () => void;
};

export function StatsBar({ creator, numDocs, numChunks, onDownload }: Props) {
  const stats = [
    { label: "Creator", value: `@${creator}`, color: "text-indigo-400" },
    { label: "Sources", value: `${numDocs}`, color: "text-emerald-400" },
    { label: "Data chunks", value: `${numChunks}`, color: "text-violet-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center justify-between gap-4 px-2"
    >
      <div className="flex items-center gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2"
          >
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {stat.label}
            </span>
            <span className={`text-sm font-semibold ${stat.color}`}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onDownload}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Export Report
      </motion.button>
    </motion.div>
  );
}
