export interface SeedCategory {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  kind: string;
  sort_order: number;
  is_active: boolean;
}

export interface SeedService {
  id: string;
  category_slug: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  unit: string;
  price_per_unit: number;
  rate_basis: number;
  min_quantity: number;
  max_quantity: number;
  delivery_time: string;
  features: string[];
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  is_archived: boolean;
  catalog_source: string;
}

export interface SeedPaymentMethod {
  id: string;
  code: string;
  name: string;
  kind: "crypto" | "upi" | "inr";
  network: string | null;
  instructions: string | null;
  destination: string | null;
  min_amount: number;
  max_amount: number;
  is_enabled: boolean;
  sort_order: number;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    id: "11111111-1111-4000-8000-000000000001",
    slug: "instagram",
    name: "Instagram",
    tagline: "Growth, content and campaigns",
    description:
      "Content promotion, account management, analytics and campaign management for Instagram.",
    icon: "instagram",
    accent: "pink",
    kind: "platform",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000002",
    slug: "youtube",
    name: "YouTube",
    tagline: "Video and channel growth",
    description: "Video promotion, channel management, analytics and advertising campaigns.",
    icon: "youtube",
    accent: "red",
    kind: "platform",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000003",
    slug: "tiktok",
    name: "TikTok",
    tagline: "Short-form reach",
    description: "Content promotion, campaign management and analytics for TikTok.",
    icon: "music",
    accent: "cyan",
    kind: "platform",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000004",
    slug: "facebook",
    name: "Facebook",
    tagline: "Pages and paid social",
    description: "Page management, content promotion and advertising campaigns.",
    icon: "facebook",
    accent: "blue",
    kind: "platform",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000005",
    slug: "telegram",
    name: "Telegram",
    tagline: "Channels and communities",
    description: "Channel and community management plus promotional campaigns.",
    icon: "send",
    accent: "sky",
    kind: "platform",
    sort_order: 5,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000006",
    slug: "discord",
    name: "Discord",
    tagline: "Servers and communities",
    description: "Server setup, community management, moderation and promotional campaigns.",
    icon: "message-circle",
    accent: "violet",
    kind: "platform",
    sort_order: 6,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000007",
    slug: "x-twitter",
    name: "X (Twitter)",
    tagline: "Real-time presence",
    description: "Account and content management plus advertising campaigns.",
    icon: "twitter",
    accent: "slate",
    kind: "platform",
    sort_order: 7,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000008",
    slug: "linkedin",
    name: "LinkedIn",
    tagline: "B2B authority",
    description: "Company page management, content campaigns and analytics.",
    icon: "linkedin",
    accent: "blue",
    kind: "platform",
    sort_order: 8,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000009",
    slug: "pinterest",
    name: "Pinterest",
    tagline: "Visual discovery",
    description: "Account management, content promotion and analytics.",
    icon: "image",
    accent: "rose",
    kind: "platform",
    sort_order: 9,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000010",
    slug: "reddit",
    name: "Reddit",
    tagline: "Community strategy",
    description: "Community and content strategy plus advertising campaigns.",
    icon: "flame",
    accent: "orange",
    kind: "platform",
    sort_order: 10,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000011",
    slug: "social-media-management",
    name: "Social Media Management",
    tagline: "Always-on account care",
    description:
      "Account management, scheduling, content calendars, community management and reporting.",
    icon: "layout-dashboard",
    accent: "indigo",
    kind: "solution",
    sort_order: 11,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000012",
    slug: "advertising",
    name: "Advertising",
    tagline: "Paid media that performs",
    description:
      "Campaign setup, management, audience targeting, ad optimization and performance reporting.",
    icon: "target",
    accent: "amber",
    kind: "solution",
    sort_order: 12,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000013",
    slug: "content",
    name: "Content",
    tagline: "Creative that converts",
    description:
      "Post creation, short-form video editing, thumbnail design, copywriting and content strategy.",
    icon: "pen-tool",
    accent: "emerald",
    kind: "solution",
    sort_order: 13,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000014",
    slug: "analytics",
    name: "Analytics",
    tagline: "Decisions backed by data",
    description:
      "Account audits, performance reports, competitor analysis and engagement analytics.",
    icon: "bar-chart-3",
    accent: "cyan",
    kind: "solution",
    sort_order: 14,
    is_active: true,
  },
  {
    id: "11111111-1111-4000-8000-000000000015",
    slug: "branding",
    name: "Branding",
    tagline: "A profile worth following",
    description:
      "Profile setup and optimization, banner and cover design, and social media templates.",
    icon: "palette",
    accent: "purple",
    kind: "solution",
    sort_order: 15,
    is_active: true,
  },
];

