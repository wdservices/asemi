import React, { useState, useEffect, useRef } from "react";

interface Country {
  name: string;
  code: string;
}

const COUNTRIES: [string, string][] = [
  ["Afghanistan", "AF"],
  ["Albania", "AL"],
  ["Algeria", "DZ"],
  ["Andorra", "AD"],
  ["Angola", "AO"],
  ["Argentina", "AR"],
  ["Armenia", "AM"],
  ["Australia", "AU"],
  ["Austria", "AT"],
  ["Azerbaijan", "AZ"],
  ["Bahamas", "BS"],
  ["Bahrain", "BH"],
  ["Bangladesh", "BD"],
  ["Barbados", "BB"],
  ["Belarus", "BY"],
  ["Belgium", "BE"],
  ["Belize", "BZ"],
  ["Benin", "BJ"],
  ["Bhutan", "BT"],
  ["Bolivia", "BO"],
  ["Bosnia and Herzegovina", "BA"],
  ["Botswana", "BW"],
  ["Brazil", "BR"],
  ["Brunei", "BN"],
  ["Bulgaria", "BG"],
  ["Burkina Faso", "BF"],
  ["Burundi", "BI"],
  ["Cabo Verde", "CV"],
  ["Cambodia", "KH"],
  ["Cameroon", "CM"],
  ["Canada", "CA"],
  ["Central African Republic", "CF"],
  ["Chad", "TD"],
  ["Chile", "CL"],
  ["China", "CN"],
  ["Colombia", "CO"],
  ["Comoros", "KM"],
  ["Congo", "CG"],
  ["Costa Rica", "CR"],
  ["Croatia", "HR"],
  ["Cuba", "CU"],
  ["Cyprus", "CY"],
  ["Czechia", "CZ"],
  ["Denmark", "DK"],
  ["Djibouti", "DJ"],
  ["Dominica", "DM"],
  ["Dominican Republic", "DO"],
  ["DR Congo", "CD"],
  ["Ecuador", "EC"],
  ["Egypt", "EG"],
  ["El Salvador", "SV"],
  ["Equatorial Guinea", "GQ"],
  ["Eritrea", "ER"],
  ["Estonia", "EE"],
  ["Eswatini", "SZ"],
  ["Ethiopia", "ET"],
  ["Fiji", "FJ"],
  ["Finland", "FI"],
  ["France", "FR"],
  ["Gabon", "GA"],
  ["Gambia", "GM"],
  ["Georgia", "GE"],
  ["Germany", "DE"],
  ["Ghana", "GH"],
  ["Greece", "GR"],
  ["Grenada", "GD"],
  ["Guatemala", "GT"],
  ["Guinea", "GN"],
  ["Guinea-Bissau", "GW"],
  ["Guyana", "GY"],
  ["Haiti", "HT"],
  ["Honduras", "HN"],
  ["Hungary", "HU"],
  ["Iceland", "IS"],
  ["India", "IN"],
  ["Indonesia", "ID"],
  ["Iran", "IR"],
  ["Iraq", "IQ"],
  ["Ireland", "IE"],
  ["Israel", "IL"],
  ["Italy", "IT"],
  ["Ivory Coast", "CI"],
  ["Jamaica", "JM"],
  ["Japan", "JP"],
  ["Jordan", "JO"],
  ["Kazakhstan", "KZ"],
  ["Kenya", "KE"],
  ["Kiribati", "KI"],
  ["Kosovo", "XK"],
  ["Kuwait", "KW"],
  ["Kyrgyzstan", "KG"],
  ["Laos", "LA"],
  ["Latvia", "LV"],
  ["Lebanon", "LB"],
  ["Lesotho", "LS"],
  ["Liberia", "LR"],
  ["Libya", "LY"],
  ["Liechtenstein", "LI"],
  ["Lithuania", "LT"],
  ["Luxembourg", "LU"],
  ["Madagascar", "MG"],
  ["Malawi", "MW"],
  ["Malaysia", "MY"],
  ["Maldives", "MV"],
  ["Mali", "ML"],
  ["Malta", "MT"],
  ["Marshall Islands", "MH"],
  ["Mauritania", "MR"],
  ["Mauritius", "MU"],
  ["Mexico", "MX"],
  ["Micronesia", "FM"],
  ["Moldova", "MD"],
  ["Monaco", "MC"],
  ["Mongolia", "MN"],
  ["Montenegro", "ME"],
  ["Morocco", "MA"],
  ["Mozambique", "MZ"],
  ["Myanmar", "MM"],
  ["Namibia", "NA"],
  ["Nauru", "NR"],
  ["Nepal", "NP"],
  ["Netherlands", "NL"],
  ["New Zealand", "NZ"],
  ["Nicaragua", "NI"],
  ["Niger", "NE"],
  ["Nigeria", "NG"],
  ["North Korea", "KP"],
  ["North Macedonia", "MK"],
  ["Norway", "NO"],
  ["Oman", "OM"],
  ["Pakistan", "PK"],
  ["Palau", "PW"],
  ["Palestine", "PS"],
  ["Panama", "PA"],
  ["Papua New Guinea", "PG"],
  ["Paraguay", "PY"],
  ["Peru", "PE"],
  ["Philippines", "PH"],
  ["Poland", "PL"],
  ["Portugal", "PT"],
  ["Qatar", "QA"],
  ["Romania", "RO"],
  ["Russia", "RU"],
  ["Rwanda", "RW"],
  ["Saint Lucia", "LC"],
  ["Samoa", "WS"],
  ["San Marino", "SM"],
  ["Sao Tome and Principe", "ST"],
  ["Saudi Arabia", "SA"],
  ["Senegal", "SN"],
  ["Serbia", "RS"],
  ["Seychelles", "SC"],
  ["Sierra Leone", "SL"],
  ["Singapore", "SG"],
  ["Slovakia", "SK"],
  ["Slovenia", "SI"],
  ["Solomon Islands", "SB"],
  ["Somalia", "SO"],
  ["South Africa", "ZA"],
  ["South Korea", "KR"],
  ["South Sudan", "SS"],
  ["Spain", "ES"],
  ["Sri Lanka", "LK"],
  ["Sudan", "SD"],
  ["Suriname", "SR"],
  ["Sweden", "SE"],
  ["Switzerland", "CH"],
  ["Syria", "SY"],
  ["Taiwan", "TW"],
  ["Tajikistan", "TJ"],
  ["Tanzania", "TZ"],
  ["Thailand", "TH"],
  ["Timor-Leste", "TL"],
  ["Togo", "TG"],
  ["Tonga", "TO"],
  ["Trinidad and Tobago", "TT"],
  ["Tunisia", "TN"],
  ["Turkey", "TR"],
  ["Turkmenistan", "TM"],
  ["Tuvalu", "TV"],
  ["Uganda", "UG"],
  ["Ukraine", "UA"],
  ["United Arab Emirates", "AE"],
  ["United Kingdom", "GB"],
  ["United States", "US"],
  ["Uruguay", "UY"],
  ["Uzbekistan", "UZ"],
  ["Vanuatu", "VU"],
  ["Vatican City", "VA"],
  ["Venezuela", "VE"],
  ["Vietnam", "VN"],
  ["Yemen", "YE"],
  ["Zambia", "ZM"],
  ["Zimbabwe", "ZW"],
];

