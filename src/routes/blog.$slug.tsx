import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { BlogCover } from "@/components/blog/BlogCover";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { audienceLabel, formatBlogDate, getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getBlogPostBySlug(params.slug);
    if (!post) {
      return {
        meta: [{ title: "Article not found — Asemi Blog" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: post.seoTitle },
        { name: "description", content: post.metaDescription },
        {
          name: "keywords",
          content: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
        },
        { property: "og:type", content: "article" },
        { property: "og:title", content: post.seoTitle },
        { property: "og:description", content: post.metaDescription },
        { property: "article:published_time", content: post.publishedAt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.seoTitle },
        { name: "twitter:description", content: post.metaDescription },
      ],
    };
  },
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const { slug } = Route.useParams();
  const post = useMemo(() => getBlogPostBySlug(slug), [slug]);
  const related = useMemo(() => (post ? getRelatedBlogPosts(post, 3) : []), [post]);

  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(0);
      return;
    }

    let raf = 0;
    const updateProgress = () => {
      raf = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [slug]);

  const schemaGraph = useMemo(() => {
    if (!post) return null;
    return JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.metaDescription,
          datePublished: post.publishedAt,
          dateModified: post.publishedAt,
          keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
          author: {
            "@type": "Organization",
            name: "Asemi",
          },
          publisher: {
            "@type": "Organization",
            name: "Asemi",
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: post.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
      ],
    });
  }, [post]);

  if (!post) {
    return (
      <BlogLayout>
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1e]">Article not found</h1>
          <p className="mt-2 text-sm text-[#6e6e7a]">
            This guide may have been moved or the URL contains a typo.
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to all blog guides</span>
          </Link>
        </main>
      </BlogLayout>
    );
  }

  async function handleCopyLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Article link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  const primaryHref = post.asemiSpotlight.ctaType === "verify" ? "/verify" : "/auth";

  return (
    <BlogLayout>
      {schemaGraph && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaGraph }} />
      )}

      {/* Thin scroll depth progress line */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-blue-600 transition-transform duration-75"
        style={{ transform: `scaleX(${progress})` }}
      />

      <main className="mx-auto w-full max-w-[1140px] px-6 py-10 sm:py-14">
        {/* Top Breadcrumb + Share */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525b] transition-colors hover:text-[#1a1a1e]"
          >
            <ArrowLeft className="size-3.5" />
            <span>All guides</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2ded5] bg-white px-3 py-1.5 text-xs font-medium text-[#1a1a1e] transition-colors hover:border-[#c8c1b4]"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-700" />
                <span>Link copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-[#6e6e7a]" />
                <span>Share article</span>
              </>
            )}
          </button>
        </div>

        {/* Hero Cover with white overlay & title on image */}
        <BlogCover post={post} variant="hero" />

        {/* Asymmetric Editorial Grid: Main Reading Column + Sticky Outline Sidebar */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <article className="lg:col-span-8">
            <p className="max-w-prose text-lg leading-relaxed text-[#3f3f46]">{post.excerpt}</p>

            {/* Key Takeaways Box */}
            <section
              aria-label="Key takeaways"
              className="mt-8 rounded-2xl border border-[#e2ded5] bg-[#f4f0e8]/65 p-6"
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f7530]">
                Key takeaways
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#2b2b32]">
                {post.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2e8b57]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Article Sections */}
            <div className="mt-10 space-y-10 max-w-prose">
              {post.sections.map((section, sectionIdx) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="font-sans text-xl font-bold tracking-tight text-[#1a1a1e] sm:text-2xl text-balance">
                    {section.heading}
                  </h2>

                  <div className="mt-4 space-y-4 text-[16px] leading-[1.78] text-[#3f3f46]">
                    {section.paragraphs.map((paragraph, pIdx) => (
                      <p
                        key={pIdx}
                        className={
                          sectionIdx === 0 && pIdx === 0
                            ? "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-[#1a1a1e]"
                            : undefined
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {section.checklist && section.checklist.length > 0 && (
                    <ol className="mt-6 space-y-3 rounded-xl border border-[#e2ded5] bg-white p-5 sm:p-6">
                      {section.checklist.map((step, stepIdx) => (
                        <li
                          key={stepIdx}
                          className="flex items-start gap-3 text-sm leading-relaxed text-[#2b2b32]"
                        >
                          <span className="mt-0.5 font-mono text-xs font-bold text-[#8f7530] tabular-nums">
                            0{stepIdx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.highlightQuote && (
                    <blockquote className="my-8 border-y border-[#e2ded5] py-5 text-lg font-medium italic leading-relaxed text-[#1a1a1e]">
                      “{section.highlightQuote}”
                    </blockquote>
                  )}
                </section>
              ))}
            </div>

            {/* Asemi Solution Spotlight */}
            <section
              aria-label="How Asemi helps"
              className="mt-12 rounded-2xl border border-[#d6d0c4] bg-white p-6 sm:p-8"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <ShieldCheck className="size-4 shrink-0" />
                <span>How Asemi solves this</span>
              </div>
              <h2 className="mt-2 font-sans text-xl font-bold tracking-tight text-[#1a1a1e] sm:text-2xl text-balance">
                {post.asemiSpotlight.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#52525b]">
                {post.asemiSpotlight.summary}
              </p>

              <ul className="mt-5 space-y-2 text-sm text-[#2b2b32]">
                {post.asemiSpotlight.bulletPoints.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={primaryHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-700"
                >
                  {post.asemiSpotlight.ctaType === "verify" ? (
                    <QrCode className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  <span>{post.asemiSpotlight.ctaLabel}</span>
                </Link>

                <Link
                  to={post.asemiSpotlight.ctaType === "verify" ? "/auth" : "/verify"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2ded5] bg-[#fafaf8] px-4 py-2.5 text-xs font-semibold text-[#1a1a1e] whitespace-nowrap transition-colors hover:border-[#bfb7a6]"
                >
                  <span>
                    {post.asemiSpotlight.ctaType === "verify"
                      ? "Brands: get 20 free codes"
                      : "Try the consumer scanner"}
                  </span>
                </Link>
              </div>
            </section>

            {/* Frequently Asked Questions */}
            <section id="article-faqs" className="mt-12 scroll-mt-24">
              <h2 className="font-sans text-xl font-bold tracking-tight text-[#1a1a1e]">
                Frequently asked questions
              </h2>
              <div className="mt-4 space-y-3">
                {post.faqs.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fafaf8]"
                      >
                        <span className="text-sm font-semibold text-[#1a1a1e]">
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="size-4 shrink-0 text-[#6e6e7a]" />
                        ) : (
                          <ChevronDown className="size-4 shrink-0 text-[#6e6e7a]" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-[#f0ece4] px-5 pb-4 pt-3 text-sm leading-relaxed text-[#52525b]">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </article>

          {/* Right Sticky Sidebar: Article Outline + Quick Action */}
          <aside className="lg:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-20">
              <div className="rounded-2xl border border-[#e2ded5] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e6e7a]">
                  In this guide
                </p>
                <nav aria-label="Article sections" className="mt-3 space-y-2 text-sm">
                  {post.sections.map((section, idx) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-start gap-2.5 py-1 text-[#52525b] transition-colors hover:text-[#1a1a1e]"
                    >
                      <span className="font-mono text-xs text-[#8f7530] tabular-nums">
                        0{idx + 1}
                      </span>
                      <span className="leading-snug">{section.heading}</span>
                    </a>
                  ))}
                  <a
                    href="#article-faqs"
                    className="flex items-start gap-2.5 py-1 text-[#52525b] transition-colors hover:text-[#1a1a1e]"
                  >
                    <span className="font-mono text-xs text-[#8f7530] tabular-nums">
                      0{post.sections.length + 1}
                    </span>
                    <span className="leading-snug">Quick questions &amp; answers</span>
                  </a>
                </nav>

                <dl className="mt-5 space-y-2 border-t border-[#f0ece4] pt-4 text-xs text-[#6e6e7a]">
                  <div className="flex justify-between gap-2">
                    <dt>Written for</dt>
                    <dd className="font-medium text-[#1a1a1e]">{audienceLabel(post.audience)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Region</dt>
                    <dd className="font-medium text-[#1a1a1e]">{post.regionFocus}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Published</dt>
                    <dd className="font-medium text-[#1a1a1e] tabular-nums">
                      {formatBlogDate(post.publishedAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-[#e2ded5] bg-[#f4f0e8]/70 p-5">
                <p className="text-sm font-bold text-[#1a1a1e]">
                  {post.audience === "Manufacturers"
                    ? "Protect your products with 20 free unit codes"
                    : "Have a packaging label to check right now?"}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#52525b]">
                  {post.audience === "Manufacturers"
                    ? "Register your company, upload SKUs, and print 28×32mm QR labels in minutes."
                    : "Use Asemi's browser scanner to verify serial seals with no app required."}
                </p>
                <Link
                  to={post.audience === "Manufacturers" ? "/auth" : "/verify"}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-700"
                >
                  <span>
                    {post.audience === "Manufacturers"
                      ? "Create brand account"
                      : "Open Asemi scanner"}
                  </span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Guides Loop */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-[#e2ded5] pt-12">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight text-[#1a1a1e]">
                Related questions to read next
              </h2>
              <Link
                to="/blog"
                className="text-xs font-semibold text-blue-700 hover:underline underline-offset-4"
              >
                Browse all 20 guides
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to="/blog/$slug"
                  params={{ slug: item.slug }}
                  className="group flex flex-col justify-between rounded-2xl border border-[#e2ded5] bg-white p-4 transition-colors hover:border-[#bfb7a6]"
                >
                  <BlogCover post={item} variant="card" />
                  <div className="mt-4 flex items-center justify-between px-1 text-xs font-semibold text-blue-700">
                    <span>Read guide</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </BlogLayout>
  );
}