export const SEED_SERVICES: SeedService[] = [
  {
    id: "22222222-2222-4000-8000-000000000001",
    category_slug: "instagram",
    slug: "instagram-content-promotion",
    name: "Instagram Content Promotion",
    short_description: "Targeted promotion for reels, posts and stories.",
    description:
      "Managed promotion of your Instagram content to relevant audiences, with creative guidance and weekly performance reporting.",
    unit: "post",
    price_per_unit: 24.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 200,
    delivery_time: "24-72 hours",
    features: ["Audience research", "Creative guidance", "Weekly reporting"],
    is_featured: true,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000002",
    category_slug: "instagram",
    slug: "instagram-account-management",
    name: "Instagram Account Management",
    short_description: "Full monthly account management.",
    description:
      "End-to-end management of your Instagram account: calendar, publishing, community replies and monthly reporting.",
    unit: "month",
    price_per_unit: 349.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 12,
    delivery_time: "Starts within 3 days",
    features: ["Content calendar", "Daily community management", "Monthly report"],
    is_featured: true,
    sort_order: 2,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000003",
    category_slug: "youtube",
    slug: "youtube-video-promotion",
    name: "YouTube Video Promotion",
    short_description: "Promote a video to the right viewers.",
    description:
      "Promotion of a single video to targeted viewers with retention-focused optimisation.",
    unit: "video",
    price_per_unit: 39.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 100,
    delivery_time: "48-96 hours",
    features: ["Keyword targeting", "Retention tracking", "Report"],
    is_featured: true,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000004",
    category_slug: "tiktok",
    slug: "tiktok-content-promotion",
    name: "TikTok Content Promotion",
    short_description: "Push your best clips further.",
    description:
      "Targeted promotion for TikTok videos with hook analysis and performance tracking.",
    unit: "video",
    price_per_unit: 29.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 200,
    delivery_time: "24-72 hours",
    features: ["Hook analysis", "Targeted promotion", "Report"],
    is_featured: true,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000005",
    category_slug: "telegram",
    slug: "telegram-channel-management",
    name: "Telegram Channel Management",
    short_description: "Keep your channel active and clean.",
    description:
      "Posting schedule, moderation and member engagement for Telegram channels and groups.",
    unit: "month",
    price_per_unit: 229.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 12,
    delivery_time: "Starts within 3 days",
    features: ["Posting schedule", "Moderation", "Engagement prompts"],
    is_featured: false,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000006",
    category_slug: "discord",
    slug: "discord-server-setup",
    name: "Discord Server Setup",
    short_description: "A server built to scale.",
    description:
      "Complete server architecture: channels, roles, permissions, onboarding and automation.",
    unit: "server",
    price_per_unit: 249.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 20,
    delivery_time: "5-7 business days",
    features: ["Channel architecture", "Roles & permissions", "Onboarding flow"],
    is_featured: true,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000007",
    category_slug: "x-twitter",
    slug: "x-account-management",
    name: "X Account Management",
    short_description: "Consistent posting and replies.",
    description:
      "Monthly management of your X account including posting cadence and reply strategy.",
    unit: "month",
    price_per_unit: 279.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 12,
    delivery_time: "Starts within 3 days",
    features: ["Posting cadence", "Reply strategy", "Monthly report"],
    is_featured: false,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000008",
    category_slug: "advertising",
    slug: "campaign-setup",
    name: "Campaign Setup",
    short_description: "Launch clean, launch fast.",
    description:
      "One-time setup of tracking, structure, audiences and creative variants for a new campaign.",
    unit: "campaign",
    price_per_unit: 249.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 25,
    delivery_time: "5 business days",
    features: ["Tracking setup", "Campaign structure", "Creative variants"],
    is_featured: true,
    sort_order: 1,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000009",
    category_slug: "content",
    slug: "short-form-video-editing",
    name: "Short-form Video Editing",
    short_description: "Reels, Shorts and TikToks.",
    description: "Editing of short-form video including captions, pacing and sound design.",
    unit: "video",
    price_per_unit: 49.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 200,
    delivery_time: "3-5 business days",
    features: ["Captions", "Sound design", "2 revisions"],
    is_featured: true,
    sort_order: 2,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
  {
    id: "22222222-2222-4000-8000-000000000010",
    category_slug: "branding",
    slug: "profile-optimization",
    name: "Profile Optimization",
    short_description: "Make every visit count.",
    description: "Optimisation of an existing profile for clarity, search and conversion.",
    unit: "profile",
    price_per_unit: 99.0,
    rate_basis: 1,
    min_quantity: 1,
    max_quantity: 20,
    delivery_time: "3-5 business days",
    features: ["Keyword optimisation", "Conversion copy", "Visual polish"],
    is_featured: true,
    sort_order: 2,
    is_active: true,
    is_archived: false,
    catalog_source: "neosmm_core",
  },
];

export const SEED_PAYMENT_METHODS: SeedPaymentMethod[] = [
  {
    id: "33333333-3333-4000-8000-000000000001",
    code: "usdt_bep20",
    name: "Tether USDT (BEP-20 / BNB Chain)",
    kind: "crypto",
    network: "BNB Smart Chain (BEP-20)",
    instructions:
      "Send USDT on BNB Smart Chain (BEP-20) to the address below. Paste your Transaction Hash (TxID) in the reference field and optionally upload a screenshot.",
    destination: "0xD2CE27D0Cf0DA92Ac43b23f9A9800932d5b2FD3c",
    min_amount: 5,
    max_amount: 50000,
    is_enabled: true,
    sort_order: 1,
  },
  {
    id: "33333333-3333-4000-8000-000000000002",
    code: "btc",
    name: "Bitcoin (BTC)",
    kind: "crypto",
    network: "Bitcoin Native SegWit",
    instructions:
      "Send BTC to the address below. Once broadcasted, paste your Bitcoin transaction hash in the reference field.",
    destination: "bc1q3n5vg8s6emhrjlfqht74zg385ygz6dplz8zd8f",
    min_amount: 15,
    max_amount: 50000,
    is_enabled: true,
    sort_order: 2,
  },
  {
    id: "33333333-3333-4000-8000-000000000003",
    code: "sol",
    name: "Solana (SOL)",
    kind: "crypto",
    network: "Solana Mainnet",
    instructions:
      "Send SOL to the Solana address below. Paste the Solana signature / transaction hash in the reference box.",
    destination: "7Ei7yEd3pTk8ttFFWXkSKVkQq32KgDYRF1ZYiE7ddtSB",
    min_amount: 5,
    max_amount: 50000,
    is_enabled: true,
    sort_order: 3,
  },
  {
    id: "33333333-3333-4000-8000-000000000004",
    code: "ltc",
    name: "Litecoin (LTC)",
    kind: "crypto",
    network: "Litecoin Network",
    instructions:
      "Send LTC to the Litecoin address below. Provide the transaction ID (TxID) in the reference box.",
    destination: "ltc1q3n5vg8s6emhrjlfqht74zg385ygz6dplxmcfle",
    min_amount: 5,
    max_amount: 50000,
    is_enabled: true,
    sort_order: 4,
  },
  {
    id: "33333333-3333-4000-8000-000000000005",
    code: "upi_pay",
    name: "UPI Instant Payment (INR / All UPI Apps)",
    kind: "upi",
    network: "UPI / GooglePay / PhonePe / Paytm / FamPay",
    instructions:
      "Scan the QR code or send to UPI ID: yuval69goku@fam (Yuval Mittal). Enter your 12-digit UPI UTR / Transaction ID and upload the payment proof screenshot.",
    destination: "yuval69goku@fam",
    min_amount: 5,
    max_amount: 10000,
    is_enabled: true,
    sort_order: 5,
  },
];
