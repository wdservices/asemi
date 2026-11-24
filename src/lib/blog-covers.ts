import skincareCover from "@/assets/images/blog_cover_skincare_1795480970901.jpg";
import perfumeLuxuryCover from "@/assets/images/blog_cover_perfume_luxury_1795480972078.jpg";
import supplementsCover from "@/assets/images/blog_cover_supplements_1795480972145.jpg";
import gourmetFoodCover from "@/assets/images/blog_cover_gourmet_food_1795480972458.jpg";
import packagingVerifyCover from "@/assets/images/blog_cover_packaging_verify_1795480972843.jpg";
import factoryMarketCover from "@/assets/images/blog_cover_factory_market_1795480973699.jpg";
import type { BlogCoverKey } from "./blog";

export interface BlogCoverAsset {
  src: string;
  fallbackBg: string;
}

export const BLOG_COVER_ASSETS: Record<BlogCoverKey, BlogCoverAsset> = {
  skincare: {
    src: skincareCover,
    fallbackBg: "from-[#f7f5f0] via-[#f2efe8] to-[#eae5da]",
  },
  perfume_luxury: {
    src: perfumeLuxuryCover,
    fallbackBg: "from-[#f6f3ee] via-[#efeae2] to-[#e6dfd4]",
  },
  supplements: {
    src: supplementsCover,
    fallbackBg: "from-[#f4f6f4] via-[#edf1ed] to-[#e4eae4]",
  },
  gourmet_food: {
    src: gourmetFoodCover,
    fallbackBg: "from-[#f8f5ed] via-[#f2ede0] to-[#eae2cf]",
  },
  packaging_verify: {
    src: packagingVerifyCover,
    fallbackBg: "from-[#f5f5f3] via-[#eeeeea] to-[#e5e4de]",
  },
  factory_market: {
    src: factoryMarketCover,
    fallbackBg: "from-[#f4f6f8] via-[#edf0f4] to-[#e3e8ee]",
  },
};
