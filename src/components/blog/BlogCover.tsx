import { useState } from "react";
import { audienceLabel, formatBlogDate, type BlogPost } from "@/lib/blog";
import { BLOG_COVER_ASSETS } from "@/lib/blog-covers";
import { cn } from "@/lib/utils";

interface BlogCoverProps {
  post: BlogPost;
  variant?: "card" | "featured" | "hero";
  className?: string;
}

/**
 * Soft-focus blog cover image softened with a translucent white veil
 * so imagery stays calm and legible with the article title directly over it.
 */
export function BlogCover({ post, variant = "card", className }: BlogCoverProps) {
  const [failed, setFailed] = useState(false);
  const asset = BLOG_COVER_ASSETS[post.coverKey];

  const paddingClass =
    variant === "hero"
      ? "min-h-[260px] sm:min-h-[340px] p-6 sm:p-10 lg:p-12"
      : variant === "featured"
        ? "min-h-[250px] sm:min-h-[320px] p-6 sm:p-9"
        : "min-h-[210px] p-5 sm:p-6";

  const titleClass =
    variant === "hero"
      ? "text-2xl sm:text-4xl lg:text-[2.65rem] leading-[1.15]"
      : variant === "featured"
        ? "text-xl sm:text-3xl leading-[1.2]"
        : "text-lg sm:text-[1.2rem] leading-[1.28]";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-[#e2ded5] bg-[#fafaf8]",
        variant === "hero" ? "rounded-2xl" : "rounded-xl",
        paddingClass,
        "flex flex-col justify-between",
        className,
      )}
    >
      {/* Soft fallback warm-paper backdrop */}
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 bg-gradient-to-br", asset.fallbackBg)}
      />

      {/* Soft-focus background image (not razor-sharp, gently muted) */}
      {!failed && (
        <img
          src={asset.src}
          alt={post.coverAlt}
          referrerPolicy="no-referrer"
          loading={variant === "hero" ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-78 saturate-[0.72] blur-[1.75px] transition-transform duration-300 group-hover:scale-[1.06]"
        />
      )}

      {/* White overlay veil keeping brightness calm and title crisp */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/72 via-white/82 to-white/94 backdrop-blur-[1.5px]"
      />

      {/* Quiet unboxed top metadata line */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#52525b]">
        <span className="font-mono text-[11px] font-semibold text-[#8f7530] tabular-nums">
          {post.number}
        </span>
        <span aria-hidden="true">·</span>
        <span>{post.category}</span>
        <span aria-hidden="true">·</span>
        <span>{audienceLabel(post.audience)}</span>
        {post.regionFocus === "Nigeria & Global" && (
          <>
            <span aria-hidden="true">·</span>
            <span>Nigeria &amp; Global</span>
          </>
        )}
      </div>

      {/* Article title placed directly over the white-veiled cover */}
      <div className="relative z-10 mt-5 border-t border-[#1a1a1e]/10 pt-4">
        {variant === "hero" ? (
          <h1
            className={cn(
              "font-sans font-bold tracking-tight text-[#1a1a1e] text-balance",
              titleClass,
            )}
          >
            {post.title}
          </h1>
        ) : (
          <h2
            className={cn(
              "font-sans font-bold tracking-tight text-[#1a1a1e] text-balance transition-colors group-hover:text-blue-700",
              titleClass,
            )}
          >
            {post.title}
          </h2>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-[#52525b] tabular-nums">
          <span>{formatBlogDate(post.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readTimeMinutes} min read</span>
        </div>
      </div>
    </div>
  );
}
