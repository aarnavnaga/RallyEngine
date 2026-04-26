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

export const SEED_DELIVERABLES: Record<string, {
  tiktok_url: string;
}> = {
  job_cooperBrunnerBloom: {
    tiktok_url: "https://www.tiktok.com/@cooperbrunner/video/7342566675230887214",
  },
};
