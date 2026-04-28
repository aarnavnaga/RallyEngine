// Pre-linked deliverables for the Mercor demo.
// Keyed by contract id. On first load of /deliverables/[contractId],
// if no deliverable exists in localStorage yet AND a seed entry exists here,
// the page should call linkDeliverable() with the seed URL so the metrics
// panel is already populated for the demo.
//
// Manual hookup note: the deliverables page at
// src/app/deliverables/[contractId]/page.tsx imports this map and calls
// linkDeliverable(contractId, seed.tiktok_url) inside a useEffect that runs
// once on mount when !linked && seed exists. See step 4 in the agent brief.
//
// IMPORTANT FOR THE AARON DEMO: every active creator-campaign / creator-post
// contract MUST have a seed entry here. Without one, the deliverable page
// renders only the "Submit your deliverable" panel and the live-perf +
// earnings cards never appear, breaking the wow-moment of the pitch.

export const SEED_DELIVERABLES: Record<string, {
  tiktok_url: string;
}> = {
  // Bloom / Cooper Brunner — already-linked sample.
  job_cooperBrunnerBloom: {
    tiktok_url: "https://www.tiktok.com/@cooperbrunner/video/7342566675230887214",
  },
  // Celsius — anchored to the canonical "Average quant" post (matches the
  // RAG citation on /admin/match?brand=celsius&focus=loganmann32 and the
  // promo line in the contract brief).
  job_celsiusAmb26: {
    tiktok_url: "https://www.tiktok.com/@loganmann32/video/7608429326211501326",
  },
  // Bucked Up — anchored to "The Goal:" pinned physique post (cited in the
  // contract brief as the reason for selection).
  job_buckedUp26: {
    tiktok_url: "https://www.tiktok.com/@loganmann32/video/7603223754671508749",
  },
  // Bloom Morning Stack (Logan) — anchored to a separate Logan post so it
  // doesn't conflict with the Celsius anchor.
  job_bloomMorningStack: {
    tiktok_url: "https://www.tiktok.com/@loganmann32/video/7619197602285849870",
  },
};