interface PricingRegion {
  code: string;
  symbol: string;
  tiers: number[];
}

const PRICING_REGIONS: Record<string, PricingRegion> = {
  NG: { code: "NGN", symbol: "₦", tiers: [50, 40, 30, 20, 12] },
  DEFAULT: { code: "USD", symbol: "$", tiers: [0.15, 0.12, 0.1, 0.07, 0.05] },
};

const TIER_CAPS = [5000, 20000, 100000, 500000, 1000000];
const CONTACT_SALES_THRESHOLD = 1000000;

interface BatchRecord {
  id: number;
  product: string;
  qty: number;
  price: number;
}

export function AsemiApp() {
  // Navigation
  const [sitePage, setSitePage] = useState<"home" | "pricing" | "contact">("home");
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [inDashboard, setInDashboard] = useState(false);
  const [dashboardPage, setDashboardPage] = useState<
    "overview" | "products" | "batches" | "codebank" | "billing" | "profile"
  >("overview");

  // Registration form
  const [regCompany, setRegCompany] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [countryListOpen, setCountryListOpen] = useState(false);
  const [hasUploadedCAC, setHasUploadedCAC] = useState(false);

  // Active Company & Region
  const [companyName, setCompanyName] = useState("Dove Care Products Ltd");
  const [currency, setCurrency] = useState<PricingRegion>(PRICING_REGIONS.DEFAULT);

  // Dashboard state
  const [products, setProducts] = useState<string[]>([]);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [prodImgAttached, setProdImgAttached] = useState(false);

  // Batch generation
  const [batchProduct, setBatchProduct] = useState("");
  const [batchQty, setBatchQty] = useState(1000);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [freeUsed, setFreeUsed] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [codesByProduct, setCodesByProduct] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<BatchRecord[]>([]);

  // Mouse cursor lerp
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let animId = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = `${mx}px`;
        dotRef.current.style.top = `${my}px`;
      }
    };

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.left = `${rx}px`;
        ringRef.current.style.top = `${ry}px`;
      }
      animId = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  const formatMoney = (n: number) => {
    return currency.symbol + (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2));
  };

  const getTiers = () => {
    return TIER_CAPS.map((cap, i) => ({ upTo: cap, rate: currency.tiers[i] }));
  };

  const calcPrice = (qty: number) => {
    let remaining = qty;
    const free = Math.min(remaining, Math.max(0, 20 - freeUsed));
    remaining -= free;
    const paidPosition = totalGenerated - freeUsed;
    let price = 0;
    const breakdown: { qty: number; rate: number }[] = [];
    let pos = paidPosition;
    let rem = remaining;

    for (const tier of getTiers()) {
      if (rem <= 0) break;
      const cap = tier.upTo - pos;
      if (cap <= 0) continue;
      const inBracket = Math.min(rem, cap);
      price += inBracket * tier.rate;
      breakdown.push({ qty: inBracket, rate: tier.rate });
      rem -= inBracket;
      pos += inBracket;
    }

    return {
      price,
      free,
      breakdown,
      overThreshold: paidPosition + (qty - free) > CONTACT_SALES_THRESHOLD,
    };
  };

  const {
    price: calcCost,
    free: calcFree,
    breakdown: calcBreakdown,
    overThreshold,
  } = calcPrice(batchQty || 0);

  const handleEnterDashboard = (fromSignup = false) => {
    if (fromSignup && !selectedCountry) {
      alert("Please select your country — this sets your pricing region.");
      return;
    }
    if (fromSignup && regCompany.trim()) {
      setCompanyName(regCompany.trim());
    }
    if (fromSignup && selectedCountry) {
      const reg = PRICING_REGIONS[selectedCountry.code] || PRICING_REGIONS.DEFAULT;
      setCurrency(reg);
    }
    setShowAuthScreen(false);
    setInDashboard(true);
    setDashboardPage("overview");
  };

  const handleExitDashboard = () => {
    setInDashboard(false);
    setShowAuthScreen(false);
    setSitePage("home");
  };

  const handleAddProduct = () => {
    const name = newProdName.trim();
    if (!name) return;
    setProducts((prev) => [...prev, name]);
    if (!batchProduct) {
      setBatchProduct(name);
    }
    setNewProdName("");
    setNewProdCat("");
    setNewProdDesc("");
    setProdImgAttached(false);
  };

  const handleGenerateBatch = () => {
    if (!batchProduct || batchProduct === "Select a product…" || batchQty <= 0) {
      alert("Please choose a product and enter a valid quantity.");
      return;
    }

    const { price, free } = calcPrice(batchQty);
    const newBatchId = batches.length + 1;
    const newBatch: BatchRecord = {
      id: newBatchId,
      product: batchProduct,
      qty: batchQty,
      price,
    };

    setFreeUsed((prev) => prev + free);
    setTotalGenerated((prev) => prev + batchQty);
    setTotalSpent((prev) => prev + price);
    setCodesByProduct((prev) => ({
      ...prev,
      [batchProduct]: (prev[batchProduct] || 0) + batchQty,
    }));
    setBatches((prev) => [...prev, newBatch]);

    alert(
      `Batch generated: ${batchQty.toLocaleString()} codes for ${batchProduct} — ${formatMoney(
        price,
      )} charged.`,
    );
  };

  const currentRateString = () => {
    const paidSoFar = totalGenerated - freeUsed;
    if (paidSoFar > CONTACT_SALES_THRESHOLD) return "Let's talk";
    if (paidSoFar > 500000) return formatMoney(currency.tiers[4]);
    if (paidSoFar > 100000) return formatMoney(currency.tiers[3]);
    if (paidSoFar > 20000) return formatMoney(currency.tiers[2]);
    if (paidSoFar > 5000) return formatMoney(currency.tiers[1]);
    return formatMoney(currency.tiers[0]);
  };

  const filteredCountries = countryQuery.trim()
    ? COUNTRIES.filter(([c]) => c.toLowerCase().includes(countryQuery.trim().toLowerCase()))
    : COUNTRIES;

  const labels = [
    "Codes 1 – 5,000",
    "Codes 5,001 – 20,000",
    "Codes 20,001 – 100,000",
    "Codes 100,001 – 500,000",
    "Codes 500,001 – 1,000,000",
  ];

  return (
    <div className="asemi-root text-[#2b2b32] bg-white font-sans min-h-screen relative selection:bg-[#c9a84c] selection:text-white">
      {/* Embedded Styles matching the original project */}
      <style>{`
        .asemi-root {
          --white: #ffffff;
          --offwhite: #fafaf8;
          --linen: #f5f0e8;
          --cream1: #ede8df;
          --cream2: #e8e2d9;
          --card: #f0ece4;
          --hover: #ede8df;
          --divider: #e0dbd2;
          --gold: #c9a84c;
          --gold-deep: #b8962e;
          --charcoal: #1a1a1e;
          --body: #2b2b32;
          --label: #6e6e7a;
          --secondary: #45454f;
          --red: #c0392b;
          --amber: #d4830a;
          --green: #2e8b57;
          font-family: 'Inter', sans-serif;
        }
        .asemi-mono {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          font-size: 10px;
          color: var(--label);
          text-transform: uppercase;
          font-weight: 500;
        }
        .asemi-rule {
          width: 28px;
          height: 1px;
          background: var(--gold);
          display: inline-block;
          margin-right: 10px;
          vertical-align: middle;
        }
        .hex-logo {
          width: 26px;
          height: 26px;
          background: var(--charcoal);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .asemi-btn-fill {
          background: var(--charcoal);
          color: var(--linen);
          position: relative;
          overflow: hidden;
          padding: 13px 28px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .asemi-btn-fill span {
          position: relative;
          z-index: 2;
        }
        .asemi-btn-fill::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--gold-deep);
          transform: translateY(101%);
          transition: transform 0.35s ease;
          z-index: 1;
        }
        .asemi-btn-fill:hover::before {
          transform: translateY(0);
        }
        .asemi-btn-ghost {
          border: 1px solid var(--charcoal);
          color: var(--charcoal);
          padding: 13px 28px;
          font-size: 13px;
          font-weight: 600;
          position: relative;
          transition: background 0.2s;
        }
        .asemi-btn-ghost:hover {
          background: rgba(26,26,30,0.04);
        }
        .asemi-btn-sm {
          padding: 9px 18px;
          font-size: 12px;
        }
        #cursor-dot {
          position: fixed;
          width: 6px;
          height: 6px;
          background: #1a1a1e;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        }
        #cursor-ring {
          position: fixed;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(26,26,30,0.22);
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        }
        @media (hover: none) {
          #cursor-dot, #cursor-ring { display: none; }
        }
      `}</style>

      {/* SVG Grain Filter */}
      <svg
        id="grain"
        className="fixed inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply z-10 w-full h-full"
      >
        <filter id="asemi-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#asemi-noise)" />
      </svg>

      {/* Custom Cursor */}
      <div ref={dotRef} id="cursor-dot" />
      <div ref={ringRef} id="cursor-ring" />

      {/* ===================================== */}
      {/* 1. MARKETING SITE                     */}
      {/* ===================================== */}
      {!inDashboard && !showAuthScreen && (
        <div id="site" className="min-h-screen">
          {/* Top Navigation */}
          <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e0dbd2]">
            <div className="max-w-[1180px] mx-auto px-6 sm:px-10 h-[78px] flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setSitePage("home")}
              >
                <div className="hex-logo">
                  <span className="text-white text-sm font-bold">a</span>
                </div>
                <div className="text-[21px] font-bold text-[#1a1a1e] tracking-tight">Asemi</div>
              </div>

              <div className="hidden md:flex items-center gap-9">
                <button
                  onClick={() => setSitePage("home")}
                  className="asemi-mono hover:text-[#1a1a1e] transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setSitePage("home");
                    setTimeout(() => {
                      document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }}
                  className="asemi-mono hover:text-[#1a1a1e] transition-colors"
                >
                  The Problem
                </button>
                <button
                  onClick={() => {
                    setSitePage("home");
                    setTimeout(() => {
                      document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }}
                  className="asemi-mono hover:text-[#1a1a1e] transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => setSitePage("pricing")}
                  className="asemi-mono hover:text-[#1a1a1e] transition-colors"
                >
                  Pricing
                </button>
                <button
                  onClick={() => setSitePage("contact")}
                  className="asemi-mono hover:text-[#1a1a1e] transition-colors"
                >
                  Contact
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="asemi-btn-ghost asemi-btn-sm"
                  onClick={() => {
                    setAuthTab("login");
                    setShowAuthScreen(true);
                  }}
                >
                  <span>Log In</span>
                </button>
                <button
                  className="asemi-btn-fill asemi-btn-sm"
                  onClick={() => {
                    setAuthTab("signup");
                    setShowAuthScreen(true);
                  }}
                >
                  <span>Register Company</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Site Page: Home */}
          {sitePage === "home" && (
            <div>
              {/* Hero */}
              <header className="pt-24 pb-20 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="flex items-center mb-7">
                    <span className="asemi-rule" />
                    <span className="asemi-mono">Product Authentication, Made Simple</span>
                  </div>
                  <h1 className="text-[42px] sm:text-[64px] lg:text-[84px] font-bold text-[#1a1a1e] leading-[1.02] tracking-tight max-w-[920px]">
                    Prove it&apos;s <em className="not-italic text-[#b8962e]">real</em>,
                    <br />
                    before they buy it.
                  </h1>

                  <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 mt-12 items-end">
                    <div>
                      <p className="text-lg text-[#45454f] max-w-[480px] leading-relaxed">
                        Every product you make gets a unique code. Every customer can check it in
                        seconds — no app, just their phone camera. Asemi gives manufacturers a way
                        to fight counterfeits without asking customers to do anything new.
                      </p>
                      <div className="flex flex-wrap gap-4 mt-9">
                        <button
                          className="asemi-btn-fill"
                          onClick={() => {
                            setAuthTab("signup");
                            setShowAuthScreen(true);
                          }}
                        >
                          <span>Register Your Company</span>
                        </button>
                        <button
                          className="asemi-btn-ghost"
                          onClick={() => {
                            document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          <span>See How It Works</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-6 lg:border-l lg:border-[#e0dbd2] lg:pl-8">
                      <div>
                        <div className="text-[38px] font-bold text-[#1a1a1e] tracking-tight">
                          {formatMoney(currency.tiers[0])}
                        </div>
                        <div className="asemi-mono mt-1">per code, from your 1st batch</div>
                      </div>
                      <div>
                        <div className="text-[38px] font-bold text-[#1a1a1e] tracking-tight">
                          20
                        </div>
                        <div className="asemi-mono mt-1">free codes on registration</div>
                      </div>
                      <div>
                        <div className="text-[38px] font-bold text-[#1a1a1e] tracking-tight">0</div>
                        <div className="asemi-mono mt-1">apps a customer needs to install</div>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* The Problem Section */}
              <section id="problem" className="py-24 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="max-w-[640px] mb-16">
                    <div className="flex items-center mb-4">
                      <span className="asemi-rule" />
                      <span className="asemi-mono">The Problem</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e] tracking-tight">
                      Counterfeiters copy the packaging. They can&apos;t copy the code.
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e0dbd2] border border-[#e0dbd2]">
                    <div className="bg-white p-8 sm:p-10">
                      <span className="font-mono text-xs font-semibold text-[#b8962e] mb-4 block">
                        i.
                      </span>
                      <h3 className="font-semibold text-lg text-[#1a1a1e] mb-3">
                        Look-alike products are everywhere
                      </h3>
                      <p className="text-[14.5px] text-[#45454f] leading-relaxed">
                        Fake soap, toothpaste, and household goods circulate across markets in
                        packaging nearly identical to the original — and there&apos;s little a
                        manufacturer can do at the point of sale.
                      </p>
                    </div>

                    <div className="bg-white p-8 sm:p-10">
                      <span className="font-mono text-xs font-semibold text-[#b8962e] mb-4 block">
                        ii.
                      </span>
                      <h3 className="font-semibold text-lg text-[#1a1a1e] mb-3">
                        Customers have no way to check
                      </h3>
                      <p className="text-[14.5px] text-[#45454f] leading-relaxed">
                        Without a verification method, a buyer has to trust the label, the seller,
                        or the price — none of which reliably tell them whether what&apos;s in their
                        hand is genuine.
                      </p>
                    </div>

                    <div className="bg-white p-8 sm:p-10">
                      <span className="font-mono text-xs font-semibold text-[#b8962e] mb-4 block">
                        iii.
                      </span>
                      <h3 className="font-semibold text-lg text-[#1a1a1e] mb-3">
                        Trust erodes the brand, not just the sale
                      </h3>
                      <p className="text-[14.5px] text-[#45454f] leading-relaxed">
                        Every fake bottle sold under a real brand&apos;s name damages that
                        brand&apos;s reputation — even though the manufacturer never made or
                        profited from it.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* How It Works Section */}
              <section id="how" className="py-24 border-b border-[#e0dbd2] bg-[#fafaf8]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="max-w-[640px] mb-16">
                    <div className="flex items-center mb-4">
                      <span className="asemi-rule" />
                      <span className="asemi-mono">How It Works</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e] tracking-tight">
                      From production line to a customer&apos;s phone.
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6 relative">
                    <div className="relative pr-6">
                      <span className="font-mono text-xs text-[#b8962e] tracking-wider mb-4 block">
                        01
                      </span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        Register &amp; verify
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Your company signs up and submits proof of ownership for your product line.
                        We confirm you are who you say you are before anything goes live.
                      </p>
                    </div>

                    <div className="relative pr-6">
                      <span className="font-mono text-xs text-[#b8962e] tracking-wider mb-4 block">
                        02
                      </span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        List your product
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Add your product&apos;s details and images once — name, description,
                        category — so every code links back to genuine information.
                      </p>
                    </div>

                    <div className="relative pr-6">
                      <span className="font-mono text-xs text-[#b8962e] tracking-wider mb-4 block">
                        03
                      </span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        Generate a batch
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Tell us how many units you produced. We generate that many unique codes as
                        QR labels, ready to print and apply.
                      </p>
                    </div>

                    <div className="relative pr-6">
                      <span className="font-mono text-xs text-[#b8962e] tracking-wider mb-4 block">
                        04
                      </span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        Customers verify instantly
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        A phone camera scan — or typing the code into a browser — shows the customer
                        your product&apos;s real information, in seconds.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Pricing Teaser Section */}
              <section id="pricing" className="py-24 border-b border-[#e0dbd2] bg-[#fafaf8]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="max-w-[640px] mb-8">
                    <div className="flex items-center mb-4">
                      <span className="asemi-rule" />
                      <span className="asemi-mono">Pricing</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e] tracking-tight">
                      Pay only for the codes you generate.
                    </h2>
                  </div>

                  <div>
                    <p className="text-base text-[#45454f] max-w-[520px] mb-7 leading-relaxed">
                      Progressive, volume-based pricing — every company starts with 20 free codes,
                      and rates drop automatically the more you produce.
                    </p>
                    <button className="asemi-btn-fill" onClick={() => setSitePage("pricing")}>
                      <span>See Full Pricing</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Site Page: Pricing */}
          {sitePage === "pricing" && (
            <div>
              <div className="py-20 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="flex items-center mb-4">
                    <span className="asemi-rule" />
                    <span className="asemi-mono">Pricing</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-normal text-[#1a1a1e] max-w-[760px] leading-tight">
                    Pay only for the codes you generate.
                  </h1>
                  <p className="text-base text-[#45454f] max-w-[560px] mt-5 leading-relaxed">
                    No subscriptions, no monthly minimums. Pricing is progressive, like a tax
                    bracket — the rate drops automatically as your lifetime volume grows.
                  </p>
                </div>
              </div>

              <section className="py-20 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="border border-[#e0dbd2]">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[#f0ece4] border-b border-[#e0dbd2] p-5 font-mono text-[10px] uppercase text-[#6e6e7a] tracking-wider">
                      <div>Volume Band</div>
                      <div>Rate per Code</div>
                      <div>Example</div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-[#e0dbd2] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 1 – 5,000</div>
                      <div className="font-mono text-[#b8962e]">
                        {formatMoney(currency.tiers[0])}
                      </div>
                      <div className="text-sm text-[#45454f]">
                        1,000 codes = {formatMoney(1000 * currency.tiers[0])}
                      </div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-[#e0dbd2] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 5,001 – 20,000</div>
                      <div className="font-mono text-[#b8962e]">
                        {formatMoney(currency.tiers[1])}
                      </div>
                      <div className="text-sm text-[#45454f]">10,000th code onward</div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-[#e0dbd2] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 20,001 – 100,000</div>
                      <div className="font-mono text-[#b8962e]">
                        {formatMoney(currency.tiers[2])}
                      </div>
                      <div className="text-sm text-[#45454f]">Growing production runs</div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-[#e0dbd2] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 100,001 – 500,000</div>
                      <div className="font-mono text-[#b8962e]">
                        {formatMoney(currency.tiers[3])}
                      </div>
                      <div className="text-sm text-[#45454f]">Large-scale manufacturing</div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-[#e0dbd2] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 500,001 – 1,000,000</div>
                      <div className="font-mono text-[#b8962e]">
                        {formatMoney(currency.tiers[4])}
                      </div>
                      <div className="text-sm text-[#45454f]">Mass-market production</div>
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] p-5 items-center">
                      <div className="text-lg text-[#1a1a1e]">Codes 1,000,001+</div>
                      <div className="font-mono text-[#b8962e]">Let&apos;s talk</div>
                      <div className="text-sm text-[#45454f]">Custom volume pricing</div>
                    </div>
                  </div>

                  <p className="mt-5 text-[13.5px] text-[#45454f] flex items-start gap-2">
                    <span className="asemi-rule mt-1.5" />
                    <span>
                      Every company starts with 20 free codes, and generated codes never expire or
                      go to waste — reprint them anytime from your dashboard. Producing beyond a
                      million units?{" "}
                      <button
                        onClick={() => setSitePage("contact")}
                        className="text-[#b8962e] border-b border-[#b8962e] cursor-pointer"
                      >
                        Get in touch
                      </button>{" "}
                      for volume pricing built around your production scale.
                    </span>
                  </p>
                </div>
              </section>

              <section className="py-20 border-b border-[#e0dbd2] bg-[#fafaf8]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="max-w-[640px] mb-10">
                    <div className="flex items-center mb-4">
                      <span className="asemi-rule" />
                      <span className="asemi-mono">Included at every tier</span>
                    </div>
                    <h2 className="text-3xl font-bold text-[#1a1a1e]">
                      What every company gets, regardless of volume.
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e0dbd2] border border-[#e0dbd2]">
                    <div className="bg-white p-8">
                      <span className="font-mono text-xs text-[#b8962e] block mb-3">i.</span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        No app for your customers
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Verification runs entirely in the browser — a native camera scan or a typed
                        code, nothing to install.
                      </p>
                    </div>
                    <div className="bg-white p-8">
                      <span className="font-mono text-xs text-[#b8962e] block mb-3">ii.</span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        Codes never expire
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Every code you pay for lives in your dashboard permanently, ready to
                        re-export or reprint at no extra cost.
                      </p>
                    </div>
                    <div className="bg-white p-8">
                      <span className="font-mono text-xs text-[#b8962e] block mb-3">iii.</span>
                      <h3 className="font-semibold text-base text-[#1a1a1e] mb-2">
                        Verified business review
                      </h3>
                      <p className="text-sm text-[#45454f] leading-relaxed">
                        Every company on Asemi is checked against its registration and ownership
                        documents before going live.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Site Page: Contact */}
          {sitePage === "contact" && (
            <div>
              <div className="py-20 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
                  <div className="flex items-center mb-4">
                    <span className="asemi-rule" />
                    <span className="asemi-mono">Contact</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-normal text-[#1a1a1e] max-w-[760px] leading-tight">
                    Let&apos;s talk about your production line.
                  </h1>
                  <p className="text-base text-[#45454f] max-w-[560px] mt-5 leading-relaxed">
                    Questions about onboarding, volume pricing above 1,000,000 codes, or anything
                    else — reach out and our team will get back to you.
                  </p>
                </div>
              </div>

              <section className="py-20 border-b border-[#e0dbd2]">
                <div className="max-w-[1180px] mx-auto px-6 sm:px-10 grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div>
                    <div className="flex gap-5 py-6 border-b border-[#e0dbd2]">
                      <div className="asemi-mono text-[#b8962e] w-24 shrink-0 pt-0.5">Email</div>
                      <div>
                        <div className="text-base text-[#1a1a1e] font-medium">hello@asemi.app</div>
                        <div className="text-xs text-[#45454f] mt-1">
                          General enquiries &amp; support
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-5 py-6 border-b border-[#e0dbd2]">
                      <div className="asemi-mono text-[#b8962e] w-24 shrink-0 pt-0.5">Sales</div>
                      <div>
                        <div className="text-base text-[#1a1a1e] font-medium">sales@asemi.app</div>
                        <div className="text-xs text-[#45454f] mt-1">
                          Volume pricing &amp; enterprise onboarding
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-5 py-6 border-b border-[#e0dbd2]">
                      <div className="asemi-mono text-[#b8962e] w-24 shrink-0 pt-0.5">Phone</div>
                      <div>
                        <div className="text-base text-[#1a1a1e] font-medium">
                          +1 (000) 000 0000
                        </div>
                        <div className="text-xs text-[#45454f] mt-1">Mon–Fri, 9am–5pm</div>
                      </div>
                    </div>
                    <div className="flex gap-5 py-6 border-b border-[#e0dbd2]">
                      <div className="asemi-mono text-[#b8962e] w-24 shrink-0 pt-0.5">Office</div>
                      <div>
                        <div className="text-base text-[#1a1a1e] font-medium">By appointment</div>
                        <div className="text-xs text-[#45454f] mt-1">Remote-first team</div>
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      alert("Thanks — we'll be in touch shortly.");
                    }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="asemi-mono block mb-2">Full Name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        className="w-full p-3.5 border border-[#e0dbd2] bg-white text-sm outline-none focus:border-[#b8962e]"
                        required
                      />
                    </div>
                    <div>
                      <label className="asemi-mono block mb-2">Company</label>
                      <input
                        type="text"
                        placeholder="Your company"
                        className="w-full p-3.5 border border-[#e0dbd2] bg-white text-sm outline-none focus:border-[#b8962e]"
                        required
                      />
                    </div>
                    <div>
                      <label className="asemi-mono block mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        className="w-full p-3.5 border border-[#e0dbd2] bg-white text-sm outline-none focus:border-[#b8962e]"
                        required
                      />
                    </div>
                    <div>
                      <label className="asemi-mono block mb-2">Message</label>
                      <textarea
                        placeholder="Tell us about your production volume and what you need…"
                        className="w-full p-3.5 border border-[#e0dbd2] bg-white text-sm outline-none focus:border-[#b8962e] min-h-[120px]"
                        required
                      />
                    </div>
                    <button type="submit" className="asemi-btn-fill">
                      <span>Send Message</span>
                    </button>
                  </form>
                </div>
              </section>
            </div>
          )}

          {/* Footer */}
          <footer className="py-16 border-t border-[#e0dbd2]">
            <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
              <div className="flex flex-wrap justify-between items-start gap-8">
                <div className="flex items-center gap-3">
                  <div className="hex-logo">
                    <span className="text-white text-sm font-bold">a</span>
                  </div>
                  <div className="text-xl font-bold text-[#1a1a1e]">Asemi</div>
                </div>
                <div className="asemi-mono text-xs">Built for global manufacturers</div>
                <div className="asemi-mono text-xs">Product Authentication Platform</div>
              </div>
              <div className="mt-14 pt-6 border-t border-[#e0dbd2] flex justify-between asemi-mono text-[10px]">
                <span>&copy; 2026 ASEMI</span>
                <span>PRODUCT AUTHENTICATION PLATFORM</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ===================================== */}
      {/* 2. AUTH MODAL / SCREEN                */}
      {/* ===================================== */}
      {showAuthScreen && !inDashboard && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafaf8]">
          <div className="w-full max-w-[440px] bg-white border border-[#e0dbd2] p-10 sm:p-12 shadow-sm">
            <div
              className="flex items-center gap-3 mb-8 cursor-pointer select-none"
              onClick={() => setShowAuthScreen(false)}
            >
              <div className="hex-logo">
                <span className="text-white text-sm font-bold">a</span>
              </div>
              <div className="text-xl font-bold text-[#1a1a1e]">Asemi</div>
            </div>

            <div className="flex border border-[#e0dbd2] mb-8">
              <button
                className={`flex-1 py-3 text-center asemi-mono transition-colors ${
                  authTab === "login" ? "bg-[#1a1a1e] text-[#f5f0e8]" : "text-[#6e6e7a]"
                }`}
                onClick={() => setAuthTab("login")}
              >
                Log In
              </button>
              <button
                className={`flex-1 py-3 text-center asemi-mono transition-colors ${
                  authTab === "signup" ? "bg-[#1a1a1e] text-[#f5f0e8]" : "text-[#6e6e7a]"
                }`}
                onClick={() => setAuthTab("signup")}
              >
                Register Company
              </button>
            </div>

            {authTab === "login" ? (
              <div>
                <h2 className="text-2xl font-bold text-[#1a1a1e] mb-2">Welcome back</h2>
                <div className="text-sm text-[#45454f] mb-8">
                  Log in to manage your products and codes.
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="asemi-mono block mb-2">Email or Phone Number</label>
                    <input
                      type="text"
                      placeholder="you@company.com"
                      defaultValue="company@dovecare.com"
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>
                  <div>
                    <label className="asemi-mono block mb-2">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      defaultValue="password123"
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>
                  <button
                    className="asemi-btn-fill w-full text-center"
                    onClick={() => handleEnterDashboard(false)}
                  >
                    <span>Log In</span>
                  </button>
                </div>
                <div className="mt-6 text-center text-xs text-[#45454f]">
                  New here?{" "}
                  <button
                    onClick={() => setAuthTab("signup")}
                    className="text-[#b8962e] border-b border-[#b8962e] font-medium"
                  >
                    Register your company
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-[#1a1a1e] mb-2">Register your company</h2>
                <div className="text-sm text-[#45454f] mb-7">
                  We&apos;ll verify your business before you can list products.
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="asemi-mono block mb-1.5">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dove Care Products Ltd"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>

                  <div className="relative">
                    <label className="asemi-mono block mb-1.5">Country</label>
                    <input
                      type="text"
                      placeholder="Search for your country…"
                      value={countryQuery}
                      onChange={(e) => {
                        setCountryQuery(e.target.value);
                        setCountryListOpen(true);
                      }}
                      onFocus={() => setCountryListOpen(true)}
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                    {countryListOpen && (
                      <div className="absolute top-full left-0 right-0 max-h-56 overflow-y-auto bg-white border border-[#e0dbd2] z-50 shadow-lg mt-1">
                        {filteredCountries.length === 0 ? (
                          <div className="p-3 text-xs text-[#6e6e7a]">No countries match</div>
                        ) : (
                          filteredCountries.slice(0, 40).map(([name, code]) => (
                            <div
                              key={code}
                              className="p-2.5 text-xs text-[#2b2b32] hover:bg-[#f0ece4] cursor-pointer flex justify-between items-center"
                              onClick={() => {
                                setSelectedCountry({ name, code });
                                setCountryQuery(name);
                                setCountryListOpen(false);
                              }}
                            >
                              <span>{name}</span>
                              <span className="font-mono text-[10px] text-[#6e6e7a]">{code}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="asemi-mono block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+234 800 000 0000"
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>

                  <div>
                    <label className="asemi-mono block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="company@email.com"
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>

                  <div>
                    <label className="asemi-mono block mb-1.5">
                      CAC / Business Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="RC 1234567"
                      className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                    />
                  </div>

                  <div>
                    <label className="asemi-mono block mb-1.5">Proof of Product Ownership</label>
                    <div
                      onClick={() => setHasUploadedCAC(true)}
                      className={`border border-dashed p-4 text-center text-xs cursor-pointer transition-colors ${
                        hasUploadedCAC
                          ? "border-[#2e8b57] text-[#2e8b57] bg-[#2e8b57]/5 font-medium"
                          : "border-[#e0dbd2] text-[#6e6e7a] hover:bg-[#f0ece4]"
                      }`}
                    >
                      {hasUploadedCAC
                        ? "✓ Document attached — CAC_Certificate.pdf"
                        : "Upload registration certificate or brand ownership document"}
                    </div>
                  </div>

                  <button
                    className="asemi-btn-fill w-full text-center mt-2"
                    onClick={() => handleEnterDashboard(true)}
                  >
                    <span>Submit for Verification</span>
                  </button>
                </div>
                <div className="mt-5 text-center text-xs text-[#45454f]">
                  Already registered?{" "}
                  <button
                    onClick={() => setAuthTab("login")}
                    className="text-[#b8962e] border-b border-[#b8962e] font-medium"
                  >
                    Log in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* 3. DASHBOARD APPLICATION              */}
      {/* ===================================== */}
      {inDashboard && (
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-[#fafaf8] border-r border-[#e0dbd2] p-7 flex flex-col shrink-0">
            <div
              className="flex items-center gap-3 mb-10 cursor-pointer select-none"
              onClick={handleExitDashboard}
            >
              <div className="hex-logo">
                <span className="text-white text-sm font-bold">a</span>
              </div>
              <div className="text-xl font-bold text-[#1a1a1e]">Asemi</div>
            </div>

            <nav className="flex flex-col gap-1">
              {[
                ["overview", "Overview"],
                ["products", "Products"],
                ["batches", "Generate Codes"],
                ["codebank", "Code Bank"],
                ["billing", "Billing"],
                ["profile", "Company Profile"],
              ].map(([pageKey, label]) => (
                <button
                  key={pageKey}
                  onClick={() =>
                    setDashboardPage(
                      pageKey as
                        "overview" | "products" | "batches" | "codebank" | "billing" | "profile",
                    )
                  }
                  className={`text-left py-2.5 px-3 asemi-mono transition-all border-l-2 ${
                    dashboardPage === pageKey
                      ? "text-[#1a1a1e] border-l-[#c9a84c] bg-[#ede8df]"
                      : "text-[#6e6e7a] border-l-transparent hover:bg-[#ede8df] hover:text-[#1a1a1e]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-[#e0dbd2]">
              <div className="text-sm font-semibold text-[#1a1a1e] truncate">{companyName}</div>
              <div className="asemi-mono text-[9px] text-[#b8962e] mt-1">PENDING VERIFICATION</div>
              <button
                onClick={handleExitDashboard}
                className="mt-4 asemi-mono text-[10px] text-[#6e6e7a] hover:text-[#c0392b] block"
              >
                ← Back to site
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-8 sm:p-12 max-w-[1100px]">
            {/* OVERVIEW */}
            {dashboardPage === "overview" && (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Overview</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">A snapshot of your account.</div>

                <div className="border border-[#d4830a] bg-[#d4830a]/10 p-4 sm:p-5 flex items-center gap-4 mb-9">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4830a] shrink-0" />
                  <p className="text-[13.5px] text-[#2b2b32]">
                    <strong className="text-[#1a1a1e]">
                      Your account is pending verification.
                    </strong>{" "}
                    We&apos;re reviewing your registration documents. You&apos;ll be able to list
                    products and generate codes once approved — usually within 1–2 business days.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#e0dbd2] border border-[#e0dbd2] mb-12">
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Products Listed</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">{products.length}</div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Codes Generated</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">
                      {totalGenerated.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Free Codes Left</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">
                      {Math.max(0, 20 - freeUsed)}
                    </div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Scans This Month</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">0</div>
                  </div>
                </div>

                <div className="border border-[#e0dbd2] bg-white">
                  <div className="p-5 border-b border-[#e0dbd2] font-semibold text-[#1a1a1e]">
                    Getting started
                  </div>
                  <div className="p-5">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-[#e0dbd2]">
                          <td className="py-3 w-10">
                            <span className="px-2 py-0.5 font-mono text-xs bg-[#d4830a]/10 text-[#d4830a] border border-[#d4830a]/30">
                              1
                            </span>
                          </td>
                          <td className="py-3 text-[#2b2b32]">
                            Submit your business documents for verification
                          </td>
                          <td className="py-3 text-right">
                            <span className="px-2.5 py-0.5 font-mono text-[10px] bg-[#d4830a]/10 text-[#d4830a] border border-[#d4830a]/30">
                              In review
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-[#e0dbd2]">
                          <td className="py-3">
                            <span className="px-2 py-0.5 font-mono text-xs bg-[#ede8df] text-[#6e6e7a]">
                              2
                            </span>
                          </td>
                          <td className="py-3 text-[#2b2b32]">List your first product</td>
                          <td className="py-3 text-right">
                            <span className="px-2.5 py-0.5 font-mono text-[10px] bg-[#ede8df] text-[#6e6e7a]">
                              {products.length > 0 ? "Done" : "Ready"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3">
                            <span className="px-2 py-0.5 font-mono text-xs bg-[#ede8df] text-[#6e6e7a]">
                              3
                            </span>
                          </td>
                          <td className="py-3 text-[#2b2b32]">
                            Generate your first batch of codes
                          </td>
                          <td className="py-3 text-right">
                            <span className="px-2.5 py-0.5 font-mono text-[10px] bg-[#ede8df] text-[#6e6e7a]">
                              {batches.length > 0 ? "Completed" : "Ready"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {dashboardPage === "products" && (
              <div>
                <div className="mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Products</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">
                  List the products you want to protect with verification codes.
                </div>

                <div className="border border-[#e0dbd2] bg-white mb-8">
                  <div className="p-5 border-b border-[#e0dbd2] font-semibold text-[#1a1a1e]">
                    Add a new product
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="asemi-mono block mb-2">Product Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Herbal Care Antiseptic Soap"
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div>
                        <label className="asemi-mono block mb-2">Category</label>
                        <input
                          type="text"
                          placeholder="e.g. Personal Care"
                          value={newProdCat}
                          onChange={(e) => setNewProdCat(e.target.value)}
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="asemi-mono block mb-2">Description</label>
                        <input
                          type="text"
                          placeholder="Short description customers will see on the verification page"
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="asemi-mono block mb-2">Product Images</label>
                        <div
                          onClick={() => setProdImgAttached(true)}
                          className={`border border-dashed p-5 text-center text-xs cursor-pointer transition-colors ${
                            prodImgAttached
                              ? "border-[#2e8b57] text-[#2e8b57] bg-[#2e8b57]/5 font-medium"
                              : "border-[#e0dbd2] text-[#6e6e7a] hover:bg-[#f0ece4]"
                          }`}
                        >
                          {prodImgAttached
                            ? "✓ Images attached"
                            : "Upload front, back, and label images"}
                        </div>
                      </div>
                    </div>
                    <button className="asemi-btn-fill" onClick={handleAddProduct}>
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                <div className="border border-[#e0dbd2] bg-white">
                  <div className="p-5 border-b border-[#e0dbd2] font-semibold text-[#1a1a1e]">
                    Your products
                  </div>
                  <div className="p-6">
                    {products.length === 0 ? (
                      <div className="text-center py-12 text-[#6e6e7a]">
                        <span className="text-xl font-medium text-[#1a1a1e] block mb-2">
                          No products yet
                        </span>
                        <p className="text-sm">
                          Products you list will appear here, ready for code generation.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e0dbd2] text-left">
                            <th className="py-2.5 asemi-mono">Product</th>
                            <th className="py-2.5 asemi-mono">Codes Generated</th>
                            <th className="py-2.5 asemi-mono">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => (
                            <tr key={p} className="border-b border-[#e0dbd2] last:border-none">
                              <td className="py-3 font-medium text-[#1a1a1e]">{p}</td>
                              <td className="py-3 font-mono">{codesByProduct[p] || 0}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 font-mono text-[10px] bg-[#ede8df] text-[#6e6e7a]">
                                  Ready
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* BATCHES / PRICING CALCULATOR */}
            {dashboardPage === "batches" && (
              <div>
                <div className="mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Generate Codes</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">
                  Enter how many units you produced — pricing applies automatically by volume band.
                </div>

                <div className="border border-[#e0dbd2] bg-white p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <div className="mb-5">
                        <label className="asemi-mono block mb-2">Product</label>
                        <select
                          value={batchProduct}
                          onChange={(e) => setBatchProduct(e.target.value)}
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e] bg-white"
                        >
                          <option value="">Select a product…</option>
                          {products.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <input
                          type="number"
                          value={batchQty}
                          min={1}
                          onChange={(e) => setBatchQty(parseInt(e.target.value) || 0)}
                          className="w-40 p-3 border border-[#e0dbd2] text-xl font-semibold outline-none focus:border-[#b8962e]"
                        />
                        <span className="asemi-mono text-xs">codes</span>
                      </div>

                      <p className="text-xs text-[#45454f] leading-relaxed">
                        Codes are generated as QR labels with a text fallback. Every code you pay
                        for stays in your Code Bank permanently — reprint anytime at no extra cost.
                      </p>
                    </div>

                    <div>
                      <div className="bg-[#f0ece4] border border-[#e0dbd2] p-6">
                        {overThreshold ? (
                          <div className="text-center py-3">
                            <div className="text-lg font-semibold text-[#1a1a1e] mb-2">
                              Custom volume pricing
                            </div>
                            <p className="text-xs text-[#45454f] leading-relaxed">
                              Requests above 1,000,000 lifetime codes are priced individually around
                              your production scale. Reach out and our team will get back to you
                              with a quote.
                            </p>
                          </div>
                        ) : (
                          <div>
                            {calcFree > 0 && (
                              <div className="flex justify-between text-xs text-[#2e8b57] py-2 border-b border-[#e8e2d9]">
                                <span>Free codes applied</span>
                                <span className="font-mono">{calcFree}</span>
                              </div>
                            )}
                            {calcBreakdown.map((b, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs text-[#45454f] py-2 border-b border-[#e8e2d9]"
                              >
                                <span>
                                  {b.qty.toLocaleString()} codes @ {formatMoney(b.rate)}
                                </span>
                                <span className="font-mono">{formatMoney(b.qty * b.rate)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-semibold text-[#1a1a1e] pt-3.5 border-t border-[#1a1a1e] mt-2">
                              <span>Total</span>
                              <span className="font-mono">{formatMoney(calcCost)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        className="asemi-btn-fill w-full text-center mt-5"
                        onClick={
                          overThreshold
                            ? () =>
                                alert(
                                  "Thanks — a member of our team will reach out shortly to discuss custom pricing for your volume.",
                                )
                            : handleGenerateBatch
                        }
                      >
                        <span>{overThreshold ? "Request a Quote" : "Generate & Pay"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CODE BANK */}
            {dashboardPage === "codebank" && (
              <div>
                <div className="mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Code Bank</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">
                  Every code you&apos;ve generated, ready to export or reprint anytime.
                </div>

                <div className="border border-[#e0dbd2] bg-white p-6">
                  {batches.length === 0 ? (
                    <div className="text-center py-16 text-[#6e6e7a]">
                      <span className="text-xl font-medium text-[#1a1a1e] block mb-2">
                        No codes generated yet
                      </span>
                      <p className="text-sm">
                        Once you generate a batch, your codes will live here permanently.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e0dbd2] text-left">
                          <th className="py-2.5 asemi-mono">Batch</th>
                          <th className="py-2.5 asemi-mono">Product</th>
                          <th className="py-2.5 asemi-mono">Quantity</th>
                          <th className="py-2.5 asemi-mono">Amount</th>
                          <th className="py-2.5 asemi-mono text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b) => (
                          <tr key={b.id} className="border-b border-[#e0dbd2] last:border-none">
                            <td className="py-3.5 font-mono text-[#1a1a1e]">#{b.id}</td>
                            <td className="py-3.5 font-medium text-[#1a1a1e]">{b.product}</td>
                            <td className="py-3.5 font-mono">{b.qty.toLocaleString()}</td>
                            <td className="py-3.5 font-mono">{formatMoney(b.price)}</td>
                            <td className="py-3.5 text-right">
                              <span className="px-2.5 py-1 font-mono text-[10px] text-[#2e8b57] bg-[#2e8b57]/10 border border-[#2e8b57]/30 cursor-pointer">
                                Export
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* BILLING */}
            {dashboardPage === "billing" && (
              <div>
                <div className="mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Billing</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">Your pricing tier and usage.</div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#e0dbd2] border border-[#e0dbd2] mb-10">
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Lifetime Codes</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">
                      {totalGenerated.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Free Codes Used</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">
                      {freeUsed}
                      <span className="text-base text-[#6e6e7a]">/20</span>
                    </div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Current Rate</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">{currentRateString()}</div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="asemi-mono mb-3">Total Spent</div>
                    <div className="text-3xl font-bold text-[#1a1a1e]">
                      {formatMoney(totalSpent)}
                    </div>
                  </div>
                </div>

                <div className="border border-[#e0dbd2] bg-white mb-10">
                  <div className="p-5 border-b border-[#e0dbd2] flex justify-between items-center">
                    <h3 className="font-semibold text-[#1a1a1e]">Pricing bands</h3>
                    <span className="px-2 py-0.5 font-mono text-[10px] bg-[#ede8df] text-[#6e6e7a]">
                      {currency.code}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="border border-[#e0dbd2]">
                      {currency.tiers.map((rate, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-3 p-4 border-b border-[#e0dbd2] text-sm items-center"
                        >
                          <div className="text-[#1a1a1e] font-medium">{labels[i]}</div>
                          <div className="font-mono text-[#b8962e]">{formatMoney(rate)}</div>
                          <div />
                        </div>
                      ))}
                      <div className="grid grid-cols-3 p-4 text-sm items-center">
                        <div className="text-[#1a1a1e] font-medium">Codes 1,000,001+</div>
                        <div className="font-mono text-[#b8962e]">Let&apos;s talk</div>
                        <div />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-[#e0dbd2] bg-white">
                  <div className="p-5 border-b border-[#e0dbd2] font-semibold text-[#1a1a1e]">
                    Transaction history
                  </div>
                  <div className="p-6">
                    {batches.length === 0 ? (
                      <div className="text-center py-12 text-[#6e6e7a]">
                        <span className="text-xl font-medium text-[#1a1a1e] block mb-2">
                          No transactions yet
                        </span>
                        <p className="text-sm">Your batch payments will be listed here.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e0dbd2] text-left">
                            <th className="py-2.5 asemi-mono">Batch</th>
                            <th className="py-2.5 asemi-mono">Codes</th>
                            <th className="py-2.5 asemi-mono">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((b) => (
                            <tr key={b.id} className="border-b border-[#e0dbd2] last:border-none">
                              <td className="py-3 font-medium text-[#1a1a1e]">
                                Batch #{b.id} — {b.product}
                              </td>
                              <td className="py-3 font-mono">{b.qty.toLocaleString()}</td>
                              <td className="py-3 font-mono">{formatMoney(b.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE */}
            {dashboardPage === "profile" && (
              <div>
                <div className="mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1e]">Company Profile</h1>
                </div>
                <div className="text-sm text-[#45454f] mb-9">
                  Your business information and verification documents.
                </div>

                <div className="border border-[#e0dbd2] bg-white mb-8">
                  <div className="p-5 border-b border-[#e0dbd2] flex justify-between items-center">
                    <h3 className="font-semibold text-[#1a1a1e]">Business details</h3>
                    <span className="px-2.5 py-0.5 font-mono text-[10px] bg-[#d4830a]/10 text-[#d4830a] border border-[#d4830a]/30">
                      Pending Verification
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="asemi-mono block mb-2">Company Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div>
                        <label className="asemi-mono block mb-2">Country</label>
                        <input
                          type="text"
                          value={selectedCountry?.name || "Not set (Default USD)"}
                          disabled
                          className="w-full p-3 border border-[#e0dbd2] text-sm bg-[#ede8df] text-[#45454f]"
                        />
                      </div>
                      <div>
                        <label className="asemi-mono block mb-2">Phone Number</label>
                        <input
                          type="text"
                          defaultValue="+234 800 000 0000"
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div>
                        <label className="asemi-mono block mb-2">Email</label>
                        <input
                          type="email"
                          defaultValue="company@email.com"
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="asemi-mono block mb-2">CAC Registration No.</label>
                        <input
                          type="text"
                          defaultValue="RC 1234567"
                          className="w-full p-3 border border-[#e0dbd2] text-sm outline-none focus:border-[#b8962e]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#6e6e7a] mt-4">
                      Country determines your pricing region and can&apos;t be changed after
                      verification — contact support if this was set incorrectly.
                    </p>
                  </div>
                </div>

                <div className="border border-[#e0dbd2] bg-white">
                  <div className="p-5 border-b border-[#e0dbd2] font-semibold text-[#1a1a1e]">
                    Verification documents
                  </div>
                  <div className="p-6">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-2 text-[#1a1a1e]">CAC Certificate.pdf</td>
                          <td className="py-2 text-right">
                            <span className="px-2.5 py-0.5 font-mono text-[10px] bg-[#d4830a]/10 text-[#d4830a] border border-[#d4830a]/30">
                              Under review
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
