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
  const [streamingSummary, setStreamingSummary] = useState("");
  const [streamingFit, setStreamingFit] = useState("");

  async function handleAnalyze() {
    if (!creator.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setPhase("Connecting...");
    setStreamingSummary("");
    setStreamingFit("");

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
      if (!resp.ok || !resp.body) {
        throw new Error(`Analysis failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: AnalysisResult | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const ev = JSON.parse(trimmed);
            if (ev.type === "progress") {
              setPhase(ev.phase);
            } else if (ev.type === "token") {
              if (ev.section === "summary") {
                setStreamingSummary((s) => s + ev.chunk);
              } else if (ev.section === "brand_fit") {
                setStreamingFit((s) => s + ev.chunk);
              }
            } else if (ev.type === "result") {
              finalResult = ev.data as AnalysisResult;
            } else if (ev.type === "error") {
              streamError = ev.message;
            }
          } catch {
            // ignore malformed line
          }
        }
      }

      if (streamError) throw new Error(streamError);
      if (!finalResult) throw new Error("No result received");
      setResult(finalResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
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
              className="mt-8 space-y-4"
            >
              <AnalysisProgress phase={phase} creator={creator} />

              {(streamingSummary || streamingFit) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {streamingSummary && (
                    <div className="glass-card p-5">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        Creator Summary (live)
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {streamingSummary}
                        <span className="inline-block w-2 h-4 bg-[var(--accent)] align-middle ml-0.5 animate-pulse" />
                      </p>
                    </div>
                  )}
                  {streamingFit && (
                    <div className="glass-card p-5">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        Brand Fit (live)
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {streamingFit}
                        <span className="inline-block w-2 h-4 bg-emerald-400 align-middle ml-0.5 animate-pulse" />
                      </p>
                    </div>
                  )}
                </div>
              )}
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
