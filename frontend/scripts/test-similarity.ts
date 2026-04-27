// Smoke test the cosine + similarity logic against real data.
// Verifies Logan x Celsius beats Logan x Notion and prints the top-cited post.

import { BRANDS } from "../src/lib/data/brands";
import { CREATORS, LOGAN } from "../src/lib/data/creators";
import {
  similarity,
  embeddingSimilarity,
  bestCitedPost,
  computeImpact,
  buildCitations,
} from "../src/lib/util/score";

const celsius = BRANDS.find((b) => b.id === "celsius")!;
const notion = BRANDS.find((b) => b.id === "notion")!;
const liquidDeath = BRANDS.find((b) => b.id === "liquid-death");

console.log("=== Logan Mann (loganmann32) ===");
console.log(`raw cos(logan, celsius)     = ${embeddingSimilarity(LOGAN.id, celsius.id)?.toFixed(4)}`);
console.log(`raw cos(logan, notion)      = ${embeddingSimilarity(LOGAN.id, notion.id)?.toFixed(4)}`);
if (liquidDeath) {
  console.log(`raw cos(logan, liquidDeath) = ${embeddingSimilarity(LOGAN.id, liquidDeath.id)?.toFixed(4)}`);
}
console.log("");
console.log(`similarity(logan, celsius)     = ${similarity(LOGAN, celsius).toFixed(4)}`);
console.log(`similarity(logan, notion)      = ${similarity(LOGAN, notion).toFixed(4)}`);
if (liquidDeath) {
  console.log(`similarity(logan, liquidDeath) = ${similarity(LOGAN, liquidDeath).toFixed(4)}`);
}
console.log("");
console.log(`impact(logan, celsius).rounded = ${computeImpact(LOGAN, celsius).rounded}`);
console.log("");
console.log(`bestCitedPost(logan, celsius):`);
const top = bestCitedPost(LOGAN, celsius);
console.log(`  url = ${top?.url}`);
console.log(`  caption = "${top?.caption}"`);
console.log(`  cosine = ${top?.cosine.toFixed(4)}`);
console.log("");
console.log(`buildCitations(logan, celsius):`);
const cits = buildCitations(LOGAN, celsius);
cits.forEach((c, i) => {
  console.log(`  [${i}] ${c.cited_post_url}`);
  console.log(`      "${c.caption}"`);
  console.log(`      ${c.reason}`);
});
console.log("");

// Cross-check: top 3 brand matches for Logan
console.log("=== top 5 brand matches for Logan ===");
const ranked = BRANDS
  .map((b) => ({ b, sim: similarity(LOGAN, b) }))
  .sort((a, b) => b.sim - a.sim)
  .slice(0, 5);
ranked.forEach((r) => {
  console.log(`  ${r.sim.toFixed(3)}  ${r.b.id.padEnd(20)}  ${r.b.category}`);
});
console.log("");

// Cross-check: top 5 creator matches for Celsius
console.log("=== top 5 creators for Celsius ===");
const cranked = CREATORS
  .map((c) => ({ c, sim: similarity(c, celsius) }))
  .sort((a, b) => b.sim - a.sim)
  .slice(0, 5);
cranked.forEach((r) => {
  console.log(`  ${r.sim.toFixed(3)}  ${r.c.id.padEnd(25)}  ${r.c.niche.slice(0, 40)}`);
});
