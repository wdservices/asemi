import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Asemi" },
      {
        name: "description",
        content:
          "Frequently asked questions about the Asemi product authentication platform.",
      },
    ],
  }),
  component: FAQPage,
});

const FAQ_ITEMS = [
  {
    q: "What is Asemi?",
    a: "Asemi is a product authentication platform that generates unique cryptographic verification codes for manufacturers. Consumers verify product authenticity by scanning a QR code or entering a code in their browser — no app download required.",
  },
  {
    q: "How do consumers verify a product?",
    a: "Consumers point their smartphone camera at the QR code on the product packaging, or manually type the verification code into a browser. Within seconds, they see the product's name, manufacturer, and whether the code is genuine.",
  },
  {
    q: "Do consumers need to install an app?",
    a: "No. Verification runs entirely in the web browser using the device's native camera. There is nothing to install.",
  },
  {
    q: "Who can register on Asemi?",
    a: "Any brand, manufacturer, or product creator. Official business incorporation documents and tax IDs are optional. You can register and start generating verification codes immediately.",
  },
  {
    q: "What are the costs?",
    a: "Asemi uses a progressive volume-based pricing model. Every company starts with 20 free verification codes. After that, you pay per code generated — rates decrease automatically as your lifetime volume grows.",
  },
  {
    q: "How do verification codes work?",
    a: "Each code is a unique 10-12 character cryptographic identifier. Codes are generated as QR labels with a text fallback. Once generated, they remain in your Code Bank permanently and can be re-exported or reprinted at any time.",
  },
  {
    q: "Can I add regulatory certificates to my products?",
    a: "Yes. Regulatory certificates (such as FDA, CE, NAFDAC, or ISO) and Lab Certificates of Analysis can be uploaded per product or batch inside your manufacturer dashboard.",
  },
  {
    q: "What happens if someone copies a code?",
    a: "If a code is scanned multiple times from different locations, Asemi flags it as suspicious. You receive alerts in your dashboard, and consumers are gently warned while being shown the verification details.",
  },
  {
    q: "Can I export codes for printing?",
    a: "Yes. You can export codes as CSV for your packaging printer, or print adhesive label sheets directly from the Code Bank in your dashboard.",
  },
  {
    q: "Which countries are supported?",
    a: "Asemi supports manufacturers worldwide. Pricing is region-locked based on your registered country. Payment providers (Paystack, Flutterwave, Stripe) are selected automatically based on your region.",
  },
];

function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
        <h1 className="text-3xl font-bold text-[#1a1a1e] mb-2">Frequently Asked Questions</h1>
        <p className="text-sm text-[#6e6e7a] mb-10">
          Everything you need to know about the Asemi product authentication platform.
        </p>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="border border-[#e2ded5] bg-white rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer hover:bg-[#fafaf8] transition-colors"
              >
                <span className="font-semibold text-[#1a1a1e] text-base pr-4">{item.q}</span>
                {openIndex === i ? (
                  <ChevronUp className="w-5 h-5 text-[#6e6e7a] shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#6e6e7a] shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-sm text-[#45454f] leading-relaxed border-t border-[#f0ece4] pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[#6e6e7a] mb-3">Still have questions?</p>
          <Link
            to="/"
            className="btn btn-fill"
          >
            <span>Contact Us</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
