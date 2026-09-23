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
              <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Getting Started</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                <strong className="text-[#1a1a1e]">Step 1: Register your brand.</strong> Visit{" "}
                <Link
                  to="/auth"
                  search={{ mode: "register" }}
                  className="underline text-[#b8962e] font-medium"
                >
                  the registration page
                </Link>{" "}
                and provide your company name, operating country, industry category, and an
                authorized work email. Business registration documents and tax IDs are optional.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Step 2: Account verification.</strong> After
                registration, your account enters a pending review state. Our team verifies your
                business details within 1-2 business days. During this time, you have access to 20
                free verification codes.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Step 3: Access your dashboard.</strong> Once
                approved, log in to access your manufacturer dashboard where you can list products,
                generate code batches, manage your code bank, and view analytics.
              </p>
            </div>
          </section>

          {/* Verification Codes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Verification Codes</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Each verification code is a unique 10-12 character cryptographic identifier. Codes
                are generated as QR labels with a text fallback for manual entry. Every code you
                generate is permanently stored in your Code Bank and can be re-exported or reprinted
                at no additional cost.
              </p>
              <p>
                Codes are generated in batches linked to a specific product. When generating a
                batch, you specify the product, quantity, lot number, and manufacturing/expiry dates
                for full traceability.
              </p>
              <p>
                <strong className="text-[#1a1a1e]">Pricing:</strong> Progressive volume-based
                pricing applies automatically. The first 20 codes are free. Rates decrease as your
                lifetime code volume increases across defined pricing tiers.
              </p>
            </div>
          </section>

          {/* Consumer Verification */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Consumer Verification</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Consumers verify product authenticity by scanning the QR code on the product
                packaging with their smartphone camera, or by manually entering the verification
                code at <strong className="text-[#1a1a1e]">your-brand.com/v/CODE</strong>.
              </p>
              <p>
                The verification page displays: product name, manufacturer name, category,
                verification status (genuine or suspicious), and the number of times the code has
                been scanned. No app download is required.
              </p>
              <p>
                If a code is scanned multiple times from geographically distant locations within a
                short time window, the system flags it as potentially compromised and displays a
                warning to the consumer while alerting the brand owner.
              </p>
            </div>
          </section>

          {/* Dashboard Features */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Dashboard Features</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 text-sm leading-relaxed text-[#45454f]">
              <ul className="space-y-3 list-disc list-inside">
                <li>
                  <strong className="text-[#1a1a1e]">Products:</strong> List products with names,
                  categories, descriptions, images, and optional regulatory documents.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Generate Codes:</strong> Specify product and
                  quantity, review pricing, and generate batches of verification codes.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Code Bank:</strong> Search, filter, inspect,
                  export, and print all generated codes. Codes are stored permanently.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Analytics:</strong> View scan volumes,
                  geographic distribution, and suspicious activity reports.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Billing:</strong> Track your pricing tier,
                  lifetime spend, and transaction history.
                </li>
                <li>
                  <strong className="text-[#1a1a1e]">Profile:</strong> Update company information,
                  upload regulatory certificates, and manage account settings.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
