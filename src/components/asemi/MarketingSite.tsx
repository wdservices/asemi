import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Building2,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Lock,
  Globe2,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Layers,
  Phone,
  Mail,
} from "lucide-react";

interface MarketingSiteProps {
  onOpenRegisterModal: () => void;
  onOpenLoginModal: () => void;
  onOpenVerifier: () => void;
  onEnterDashboard: () => void;
}

export const MarketingSite: React.FC<MarketingSiteProps> = ({
  onOpenRegisterModal,
  onOpenLoginModal,
  onOpenVerifier,
  onEnterDashboard,
}) => {
  // Auto-detect visitor's country currency based on regional location / timezone
  const [pricingCurrency] = useState<"NGN" | "USD">(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = typeof navigator !== "undefined" ? navigator.language : "";
      if (
        tz.toLowerCase().includes("lagos") ||
        tz.toLowerCase().includes("nigeria") ||
        tz.toLowerCase().includes("africa/lagos") ||
        tz.toLowerCase().includes("west_central_africa") ||
        lang.includes("en-NG") ||
        lang.includes("NG")
      ) {
        return "NGN";
      }
      return "USD";
    } catch {
      return "USD";
    }
  });
  const [calculatorVolume, setCalculatorVolume] = useState<number>(25000);

  // Pricing calculator values
  const calculateEstimate = (vol: number, curr: "NGN" | "USD") => {
    // 20 free codes
    const paidVol = Math.max(0, vol - 20);
    const symbol = curr === "NGN" ? "₦" : "$";

    if (curr === "NGN") {
      let cost = 0;
      let remaining = paidVol;
      const b1 = Math.min(remaining, 5000);
      cost += b1 * 50;
      remaining -= b1;
      const b2 = Math.min(remaining, 15000);
      cost += b2 * 35;
      remaining -= b2;
      const b3 = Math.min(remaining, 80000);
      cost += b3 * 25;
      remaining -= b3;
      const b4 = Math.min(remaining, 400000);
      cost += b4 * 18;
      remaining -= b4;
      cost += remaining * 12;
      return { cost, symbol, perUnit: (cost / vol).toFixed(2) };
    } else {
      let cost = 0;
      let remaining = paidVol;
      const b1 = Math.min(remaining, 5000);
      cost += b1 * 0.15;
      remaining -= b1;
      const b2 = Math.min(remaining, 15000);
      cost += b2 * 0.1;
      remaining -= b2;
      const b3 = Math.min(remaining, 80000);
      cost += b3 * 0.08;
      remaining -= b3;
      const b4 = Math.min(remaining, 400000);
      cost += b4 * 0.06;
      remaining -= b4;
      cost += remaining * 0.05;
      return { cost, symbol, perUnit: (cost / vol).toFixed(3) };
    }
  };

  const estimate = calculateEstimate(calculatorVolume, pricingCurrency);

  return (
    <div className="bg-[#fafaf8] text-[#2b2b32] selection:bg-[#c9a84c] selection:text-white">
      {/* Navigation Header */}
      <nav className="border-b border-[#e2ded5] bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a1a1e] text-white flex items-center justify-center font-bold text-base">
              a
            </div>
            <span className="font-bold text-xl tracking-tight text-[#1a1a1e]">Asemi</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-[#6e6e7a]">
            <a href="#problem" className="hover:text-[#1a1a1e] transition-colors">
              The Threat
            </a>
            <a href="#how" className="hover:text-[#1a1a1e] transition-colors">
              Protocol
            </a>
            <a href="#pricing" className="hover:text-[#1a1a1e] transition-colors">
              Pricing
            </a>
            <Link to="/faq" className="hover:text-[#1a1a1e] transition-colors">
              FAQ
            </Link>
            <Link to="/docs" className="hover:text-[#1a1a1e] transition-colors">
              Docs
            </Link>
            <button
              onClick={onOpenVerifier}
              className="text-[#c9a84c] font-bold hover:text-[#b8962e] transition-colors flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Verify Product</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onOpenLoginModal} className="btn btn-ghost btn-sm">
              <span>Sign In</span>
            </button>
            <button onClick={onOpenRegisterModal} className="btn btn-fill btn-sm">
              <span>Register Brand</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-24 border-b border-[#e2ded5] overflow-hidden">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#f4f0e8] border border-[#e2ded5] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#6e6e7a]">
              <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />
              <span>Cryptographic Packaging Security</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1a1a1e] leading-[1.1]">
              Prove it’s genuine. <br />
              <span className="text-[#8f7530]">Before they open the seal.</span>
            </h1>

            <p className="text-base text-[#6e6e7a] max-w-xl leading-relaxed">
              Every unit receives an unpredictable 10-12 character cryptographic serial code and QR
              symbol. Consumers scan with their smartphone camera — no mobile app required.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={onOpenRegisterModal} className="btn btn-fill">
                <span>Register Manufacturer Account</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>

              <button onClick={onOpenVerifier} className="btn btn-ghost">
                <QrCode className="w-4 h-4 text-[#c9a84c] mr-2" />
                <span>Test Consumer Scanner</span>
              </button>
            </div>

            <div className="pt-6 flex items-center gap-6 text-xs font-mono text-[#78716c]">
              <div>✓ 20 Free Onboarding Codes</div>
              <div>✓ Instant Smartphone Verification</div>
              <div>✓ Region-Locked Pricing</div>
            </div>
          </div>

          {/* Right Hero Graphic: Live Interactive Preview */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#e2ded5] p-6 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-[#f0ece4] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2e8b57]" />
                  <span className="font-mono text-xs font-bold uppercase text-[#1a1a1e]">
                    Consumer Verification Terminal
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-[#f0f8f3] text-[#2e8b57] px-2 py-0.5 border border-[#c6e5d2]">
                  LIVE SCAN
                </span>
              </div>

              {/* Sample Product Packaging Visual */}
              <div className="p-4 bg-[#fafaf8] border border-[#f0ece4] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#78716c]">Authentic Serial</span>
                  <strong className="font-mono text-xs text-[#1a1a1e] bg-white px-2 py-0.5 border border-[#e2ded5]">
                    ASM-9K4T-7X2P
                  </strong>
                </div>

                <div className="bg-[#f0f8f3] border border-[#c6e5d2] p-4 text-[#144729]">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#2e8b57]" />
                    <span>Genuine Product Verified</span>
                  </div>
                  <div className="text-xs text-[#255e39] mt-1">
                    Organic Shea Butter 250ml • Dove Care Products Ltd
                  </div>
                </div>

                <button
                  onClick={onOpenVerifier}
                  className="w-full bg-[#1a1a1e] hover:bg-[#b8962e] text-white py-2.5 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Try Live Verifier Simulator</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="px-6 py-20 border-b border-[#e2ded5]">
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-xl space-y-2 mb-12">
            <span className="text-[11px] font-mono text-[#c9a84c] uppercase tracking-wider font-bold">
              The Counterfeiting Crisis
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1e]">
              Packaging can be copied in hours. Asemi codes cannot.
            </h2>
            <p className="text-sm text-[#6e6e7a]">
              Counterfeiters easily replicate boxes, foil stamps, and batch stamps. But they cannot
              guess cryptographically random 10-12 character identifiers registered on Asemi's
              distributed ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <div className="w-10 h-10 bg-[#fbf5ea] border border-[#eedab2] flex items-center justify-center text-[#b86d14]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#1a1a1e]">Soft Counterfeit Escalation</h3>
              <p className="text-xs text-[#6e6e7a] leading-relaxed">
                If a counterfeiter copies a single legitimate code across 1,000 fake items, Asemi
                detects the abnormal scan frequency across multiple cities and warns consumers
                gently while alerting your brand.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <div className="w-10 h-10 bg-[#f0f8f3] border border-[#c6e5d2] flex items-center justify-center text-[#2e8b57]">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#1a1a1e]">No App Download Required</h3>
              <p className="text-xs text-[#6e6e7a] leading-relaxed">
                Friction kills consumer verification. Buyers simply point their native iPhone or
                Android camera at the packaging QR code and receive verification in under 500
                milliseconds.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <div className="w-10 h-10 bg-[#f5f0e8] border border-[#e0dbd2] flex items-center justify-center text-[#1a1a1e]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#1a1a1e]">Human Admin Verified</h3>
              <p className="text-xs text-[#6e6e7a] leading-relaxed">
                Only verified legal manufacturers with official business registration (CAC or
                national registries) can generate codes. Anonymous actors are strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol / How It Works */}
      <section id="how" className="px-6 py-20 border-b border-[#e2ded5] bg-[#f5f0e8]/50">
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-xl space-y-2 mb-12">
            <span className="text-[11px] font-mono text-[#c9a84c] uppercase tracking-wider font-bold">
              Factory Protocol
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1e]">
              Four steps from factory floor to consumer hand.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <span className="font-mono font-bold text-lg text-[#c9a84c]">01</span>
              <h3 className="font-bold text-sm text-[#1a1a1e]">Register Entity</h3>
              <p className="text-xs text-[#6e6e7a]">
                Submit corporate registration documents. Human operators verify legal standing and
                lock your jurisdiction.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <span className="font-mono font-bold text-lg text-[#c9a84c]">02</span>
              <h3 className="font-bold text-sm text-[#1a1a1e]">Generate Batch</h3>
              <p className="text-xs text-[#6e6e7a]">
                Choose code quantity. Progressive bracket pricing automatically calculates wholesale
                tiers.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <span className="font-mono font-bold text-lg text-[#c9a84c]">03</span>
              <h3 className="font-bold text-sm text-[#1a1a1e]">Print or Export</h3>
              <p className="text-xs text-[#6e6e7a]">
                Export CSV for your packaging printer or print adhesive label sheets directly from
                the portal.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-3">
              <span className="font-mono font-bold text-lg text-[#c9a84c]">04</span>
              <h3 className="font-bold text-sm text-[#1a1a1e]">Track Scans</h3>
              <p className="text-xs text-[#6e6e7a]">
                Monitor real-time consumer scans, geographical velocity, and any suspicious
                duplication patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section with Interactive Calculator */}
      <section id="pricing" className="px-6 py-20 border-b border-[#e2ded5]">
        <div className="max-w-[1180px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div className="space-y-2 max-w-lg">
              <span className="text-[11px] font-mono text-[#c9a84c] uppercase tracking-wider font-bold">
                Volume-Tiered Pricing
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[#1a1a1e]">
                Transparent brackets. No recurring subscriptions.
              </h2>
              <p className="text-sm text-[#6e6e7a]">
                Pay per generated code. The more your brand produces, the lower the unit price per
                code drops.
              </p>
            </div>

            {/* Region / Currency Indicator (auto-detected, selector moved to billing portal) */}
            <div className="flex items-center gap-2 bg-[#f0ece4] px-3 py-1.5 border border-[#e2ded5] self-start sm:self-auto font-mono text-xs text-[#1a1a1e]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {pricingCurrency === "NGN"
                  ? "Localized for Nigeria (₦ NGN)"
                  : "Localized in US Dollars ($ USD)"}
              </span>
            </div>
          </div>

          {/* Interactive Calculator Box */}
          <div className="bg-white border border-[#e2ded5] p-8 mb-12 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="volume-slider"
                    className="text-xs font-mono uppercase font-bold text-[#6e6e7a]"
                  >
                    Estimate Codes Volume
                  </label>
                  <span className="font-mono text-lg font-bold text-[#1a1a1e]">
                    {calculatorVolume.toLocaleString()} codes
                  </span>
                </div>

                <input
                  id="volume-slider"
                  type="range"
                  min={500}
                  max={500000}
                  step={500}
                  value={calculatorVolume}
                  onChange={(e) => setCalculatorVolume(parseInt(e.target.value))}
                  className="w-full accent-[#1a1a1e] cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-mono text-[#78716c]">
                  <span>500</span>
                  <span>50,000</span>
                  <span>100,000</span>
                  <span>500,000</span>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#fafaf8] border border-[#e2ded5] p-6 text-center">
                <div className="text-xs font-mono uppercase text-[#78716c]">Total Investment</div>
                <div className="text-3xl font-bold text-[#1a1a1e] mt-1 font-mono">
                  {estimate.symbol}
                  {estimate.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-mono text-[#2e8b57] mt-1">
                  Average {estimate.symbol}
                  {estimate.perUnit} / unit
                </div>

                <button onClick={onOpenRegisterModal} className="btn btn-fill w-full mt-4">
                  <span>Start With 20 Free Codes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2ded5] bg-white px-6 py-12 text-xs font-mono text-[#78716c]">
        <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1a1a1e] text-white flex items-center justify-center font-bold text-xs">
              a
            </div>
            <span className="font-bold text-[#1a1a1e]">Asemi Authentication Engine</span>
          </div>

          <div className="hidden sm:block">
            Official Product Security Infrastructure • Region-locked cryptographic ledger.
          </div>

          <div className="flex flex-wrap gap-4">
            <Link to="/faq" className="hover:text-[#1a1a1e] underline">
              FAQ
            </Link>
            <Link to="/docs" className="hover:text-[#1a1a1e] underline">
              Documentation
            </Link>
            <Link to="/terms" className="hover:text-[#1a1a1e] underline">
              Terms &amp; Conditions
            </Link>
            <button onClick={onEnterDashboard} className="hover:text-[#1a1a1e] underline">
              Manufacturer Dashboard
            </button>
            <button onClick={onOpenVerifier} className="hover:text-[#1a1a1e] underline">
              Consumer Scanner
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
