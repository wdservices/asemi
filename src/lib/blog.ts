import rawPosts from "@/data/blog-posts.json";

export type BlogAudience = "Shoppers" | "Manufacturers" | "Both";

export type BlogCategory =
  | "Skincare & Beauty"
  | "Luxury & Streetwear"
  | "Pharma & Supplements"
  | "Food & Specialty"
  | "Smart Buying & Brands"
  | "Brand & Market Defense";

export type BlogCoverKey =
  | "skincare"
  | "perfume_luxury"
  | "supplements"
  | "gourmet_food"
  | "packaging_verify"
  | "factory_market";

export interface BlogSection {
  id: string;
  heading: string;
  paragraphs: string[];
  checklist?: string[];
  highlightQuote?: string;
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogAsemiSpotlight {
  heading: string;
  summary: string;
  bulletPoints: string[];
  ctaLabel: string;
  ctaType: "verify" | "register";
}

export interface BlogPost {
  slug: string;
  number: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  audience: BlogAudience;
  category: BlogCategory;
  regionFocus: "Global" | "Nigeria & Global";
  publishedAt: string;
  readTimeMinutes: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  coverKey: BlogCoverKey;
  coverAlt: string;
  keyTakeaways: string[];
  sections: BlogSection[];
  asemiSpotlight: BlogAsemiSpotlight;
  faqs: BlogFaq[];
}

export const BLOG_AUDIENCES: Array<{ value: "All" | BlogAudience; label: string }> = [
  { value: "All", label: "All readers" },
  { value: "Shoppers", label: "For shoppers" },
  { value: "Manufacturers", label: "For manufacturers" },
  { value: "Both", label: "Shoppers & brands" },
];

export const BLOG_CATEGORIES: Array<"All" | BlogCategory> = [
  "All",
  "Skincare & Beauty",
  "Luxury & Streetwear",
  "Pharma & Supplements",
  "Food & Specialty",
  "Smart Buying & Brands",
  "Brand & Market Defense",
];

const blogPosts = rawPosts as BlogPost[];

export function getAllBlogPosts(): BlogPost[] {
  return blogPosts;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(current: BlogPost, limit = 3): BlogPost[] {
  const others = blogPosts.filter((p) => p.slug !== current.slug);
  const scored = others.map((candidate) => {
    let score = 0;
    if (candidate.category === current.category) score += 3;
    if (candidate.audience === current.audience) score += 2;
    if (candidate.regionFocus === current.regionFocus) score += 1;
    return { candidate, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.candidate);
}

export function formatBlogDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function audienceLabel(audience: BlogAudience): string {
  if (audience === "Shoppers") return "Shopper guide";
  if (audience === "Manufacturers") return "Manufacturer guide";
  return "Buyers & brands";
}
