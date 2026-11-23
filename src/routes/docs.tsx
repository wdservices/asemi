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
        <h1 className="text-3xl font-bold text-[#1a1a1e] mb-2">Asemi User Guide</h1>
        <p className="text-sm text-[#6e6e7a] mb-10">
          Step-by-step help for setting up products, issuing codes, checking activity, and managing
          your manufacturer account.
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

          {/* Manufacturer workflows */}
          <section id="products" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Products: add your catalogue</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Open <strong className="text-[#1a1a1e]">Products</strong> in the dashboard and
                select <strong className="text-[#1a1a1e]">New product</strong>. Enter the product
                name and choose its category. Add the SKU used on your packaging; it should identify
                this product consistently.
              </p>
              <p>
                The description and product photos help customers recognize the item on its
                verification page. Regulatory approval number, default lot number, and default
                manufacture/expiry dates are optional. Defaults can be overridden for an individual
                batch. Select <strong className="text-[#1a1a1e]">Create product</strong> to save.
                Use the edit action on a product to update its details later.
              </p>
              <p>
                To recall a product, use its recall action, enter a clear reason, and confirm. The
                warning is shown when a customer checks an affected code. Lift the recall from the
                same product when it is resolved.
              </p>
            </div>
          </section>

          <section id="batches" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Batches: issue product codes</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 space-y-4 text-sm leading-relaxed text-[#45454f]">
              <p>
                Open <strong className="text-[#1a1a1e]">Batches &amp; Codes</strong> and stay on{" "}
                <strong className="text-[#1a1a1e]">New batch</strong>. Select the product, then
                choose a suggested code quantity or enter your own. The price summary shows the
                regional rate and applies available complimentary codes automatically.
              </p>
              <p>
                Add the lot number, manufacture date, and expiry date for the production run. Check
                the product and quantity in the live label preview, then select{" "}
                <strong className="text-[#1a1a1e]">Confirm &amp; pay with Paystack</strong>. Codes
                are issued after checkout is confirmed. Do not submit payment twice if the
                confirmation is still processing.
              </p>
              <p>
                Open <strong className="text-[#1a1a1e]">History</strong> to find a previous batch
                and its status. Use <strong className="text-[#1a1a1e]">Codes</strong> to find issued
                serials and access the available code/label export actions.
              </p>
            </div>
          </section>

          <section id="analytics" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Analytics: review scans</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 text-sm leading-relaxed text-[#45454f]">
              <p>
                Open <strong className="text-[#1a1a1e]">Analytics</strong> to review consumer scan
                activity, scan locations, and repeat or suspicious scans. Use these patterns to
                identify where customers are checking products and which codes may need
                investigation. A scan count represents recorded verification activity, not units
                sold.
              </p>
            </div>
          </section>

          <section id="billing" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Billing: check charges</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 text-sm leading-relaxed text-[#45454f]">
              <p>
                Open <strong className="text-[#1a1a1e]">Billing</strong> to review payment and
                account billing information. Each new batch displays its estimate and complimentary
                code deduction before checkout. The final charge is calculated by the server at
                checkout; rely on the Paystack amount and receipt for the completed transaction.
              </p>
            </div>
          </section>

          <section id="profile" className="scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-xl font-bold text-[#1a1a1e]">Profile: keep your brand current</h2>
            </div>
            <div className="bg-white border border-[#e2ded5] rounded-xl p-6 text-sm leading-relaxed text-[#45454f]">
              <p>
                Open <strong className="text-[#1a1a1e]">Profile</strong> to review and update your
                company information, brand identity, and compliance documents. Keep your support
                contact details current so customers and the Asemi review team can identify your
                brand.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
