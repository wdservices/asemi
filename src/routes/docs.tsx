import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, QrCode, ShieldCheck, Layers, Package } from "lucide-react";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Asemi" },
      {
        name: "description",
        content: "Product documentation for the Asemi product authentication platform.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#2b2b32]">
      <nav className="border-b border-[#e2ded5] bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-[820px] mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#78716c] hover:text-[#1a1a1e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <Logo />
        </div>
      </nav>

      <main className="max-w-[820px] mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#1a1a1e] mb-2">Product Documentation</h1>
        <p className="text-sm text-[#6e6e7a] mb-10">
          How the Asemi authentication platform works — from registration to consumer verification.
        </p>

        <div className="space-y-10">
          {/* Getting Started */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Getting Started</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                <strong className="text-[#1a1a1e]">Step 1: Register your brand.</strong> Visit{" "}
                <Link
                  to="/auth"
                  search={{ mode: "register" }}
                  className="underline text-[#1d4ed8] font-medium"
                >
                  the registration page
                </Link>{" "}
                and provide your company name, operating country, industry category, and an
                authorized work email. Business registration documents are optional during signup.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Step 2: Account verification.</strong> After
                registration, your account enters a pending review state. Our compliance team
                reviews your details within 1–2 business days. On approval you receive 20
                complimentary verification codes.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Step 3: Access your dashboard.</strong> Once
                approved, log in to manage your product catalogue, issue serialized code batches,
                download 28×32mm print stickers, and monitor scan activity.
              </p>
            </div>
          </section>

          {/* Verification Codes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">
                Serialized Codes &amp; Provenance
              </h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Every physical unit receives its own unique cryptographic code (formatted{" "}
                <span className="font-mono text-xs">ASM-XXXX-XXXXXX</span>) rendered on a
                print-ready 28×32mm sticker with QR code and text fallback. All codes remain stored
                permanently in your Code Bank for re-export as ZIP or print sheets.
              </p>
              <p>
                When issuing a batch, you can record lot numbers, manufacture dates, and expiry
                dates alongside your product SKU for full unit-level traceability. Brands can also
                issue or lift instant product-wide or batch-specific recalls at any time.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Pricing:</strong> Progressive volume-based
                pricing applies automatically in your regional currency. Your first 20 codes are
                free.
              </p>
            </div>
          </section>

          {/* Consumer Verification */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Consumer Verification</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Consumers verify authenticity by scanning the packaging QR code with their
                smartphone camera, opening our built-in browser camera scanner on{" "}
                <Link to="/verify" className="underline text-[#1d4ed8] font-medium">
                  /verify
                </Link>
                , or entering the printed serial code manually.
              </p>
              <p>
                The provenance certificate displays product details, SKU, manufacturer identity, lot
                number, manufacture and expiry dates (with automatic expiry advisories), scan count,
                and urgent manufacturer recall notices if issued.
              </p>
              <p>
                Repeated scans across distant locations automatically raise a fraud warning for
                consumers and flag the code in your analytics and admin fraud review console.
              </p>
            </div>
          </section>

          {/* Dashboard Features */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Dashboard Features</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 text-sm leading-relaxed text-[#45454f]">
              <ul className="space-y-3 list-disc list-inside">
                <li>
                  <strong className="text-[#1a1a1e]">Products:</strong> Manage SKUs, descriptions,
                  photos, default lot/expiry dates, and SKU-level recalls.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Batches &amp; Codes:</strong> Request
                  serialized batches via Paystack checkout, track batch history, manage recalls, and
                  export 28×32mm labels as ZIP or printable sheets.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Analytics:</strong> View scan volumes,
                  geographic distribution, and suspicious activity reports.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Billing:</strong> Track your pricing tier,
                  lifetime spend, and transaction invoices.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Profile:</strong> Update brand details, logo,
                  and compliance documentation.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
