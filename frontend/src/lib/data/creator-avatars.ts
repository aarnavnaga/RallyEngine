// Auto-generated. Real profile photos for all creators.
// Falls back to colored letter avatar in Avatar.tsx if URL fails to load.
// Photos saved to public/avatars/<id>.jpg and served as static assets.
//
// Sources:
//   - 34 creators: TikTok CDN avatarLarger scraped via curl (browser UA)
//   - emilyskyefit: Instagram profile photo via notcommon.com
//   - stefanaavara: Linktree OG image (https://linktr.ee/og/image/stefana.avara.jpg)
//   - maeganmiller_: feedspot.com thumbnail
//   - makaylafoodfit: Linktree OG image (https://linktr.ee/og/image/makaylathomas.jpg)
//   - ulissesworld: TikTok CDN re-scraped with browser UA
//   - aaron-langerman: Dogdays Magazine feature photo
//   - jenny_kndd: not found (no public web presence outside TikTok SPA)
//
// Re-run the scrape script to refresh expired CDN tokens or missing handles.

import { CREATORS } from "./creators";

export const CREATOR_AVATAR_URLS: Record<string, string | null> = {
  loganmann32: "/avatars/loganmann32.jpg",
  noahperlofit: "/avatars/noahperlofit.jpg",
  trainingtall: "/avatars/trainingtall.jpg",
  blogilates: "/avatars/blogilates.jpg",
  "senada.greca": "/avatars/senada.greca.jpg",
  kayla_itsines: "/avatars/kayla_itsines.jpg",
  davidlaid: "/avatars/davidlaid.jpg",
  jessejameswest: "/avatars/jessejameswest.jpg",
  antonielokhorst: "/avatars/antonielokhorst.jpg",
  cooperbrunner: "/avatars/cooperbrunner.jpg",
  ulissesworld: "/avatars/ulissesworld.jpg",
  naturally_enhanced: "/avatars/naturally_enhanced.jpg",
  stevecook_32: "/avatars/stevecook_32.jpg",
  samsulek: "/avatars/samsulek.jpg",
  joelbergs: "/avatars/joelbergs.jpg",
  sarati: "/avatars/sarati.jpg",
  tiboinshape: "/avatars/tiboinshape.jpg",
  minneninja: "/avatars/minneninja.jpg",
  cathymadeoyoga: "/avatars/cathymadeoyoga.jpg",
  kjweatherspoon: "/avatars/kjweatherspoon.jpg",
  courtneylynea: "/avatars/courtneylynea.jpg",
  emilyskyefit: "/avatars/emilyskyefit.jpg",
  mason_mahoney: "/avatars/mason_mahoney.jpg",
  stefanaavara: "/avatars/stefanaavara.jpg",
  buffunicorn: "/avatars/buffunicorn.jpg",
  livcarbonero: "/avatars/livcarbonero.jpg",
  // jenny_kndd: null -- TikTok SPA only; no public CDN avatar retrievable; falls back to letter avatar
  jenny_kndd: null,
  adrianleung: "/avatars/adrianleung.jpg",
  michael_alisa: "/avatars/michael_alisa.jpg",
  "layla.warsame": "/avatars/layla.warsame.jpg",
  alexiaclark: "/avatars/alexiaclark.jpg",
  charleeatkins: "/avatars/charleeatkins.jpg",
  brentonsimmons: "/avatars/brentonsimmons.jpg",
  maeganmiller_: "/avatars/maeganmiller_.jpg",
  jenselter: "/avatars/jenselter.jpg",
  clairehodgins: "/avatars/clairehodgins.jpg",
  makaylafoodfit: "/avatars/makaylafoodfit.jpg",
};

export function getCreatorAvatarUrl(creatorId: string): string | null {
  return CREATOR_AVATAR_URLS[creatorId] ?? null;
}

// Name-to-id map for auto-resolving from name prop alone
export const CREATOR_NAME_TO_ID: Record<string, string> = Object.fromEntries(
  CREATORS.map((c) => [c.name, c.id]),
);

export function getAvatarUrlByName(name: string): string | null {
  const id = CREATOR_NAME_TO_ID[name];
  return id ? (CREATOR_AVATAR_URLS[id] ?? null) : null;
}

export function getAvatarUrlById(id: string): string | null {
  return CREATOR_AVATAR_URLS[id] ?? null;
}

// All creator IDs that have a real avatar (not null). Used for "hired this month"
// avatar stacks on campaign cards.
const CREATORS_WITH_AVATARS: string[] = Object.entries(CREATOR_AVATAR_URLS)
  .filter(([, url]) => url !== null)
  .map(([id]) => id);

// Simple deterministic hash so each brand_id always picks the same hires.
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Stable list of 3 creator avatar URLs for a campaign's "hired this month"
 * avatar stack. Deterministic by brand_id so re-renders never reshuffle.
 */
export function getHiresForCampaign(brandId: string, count = 3): string[] {
  const pool = CREATORS_WITH_AVATARS;
  const start = hashSeed(brandId) % pool.length;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = pool[(start + i * 7) % pool.length];
    const url = CREATOR_AVATAR_URLS[id];
    if (url) out.push(url);
  }
  return out;
}
