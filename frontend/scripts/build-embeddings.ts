// Build embeddings for all brands, creators, and cited posts using Gemini free
// gemini-embedding-001 (768 dim). Output: src/lib/data/embeddings.json.
// One-shot at build/seed time. No runtime cost. No paid API.
//
// Usage:
//   GEMINI_API_KEY=... pnpm exec tsx scripts/build-embeddings.mts
//
// Free tier: 30 req/min on the embedding model. We batch with batchEmbedContents
// (up to 100 docs per request), so the full index fits in 1-3 calls.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BRANDS } from "../src/lib/data/brands";
import { CREATORS } from "../src/lib/data/creators";

const MODEL = "gemini-embedding-001";
const DIM = 768;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`;
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY required.");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "src", "lib", "data", "embeddings.json");

type EmbeddingMap = Record<string, number[]>;
type Doc = { id: string; text: string };

function brandDoc(b: typeof BRANDS[number]): Doc {
  const text = [
    `${b.name} (${b.category}).`,
    `Audience: ${b.audience}.`,
    b.brief ? `Brief: ${b.brief}` : "",
    `Brand voice: ${b.brand_voice.join(", ")}.`,
    `Ad themes: ${b.ad_themes.join(", ")}.`,
    `Target personas: ${b.target_personas.join(", ")}.`,
    `Target geo: ${b.target_geo.join(", ")}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return { id: b.id, text };
}

function creatorDoc(c: typeof CREATORS[number]): Doc {
  const cited = (c.cited_posts ?? [])
    .map((p) => `"${p.caption}" ${p.hashtags.join(" ")}`)
    .join(" | ");
  const text = [
    `${c.name} ${c.handle}.`,
    `Niche: ${c.niche}.`,
    `Tags: ${c.niche_tags.join(", ")}.`,
    c.bio ? `Bio: ${c.bio}.` : "",
    c.school ? `School: ${c.school}.` : "",
    c.region ? `Region: ${c.region}.` : "",
    cited ? `Recent posts: ${cited}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { id: c.id, text };
}

function postDocs(c: typeof CREATORS[number]): Doc[] {
  return (c.cited_posts ?? []).map((p) => ({
    id: p.url,
    text: `${c.handle} on ${c.niche}: "${p.caption}" ${p.hashtags.join(" ")}`,
  }));
}

async function embedBatch(docs: Doc[]): Promise<EmbeddingMap> {
  // Gemini batch caps at 100 requests per call. Chunk to 80 to leave headroom.
  const out: EmbeddingMap = {};
  for (let i = 0; i < docs.length; i += 80) {
    const chunk = docs.slice(i, i + 80);
    const body = {
      requests: chunk.map((d) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text: d.text }] },
        output_dimensionality: DIM,
      })),
    };
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY! },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`embed HTTP ${resp.status}: ${txt.slice(0, 400)}`);
    }
    const data = (await resp.json()) as { embeddings?: { values?: number[] }[] };
    const embs = data.embeddings ?? [];
    if (embs.length !== chunk.length) {
      throw new Error(`embed length mismatch: got ${embs.length}, expected ${chunk.length}`);
    }
    chunk.forEach((d, idx) => {
      const v = embs[idx]?.values ?? [];
      if (v.length !== DIM) {
        throw new Error(`embed dim mismatch for ${d.id}: ${v.length}`);
      }
      out[d.id] = v;
    });
    if (i + 80 < docs.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return out;
}

function l2norm(v: number[]) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

async function main() {
  console.log(`[embed] preparing docs (${BRANDS.length} brands, ${CREATORS.length} creators)`);
  const brandDocs = BRANDS.map(brandDoc);
  const creatorDocs = CREATORS.map(creatorDoc);
  const allPostDocs = CREATORS.flatMap(postDocs);
  console.log(`[embed] post docs: ${allPostDocs.length}`);

  console.log("[embed] embedding brands ...");
  const brands = await embedBatch(brandDocs);
  console.log(`[embed] brands done: ${Object.keys(brands).length}`);

  console.log("[embed] embedding creators ...");
  const creators = await embedBatch(creatorDocs);
  console.log(`[embed] creators done: ${Object.keys(creators).length}`);

  console.log("[embed] embedding posts ...");
  const posts = allPostDocs.length ? await embedBatch(allPostDocs) : {};
  console.log(`[embed] posts done: ${Object.keys(posts).length}`);

  const built_at = new Date().toISOString();
  const payload = {
    schema_version: 1,
    model: MODEL,
    dim: DIM,
    built_at,
    brands,
    creators,
    posts,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(payload));
  const sizeKb = ((await fs.stat(OUT_PATH)).size / 1024).toFixed(0);
  console.log(`[embed] wrote ${OUT_PATH} (${sizeKb} KB)`);

  // Sanity: cosine(celsius, loganmann32) and cosine(notion, loganmann32)
  const c = brands["celsius"];
  const n = brands["notion"];
  const l = creators["loganmann32"];
  if (c && l) {
    const cosCL = c.reduce((s, x, i) => s + x * l[i], 0) / (l2norm(c) * l2norm(l));
    console.log(`[sanity] cos(celsius, loganmann32) = ${cosCL.toFixed(4)}`);
  }
  if (n && l) {
    const cosNL = n.reduce((s, x, i) => s + x * l[i], 0) / (l2norm(n) * l2norm(l));
    console.log(`[sanity] cos(notion,  loganmann32) = ${cosNL.toFixed(4)} (expect lower)`);
  }
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
