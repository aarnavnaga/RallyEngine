// Hypothetical "TikTok + IG friends" pool for Logan's referrals page,
// per Mercor's referrals table pattern. Mix of real-feeling names + handles.
// All synthetic, used only for the demo.

export type Friend = {
  id: string;
  name: string;
  handle_tiktok: string;
  handle_ig?: string;
  followers: number;
  niche: string;
  matches: number; // # of brand campaigns we'd recommend
  potential: number; // potential earnings (USD)
  reach_via: ("tiktok" | "instagram")[];
  vouched?: boolean;
};

const F = (f: Friend): Friend => f;

export const FRIENDS: Friend[] = [
  F({ id: "anjali_khullar", name: "Anjali Khullar", handle_tiktok: "@anjali.k", handle_ig: "@anjali.khullar", followers: 12_400, niche: "UCSB lifestyle + study", matches: 1, potential: 600, reach_via: ["tiktok", "instagram"] }),
  F({ id: "ashmeet_cpfs", name: "Ashmeet Singh", handle_tiktok: "@ashmeet_cpfs", followers: 28_900, niche: "Gym + lifestyle", matches: 3, potential: 1800, reach_via: ["tiktok"], vouched: true }),
  F({ id: "mai_mostafa", name: "Mai Mostafa", handle_tiktok: "@mai.mostafa", handle_ig: "@maimostafaa", followers: 18_200, niche: "Wellness + recipes", matches: 1, potential: 600, reach_via: ["tiktok", "instagram"] }),
  F({ id: "siddhant_w", name: "Siddhant Waghjale", handle_tiktok: "@sidd_w", followers: 14_700, niche: "Gym + UCSB", matches: 2, potential: 1100, reach_via: ["tiktok"] }),
  F({ id: "samir_ahuja", name: "Samir Ahuja", handle_tiktok: "@samir_ah", followers: 9_400, niche: "Tech + STEM", matches: 1, potential: 520, reach_via: ["tiktok"] }),
  F({ id: "adarsh_k", name: "Adarsh Kumarappan", handle_tiktok: "@adarsh.k", followers: 26_300, niche: "Strength + UCSB", matches: 5, potential: 2900, reach_via: ["tiktok", "instagram"] }),
  F({ id: "aditya_mahna", name: "Aditya Mahna", handle_tiktok: "@adityamahna", followers: 7_900, niche: "Aesthetic + lifestyle", matches: 2, potential: 1100, reach_via: ["tiktok"] }),
  F({ id: "ahan_mishra", name: "Ahan Mishra", handle_tiktok: "@ahan.m", followers: 21_400, niche: "Engineering + STEM humor", matches: 4, potential: 2400, reach_via: ["tiktok"] }),
  F({ id: "ahmed_ismail", name: "Ahmed Ismail", handle_tiktok: "@ahmed.ismail", followers: 12_300, niche: "Fitness + UCSB", matches: 1, potential: 500, reach_via: ["tiktok"] }),
  F({ id: "aman_desai", name: "Aman Desai", handle_tiktok: "@aman.desai", followers: 8_900, niche: "Lifestyle + foodie", matches: 1, potential: 500, reach_via: ["tiktok"] }),
  F({ id: "bella_kim", name: "Bella Kim", handle_tiktok: "@bella.k", handle_ig: "@bellakimx", followers: 32_400, niche: "Pilates + women lifestyle", matches: 4, potential: 2800, reach_via: ["tiktok", "instagram"], vouched: true }),
  F({ id: "carlos_mendez", name: "Carlos Mendez", handle_tiktok: "@carlosm.fit", followers: 18_500, niche: "Latino fitness + USC", matches: 3, potential: 1900, reach_via: ["tiktok"] }),
  F({ id: "daniela_lopez", name: "Daniela Lopez", handle_tiktok: "@daniela.l", handle_ig: "@daniela.fit", followers: 24_900, niche: "Women's fitness + Spanish-language", matches: 4, potential: 2400, reach_via: ["tiktok", "instagram"] }),
  F({ id: "ethan_chu", name: "Ethan Chu", handle_tiktok: "@ethan.chu", followers: 11_200, niche: "Gym + comedy", matches: 2, potential: 1100, reach_via: ["tiktok"] }),
  F({ id: "felix_hernandez", name: "Felix Hernandez", handle_tiktok: "@felix.h", followers: 6_300, niche: "UCSB + outdoor", matches: 1, potential: 500, reach_via: ["tiktok"] }),
  F({ id: "grace_park", name: "Grace Park", handle_tiktok: "@grace.p.fit", handle_ig: "@graceparkfit", followers: 41_200, niche: "Pilates + women's lifestyle", matches: 5, potential: 3400, reach_via: ["tiktok", "instagram"] }),
  F({ id: "hayden_lin", name: "Hayden Lin", handle_tiktok: "@hayden.lin", followers: 15_400, niche: "Strength + STEM", matches: 3, potential: 1700, reach_via: ["tiktok"] }),
  F({ id: "isabel_garcia", name: "Isabel Garcia", handle_tiktok: "@isaa.g", followers: 8_700, niche: "Wellness + recipes", matches: 1, potential: 500, reach_via: ["tiktok"] }),
  F({ id: "jae_park", name: "Jae Park", handle_tiktok: "@jae.parky", followers: 19_300, niche: "Gym + dance", matches: 2, potential: 1100, reach_via: ["tiktok"] }),
  F({ id: "kara_dwyer", name: "Kara Dwyer", handle_tiktok: "@karadwyr", handle_ig: "@karadwyer", followers: 27_600, niche: "Pilates + lifestyle", matches: 3, potential: 1800, reach_via: ["tiktok", "instagram"] }),
  F({ id: "leo_zhang", name: "Leo Zhang", handle_tiktok: "@leo.zhang", followers: 12_900, niche: "Gym + comedy", matches: 2, potential: 1200, reach_via: ["tiktok"] }),
  F({ id: "maria_rivera", name: "Maria Rivera", handle_tiktok: "@maria.r", followers: 7_400, niche: "Wellness + cooking", matches: 1, potential: 500, reach_via: ["tiktok"] }),
  F({ id: "nathan_wong", name: "Nathan Wong", handle_tiktok: "@nathan.w", followers: 22_100, niche: "Strength + physique", matches: 4, potential: 2400, reach_via: ["tiktok"] }),
  F({ id: "olivia_ramirez", name: "Olivia Ramirez", handle_tiktok: "@olivia.r", handle_ig: "@oliviar.fit", followers: 14_800, niche: "Women's fitness + lifestyle", matches: 2, potential: 1300, reach_via: ["tiktok", "instagram"] }),
  F({ id: "priya_iyer", name: "Priya Iyer", handle_tiktok: "@priya.iy", followers: 9_300, niche: "Yoga + South Asian wellness", matches: 1, potential: 500, reach_via: ["tiktok"] }),
];

export const FRIENDS_TOTAL_POOL = 412; // displayed total; only 25 deeply scraped + matched
