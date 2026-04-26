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
  contract_id: string;
  tiktok_url: string;
  posted_at: string;
  initial_views: number;
  initial_likes: number;
  initial_comments: number;
  initial_saves: number;
}> = {
  job_cooperBrunnerBloom: {
    contract_id: "job_cooperBrunnerBloom",
    tiktok_url: "https://www.tiktok.com/@cooperbrunner/video/7342566675230887214",
    posted_at: "2026-04-22T14:30:00Z",
    initial_views: 1200,
    initial_likes: 10,
    initial_comments: 3,
    initial_saves: 5,
  },
};
