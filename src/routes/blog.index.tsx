import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Search } from "lucide-react";
import { BlogCover } from "@/components/blog/BlogCover";
import { BlogLayout } from "@/components/blog/BlogLayout";
import {
  BLOG_AUDIENCES,
  BLOG_CATEGORIES,
  getAllBlogPosts,
  type BlogAudience,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Product Authenticity & Brand Protection Blog — Asemi" },
      {
        name: "description",
        content:
          "Practical guides answering everyday questions from shoppers and manufacturers in Nigeria and globally on spotting fakes and verifying products with Asemi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Product Authenticity & Brand Protection Blog — Asemi" },
      {
        property: "og:description",
        content:
          "20 real-world guides on skincare, luxury fashion, supplements, food purity, NAFDAC copycats, and protecting genuine brands with Asemi.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Product Authenticity & Brand Protection Blog — Asemi" },
      {
        name: "twitter:description",
        content:
          "Practical answers for shoppers and manufacturers fighting counterfeits in Nigeria and globally.",
      },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const allPosts = useMemo(() => getAllBlogPosts(), []);
  const [audience, setAudience] = useState<"All" | BlogAudience>("All");
  const [category, setCategory] = useState<"All" | BlogCategory>("All");
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPosts.filter((post) => {
      if (audience !== "All" && post.audience !== audience) return false;
      if (category !== "All" && post.category !== category) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.primaryKeyword.toLowerCase().includes(q) ||
        post.secondaryKeywords.some((kw) => kw.toLowerCase().includes(q)) ||
        post.category.toLowerCase().includes(q)
      );
    });
  }, [allPosts, audience, category, query]);

  const isDefaultView = audience === "All" && category === "All" && query.trim() === "";
  const leadPost = isDefaultView ? filteredPosts[0] : undefined;
  const spotlightPosts = isDefaultView
    ? filteredPosts.filter((p) => p.number === "11" || p.number === "03").slice(0, 2)
    : [];
  const remainingPosts = isDefaultView
    ? filteredPosts.filter(
        (p) => p.slug !== leadPost?.slug && !spotlightPosts.some((s) => s.slug === p.slug),
      )
    : filteredPosts;

  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Asemi Product Authenticity & Brand Protection Blog",
        description:
          "Everyday questions and verified guides for consumers and manufacturers fighting counterfeit goods in Nigeria and globally.",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: allPosts.map((post, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: post.title,
            url: `/blog/${post.slug}`,
          })),
        },
      }),
    [allPosts],
  );

  function resetFilters() {
    setAudience("All");
    setCategory("All");
    setQuery("");
  }

  return (
    <BlogLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <main className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16">
        {/* Editorial Intro */}
        <section className="border-b border-[#e2ded5] pb-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium tracking-wide text-[#8f7530]">
                Asemi Journal · Consumer Safety &amp; Brand Defense
              </p>
              <h1 className="mt-3 font-sans text-[clamp(2rem,3.8vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-[#1a1a1e] text-balance">
                Everyday questions on real products, fakes, and protecting what you make.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#52525b]">
                Clear, product-first guides for shoppers checking skincare, perfumes, luxury goods,
                supplements, and food—alongside practical answers for genuine manufacturers
                defending their brands in Nigeria and globally.
              </p>
            </div>

            <div className="lg:col-span-5">
              <label htmlFor="blog-search" className="sr-only">
                Search blog questions
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6e6e7a]" />
                <input
                  id="blog-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search skincare, NAFDAC, perfume, expiry, recall…"
                  className="h-11 w-full rounded-xl border border-[#d6d0c4] bg-white pl-10 pr-4 text-sm text-[#1a1a1e] placeholder:text-[#78716c] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
              <p className="mt-2 text-xs text-[#6e6e7a] tabular-nums">
                Showing {filteredPosts.length} of {allPosts.length} guides
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter by reader audience"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[#e2ded5] bg-[#f4f0e8]/70 p-1"
            >
              {BLOG_AUDIENCES.map((item) => {
                const active = audience === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAudience(item.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? "bg-white text-[#1a1a1e] shadow-xs"
                        : "text-[#52525b] hover:text-[#1a1a1e]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Filter by topic category"
              className="flex flex-wrap items-center gap-1.5"
            >
              {BLOG_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-[#e2ded5] bg-white text-[#52525b] hover:border-[#c8c1b4] hover:text-[#1a1a1e]"
                    }`}
                  >
                    {cat === "All" ? "All topics" : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Empty State */}
        {filteredPosts.length === 0 ? (
          <section className="my-16 rounded-2xl border border-[#e2ded5] bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-[#1a1a1e]">
              No matching articles found for your current filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6e6e7a]">
              Try clearing your search phrase or switching back to all product categories.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset filters</span>
            </button>
          </section>
        ) : (
          <div className="mt-10 space-y-14">
            {/* Tier 1: Lead Featured Question */}
            {leadPost && (
              <section aria-label="Featured guide">
                <Link
                  to="/blog/$slug"
                  params={{ slug: leadPost.slug }}
                  className="group grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-[#e2ded5] bg-white p-4 sm:p-6 lg:grid-cols-12 transition-colors hover:border-[#bfb7a6]"
                >
                  <div className="lg:col-span-7">
                    <BlogCover post={leadPost} variant="featured" className="h-full" />
                  </div>
                  <div className="flex flex-col justify-between py-2 lg:col-span-5">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-[#8f7530]">
                        Featured consumer guide
                      </p>
                      <p className="mt-3 text-base leading-relaxed text-[#45454f]">
                        {leadPost.excerpt}
                      </p>
                      <ul className="mt-5 space-y-2 border-t border-[#f0ece4] pt-4 text-sm text-[#52525b]">
                        {leadPost.keyTakeaways.slice(0, 2).map((point, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-mono text-xs font-semibold text-[#8f7530] mr-2">
                              0{idx + 1}.
                            </span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <span>Read full answer</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Tier 2: Secondary Editorial Spotlights (Nigeria & Global + Luxury) */}
            {spotlightPosts.length > 0 && (
              <section aria-label="Highlighted topics">
                <div className="mb-5 flex items-baseline justify-between border-b border-[#e2ded5] pb-3">
                  <h2 className="text-lg font-bold tracking-tight text-[#1a1a1e]">
                    Spotlight for manufacturers &amp; buyers
                  </h2>
                  <span className="text-xs text-[#6e6e7a]">Nigeria &amp; Global focus</span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {spotlightPosts.map((post) => (
                    <BlogArticleCard key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}

            {/* Tier 3: Full Article Grid */}
            {remainingPosts.length > 0 && (
              <section aria-label="All guides">
                {isDefaultView && (
                  <div className="mb-5 flex items-baseline justify-between border-b border-[#e2ded5] pb-3">
                    <h2 className="text-lg font-bold tracking-tight text-[#1a1a1e]">
                      More everyday questions &amp; answers
                    </h2>
                    <span className="text-xs text-[#6e6e7a] tabular-nums">
                      {remainingPosts.length} guides
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remainingPosts.map((post) => (
                    <BlogArticleCard key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </BlogLayout>
  );
}

function BlogArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col justify-between rounded-2xl border border-[#e2ded5] bg-white p-4 transition-colors hover:border-[#bfb7a6]"
    >
      <div>
        <BlogCover post={post} variant="card" />
        <p className="mt-4 px-1 text-sm leading-relaxed text-[#52525b] line-clamp-3">
          {post.excerpt}
        </p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#f0ece4] px-1 pt-3 text-xs font-semibold text-blue-700">
        <span>Read guide</span>
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
