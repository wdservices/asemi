import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — Asemi" },
      {
        name: "description",
        content:
          "Read the terms and conditions governing use of the Asemi product authentication platform.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
        <h1 className="text-3xl font-bold text-[#1a1a1e] mb-2">Terms and Conditions</h1>
        <p className="text-sm text-[#6e6e7a] mb-8">Effective Date: September 21, 2026</p>

        <div className="prose prose-zinc max-w-none space-y-8 text-sm leading-relaxed text-[#45454f]">
          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Asemi product authentication platform ("Service"), you agree
              to be bound by these Terms and Conditions. If you do not agree, do not use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">2. Description of Service</h2>
            <p>
              Asemi provides a product authentication and verification registry. Manufacturers
              register their brands, generate unique cryptographic verification codes, and affix
              them to products. Consumers verify product authenticity by scanning QR codes or
              entering codes via a web browser — no mobile app required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">3. Eligibility</h2>
            <p>
              The Service is available to all brands, manufacturers, and product creators. Official
              business incorporation documents and tax IDs are optional during registration.
              Regulatory certificates (FDA, CE, NAFDAC, ISO) and Lab Certificates of Analysis can be
              uploaded per product or batch inside the manufacturer console.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">4. Account Registration</h2>
            <p>
              You must provide accurate and complete information during registration. You are
              responsible for maintaining the confidentiality of your account credentials. Asemi
              reserves the right to suspend or terminate accounts that provide false or misleading
              information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">5. Verification Codes</h2>
            <p>
              Each generated verification code is a unique cryptographic identifier linked to your
              registered product. Codes are generated in batches and remain permanently associated
              with your account. Free tier codes (up to 20) are provided upon registration and do
              not expire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">6. Pricing and Payment</h2>
            <p>
              Pricing follows a progressive volume-based structure. Rates decrease as your lifetime
              code volume increases. All payments are processed through integrated payment providers
              (Paystack, Flutterwave, or Stripe depending on region). Prices are quoted in the
              currency applicable to your registered country.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">7. Intellectual Property</h2>
            <p>
              All verification codes, QR symbols, and associated data generated through the Service
              remain the property of the registering brand. Asemi retains ownership of the platform,
              its underlying technology, and the cryptographic ledger infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">8. Consumer Verification</h2>
            <p>
              Consumer verification pages are publicly accessible. When a consumer scans a QR code
              or enters a verification code, they receive product authenticity information including
              product name, manufacturer, and verification status. Asemi does not collect personal
              data from consumers during the verification process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">9. Limitation of Liability</h2>
            <p>
              Asemi provides the Service on an "as is" basis. While we employ cryptographic security
              measures, we do not guarantee the prevention of all counterfeiting activities. Asemi
              shall not be liable for any indirect, incidental, or consequential damages arising
              from use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">10. Termination</h2>
            <p>
              Either party may terminate this agreement. You may close your account at any time
              through the dashboard. Asemi reserves the right to suspend or terminate access for
              violation of these terms, with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">11. Changes to Terms</h2>
            <p>
              Asemi reserves the right to modify these Terms at any time. Material changes will be
              communicated via email or dashboard notification. Continued use of the Service after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1a1a1e] mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:hello@asemi.app" className="underline text-[#b8962e] font-medium">
                hello@asemi.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
