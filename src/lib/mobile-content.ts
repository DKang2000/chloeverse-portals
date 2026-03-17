import type { ReelItem } from "@/components/collabs/reelsData";

export const HOME_PORTALS = [
  { href: "/projects", label: "PROJECTS", subtitle: "experiments in motion", mobileEnabled: true },
  { href: "/collabs", label: "COLLABS", subtitle: "worlds built together", mobileEnabled: true },
  { href: "/work", label: "WORK", subtitle: "career as an archive", mobileEnabled: true },
  { href: "/contact", label: "CONTACT", subtitle: "send a signal", mobileEnabled: true },
  { href: "/mediacard", label: "MEDIACARD", subtitle: "audience, reach, services", mobileEnabled: true },
] as const;

export const PROJECT_DEVICE_APPS = [
  "Instagram",
  "TikTok",
  "YouTube Studio",
  "CapCut",
  "Canva",
  "Notion",
  "Gmail",
  "Figma",
] as const;

export const PROJECT_REELS = [
  { id: "r1", permalink: "https://www.instagram.com/p/DR1MfgoDvzQ/", user: "edemmii", caption: "Instagram post embed placeholder caption." },
  { id: "r2", permalink: "https://www.instagram.com/p/DTMwW_Pjv-P/", user: "edemmii", caption: "Instagram post embed placeholder caption." },
  { id: "r3", permalink: "https://www.instagram.com/reel/DTZ2XtNkeNC/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r4", permalink: "https://www.instagram.com/reel/DR_GW1BkQci/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r5", permalink: "https://www.instagram.com/reel/DSitVRLkjEf/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r6", permalink: "https://www.instagram.com/reel/DOH8x_gk2Ew/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r7", permalink: "https://www.instagram.com/reel/DOQ-ZxuEzan/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r8", permalink: "https://www.instagram.com/reel/DObX6ceE-di/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r9", permalink: "https://www.instagram.com/reel/DOsvvxCkUxJ/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r10", permalink: "https://www.instagram.com/reel/DMLYWLOhTfg/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r11", permalink: "https://www.instagram.com/reel/DMxxlTEp98D/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
] as const;

export const WORK_ROLE_STACK = [
  "Creator",
  "Founder",
  "Creative strategist",
  "Growth Marketer",
] as const;

export const WORK_INTRO_COPY = "Here's what I've been up to the past few years!";

export type WorkEntry = {
  title: string;
  date: string;
  location: string;
  type?: string;
  bullets: string[];
};

export const WORK_ENTRIES: WorkEntry[] = [
  {
    title: "Stealth Startup - Founder",
    date: "Feb 2026 - Present",
    location: "Remote",
    bullets: ["More news soon."],
  },
  {
    title: "Adobe - AI Search",
    date: "Jan 2026 - Present",
    location: "Los Angeles Metropolitan Area  Remote",
    type: "Contract",
    bullets: ["Search optimization for LLM training & retrieval. Not via an organization on campus."],
  },
  {
    title: "Instagram - Creator",
    date: "Jul 2025 - Present",
    location: "Los Angeles, California, United States  Hybrid",
    type: "Self-employed",
    bullets: [
      "300K+ followers",
      "250M views",
      "Grew IG from 0 to 140k+ in 3 months",
      "Viral series accumulated 200M views & attention from major news outlets",
      "Worked with Adidas, Adobe, Estee Lauder, OpenAI, Hera, etc.",
    ],
  },
  {
    title: "Single Origin Studios - CEO",
    date: "Jun 2023 - Jan 2026",
    location: "Los Angeles, California, United States  Remote",
    type: "Self-employed",
    bullets: [
      "Marketing consulting",
      "Previous experience with YC backed startups",
      "Full in house marketing with UGC team management",
      "Scaled brands from 0 to 50k+ users in 2 months",
      "Generated 6 figures of revenue",
      "Worked with pre-seed and early stage",
    ],
  },
  {
    title: "Outsmart - Product Marketing",
    date: "Sep 2025 - Dec 2025",
    location: "Los Angeles, California, United States  Hybrid",
    type: "Contract",
    bullets: [
      "Product and growth directly under ex-CMO @ Duolingo, $38M raised, backed by DST Global, Lightspeed, Khosla Ventures, execs from OpenAI & Quora.",
    ],
  },
  {
    title: "Stealth AI Startup - Head of Growth",
    date: "Jun 2025 - Sep 2025",
    location: "San Francisco, California, United States  On-site",
    type: "Full-time",
    bullets: ["Product and growth for B2C fashion tech, backed by execs from Shopify and Pinterest."],
  },
  {
    title: "Soluna - Product Marketing Intern",
    date: "Oct 2024 - Jun 2025",
    location: "Los Angeles, California, United States  Remote",
    type: "Internship",
    bullets: ["Streamlined Solunas GTM, drove 179% increase in revenue in US market."],
  },
  {
    title: "Headspace - Digital Marketing Intern",
    date: "May 2022 - Sep 2023",
    location: "Los Angeles, California, United States  Remote",
    type: "Internship",
    bullets: ["Tripled Headspaces social media presence in one year, youngest employee to earn an extended contract."],
  },
];

export const WORK_HIGHLIGHTS = [
  "300K+ followers",
  "250M views",
  "200M views from viral series",
  "6 figures of revenue generated",
  "179% increase in revenue in the US market",
  "Tripled Headspaces social presence in one year",
] as const;

export const CONTACT_DETAILS = {
  name: "Chloe Kang",
  email: "ugcbychloekang@gmail.com",
  instagram: "https://instagram.com/imchloekang",
  tiktok: "https://www.tiktok.com/@imchloekang",
  linkedin: "https://www.linkedin.com/in/chloe-kang-234292250/",
  x: "https://x.com/imchloekang",
  candy: "https://imchloekang.com",
} as const;

export const MEDIACARD_AUDIENCE = ["United States", "Canada", "Australia", "South Korea"] as const;

export const MEDIACARD_METRICS = [
  { label: "Instagram", value: "150K" },
  { label: "TikTok", value: "160K" },
  { label: "Views", value: "12M monthly" },
  { label: "Engagement", value: "12%" },
] as const;

export const MEDIACARD_SERVICES = {
  brandPartnerships: [
    "Per Video (Posted on one platform): $1,200",
    "Cross posted across platforms: $2,000",
    "Link in bio per every 7 days: Additional $100",
    "Whitelisting (per 15 days): Additional $100",
    "Usage rights (per 30 days): Additional $200",
  ],
  diningPartnerships: [
    "Cross Posted across platforms with Instagram story coverage included",
    "Per Cross Posted Video: Hosted dining experience for desired party size",
  ],
} as const;

export const MEDIACARD_COLLABS = ["Adobe", "Adidas", "Estee Lauder", "OpenAI"] as const;

export function getProjectReelKind(permalink: string): "Reel" | "Post" {
  return permalink.includes("/reel/") ? "Reel" : "Post";
}

export function getCollabBrandLabel(item: ReelItem): string {
  return item.title;
}
