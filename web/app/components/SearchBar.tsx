"use client";

import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const PLATFORM_CONFIG = [
  { name: "TikTok", color: "from-pink-500 to-red-500", icon: "T" },
  { name: "Instagram", color: "from-purple-500 to-orange-400", icon: "I" },
];

type Props = {
  creator: string;
  setCreator: (v: string) => void;
  brandContext: string;
  setBrandContext: (v: string) => void;
  platforms: string[];
  togglePlatform: (p: string) => void;
  loading: boolean;
  onAnalyze: () => void;
};

export function SearchBar({
  creator, setCreator, brandContext, setBrandContext,
  platforms, togglePlatform, loading, onAnalyze,
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !loading) onAnalyze();
  }

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Creator input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter creator handle (e.g. @charlidamelio)"
          className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-base"
          disabled={loading}
        />
      </div>

      {/* Platform toggles + brand context */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {PLATFORM_CONFIG.map(({ name, color, icon }) => {
            const active = platforms.includes(name);
            return (
              <motion.button
                key={name}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePlatform(name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-hover)]"
                    : "border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                }`}
              >
                <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${color} flex items-center justify-center text-[10px] font-bold text-white ${active ? "opacity-100" : "opacity-40"}`}>
                  {icon}
                </span>
                {name}
              </motion.button>
            );
          })}
        </div>

        <input
          type="text"
          value={brandContext}
          onChange={(e) => setBrandContext(e.target.value)}
          placeholder="Brand context (optional): e.g. Skincare, Gen Z"
          className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Analyze button */}
      <motion.button
        whileHover={{ scale: loading ? 1 : 1.01 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        onClick={onAnalyze}
        disabled={loading || !creator.trim()}
        className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
          loading || !creator.trim()
            ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            Analyzing...
          </span>
        ) : (
          "Analyze Creator"
        )}
      </motion.button>
    </div>
  );
}
