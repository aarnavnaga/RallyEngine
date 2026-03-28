"use client";

import { motion } from "framer-motion";

const STEPS = [
  { label: "Scraping profiles", icon: "🔍" },
  { label: "Searching web", icon: "🌐" },
  { label: "Mining discussions", icon: "💬" },
  { label: "Building index", icon: "📊" },
  { label: "Generating report", icon: "✨" },
];

type Props = {
  phase: string;
  creator: string;
};

export function AnalysisProgress({ phase, creator }: Props) {
  const currentIdx = STEPS.findIndex((s) =>
    phase.toLowerCase().includes(s.label.split(" ")[0].toLowerCase())
  );

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-sm">⚡</span>
        </motion.div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Analyzing @{creator}
          </p>
          <motion.p
            key={phase}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs text-[var(--text-muted)]"
          >
            {phase}
          </motion.p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <motion.div
              key={step.label}
              className="flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={`h-1.5 rounded-full mb-2 transition-all duration-500 ${
                  isDone
                    ? "bg-[var(--accent)]"
                    : isActive
                    ? "bg-gradient-to-r from-[var(--accent)] to-transparent"
                    : "bg-[var(--bg-secondary)]"
                }`}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{step.icon}</span>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isDone || isActive
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
