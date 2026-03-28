"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <header className="relative overflow-hidden pt-16 pb-24 px-6 text-center">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-10 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 10, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
        animate={{ x: [0, -25, 15, 0], y: [0, 15, -25, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Logo mark */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide uppercase">
            Creator Intelligence Platform
          </span>
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl font-bold tracking-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Rally
          </span>
          <span className="text-white">Engine</span>
        </motion.h1>

        <motion.p
          className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Evaluate any UGC creator in seconds. AI-powered analysis of content,
          engagement, and brand fit from TikTok, Instagram, and across the web.
        </motion.p>
      </motion.div>
    </header>
  );
}
