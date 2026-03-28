"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeroSection } from "./components/HeroSection";
import { SearchBar } from "./components/SearchBar";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { ReportCard } from "./components/ReportCard";
import { StatsBar } from "./components/StatsBar";

type AnalysisResult = {
  summary: string;
  content_analysis: string;
  brand_fit: string;
  caveats: string;
  num_docs: number;
  num_chunks: number;
};

export default function Home() {
  const [creator, setCreator] = useState("");
  const [brandContext, setBrandContext] = useState("");
  const [platforms, setPlatforms] = useState(["TikTok", "Instagram"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");

  async function handleAnalyze() {
    if (!creator.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setPhase("Connecting to data sources...");

    const phases = [
      "Scraping public profiles...",
      "Searching web presence...",
      "Mining Reddit discussions...",
      "Building RAG index...",
      "Generating creator report...",
      "Assessing brand fit...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < phases.length) {
        setPhase(phases[i]);
        i++;
      }
    }, 3000);

    try {
      const resp = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator: creator.trim(),
          platforms,
          brand_context: brandContext.trim() || null,
          cache_hours: 0,
        }),
      });
      if (!resp.ok) throw new Error(`Analysis failed (${resp.status})`);
      const data = await resp.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setPhase("");
    }
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function handleDownload() {
    if (!result) return;
    const md = [
      `# Creator Report: ${creator}`,
      "",
      "## Summary",
      result.summary,
      "",
      "## Content Analysis",
      result.content_analysis,
      "",
      "## Brand Fit",
      result.brand_fit,
      "",
      "## Caveats",
      result.caveats,
      "",
      `*Based on ${result.num_docs} doc(s), ${result.num_chunks} chunks.*`,
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rally_report_${creator.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <HeroSection />

      <main className="max-w-4xl mx-auto px-6 -mt-8 pb-24">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <SearchBar
            creator={creator}
            setCreator={setCreator}
            brandContext={brandContext}
            setBrandContext={setBrandContext}
            platforms={platforms}
            togglePlatform={togglePlatform}
            loading={loading}
            onAnalyze={handleAnalyze}
          />
        </motion.div>

        {/* Analysis Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8"
            >
              <AnalysisProgress phase={phase} creator={creator} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 glass-card p-6 border-red-500/30"
            >
              <p className="text-red-400 font-medium">Analysis failed</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-8 space-y-6"
            >
              <StatsBar
                creator={creator}
                numDocs={result.num_docs}
                numChunks={result.num_chunks}
                onDownload={handleDownload}
              />

              <div className="grid gap-6">
                <ReportCard
                  title="Creator Summary"
                  icon="user"
                  content={result.summary}
                  delay={0}
                />
                <ReportCard
                  title="Brand Fit Assessment"
                  icon="target"
                  content={result.brand_fit}
                  delay={0.15}
                  accentColor="emerald"
                />
                <ReportCard
                  title="Caveats & Limitations"
                  icon="alert"
                  content={result.caveats}
                  delay={0.3}
                  accentColor="amber"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
