import React, { useState, useMemo } from "react";
import { asemiStore } from "@/lib/asemiStore";
import { fb as supabase } from "@/integrations/firebase/client";
import {
  Building2,
  Lock,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Mail,
  Phone,
  Tag,
  Info,
  Check,
} from "lucide-react";
import { SORTED_COUNTRIES, getCountryByCode, CountryInfo } from "@/lib/countries";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { CountrySelectDropdown, IndustrySelectDropdown } from "./AuthDropdowns";

export interface AuthCardProps {
  initialMode?: "login" | "register";
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  initialMode = "login",
  onSuccess,
  onClose: _onClose,
  isModal = false,
}) => {
  const [activeMode, setActiveMode] = useState<"login" | "register">(initialMode);

  // Unified Sign In Fields
  const [loginEmailOrId, setLoginEmailOrId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Brand Fields
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regCompanyEmail, setRegCompanyEmail] = useState("");
  const [regCompanyPhone, setRegCompanyPhone] = useState("");
  const [regCompanyNumber, setRegCompanyNumber] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCategory, setRegCategory] = useState("Food & Edibles");
  const [regCustomCategory, setRegCustomCategory] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("NG");
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>("");

  // Feedback & State
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const companies = asemiStore.getState().companies;

  // Currently selected country & currency details
  const activeCountry: CountryInfo = useMemo(() => {
    return getCountryByCode(selectedCountryCode);
  }, [selectedCountryCode]);

  // Handle Country Change
  const handleCountrySelect = (code: string) => {
    setSelectedCountryCode(code);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocName(file.name);
      const url = URL.createObjectURL(file);
      setDocPreviewUrl(url);
    }
  };

  // Unified Sign In Handler (Auto-routes to Admin or Brand)
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const input = loginEmailOrId.trim();
    if (!input) {
      setErrorMessage("Please enter your registered email address or company identifier.");
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage("Please enter your security access passphrase or password.");
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((r) => setTimeout(r, 500));

      const lower = input.toLowerCase();
      const isAdminLogin =
        lower === "admin" ||
        lower.includes("admin@") ||
        lower === "regulatory@nafdac.gov.ng" ||
        lower.includes("nafdac");

      if (isAdminLogin) {
        asemiStore.setRole("ADMIN");
        setSuccessMessage("Admin clearance authenticated. Redirecting to regulatory console…");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 600);
        return;
      }

      // Check registered companies in store
      const matchedCompany = companies.find(
        (c) =>
          c.email.toLowerCase() === lower ||
          c.registrationNumber.toLowerCase() === lower ||
          c.name.toLowerCase().includes(lower),
      );

      const targetCompany = matchedCompany || companies[0];

      if (!targetCompany) {
        setErrorMessage("No matching company found. Please register your brand.");
        setSubmitting(false);
        return;
      }

      asemiStore.setCurrentCompany(targetCompany.id);
      asemiStore.setRole("COMPANY_USER");

      await supabase.auth.signInAs({
        id: targetCompany.id,
        email: targetCompany.email,
        companyName: targetCompany.name,
        role: "COMPANY_USER",
      });

      setSuccessMessage(`Signed in as ${targetCompany.name}. Redirecting to dashboard…`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 600);
    } catch (err) {
      console.error(err);
      setErrorMessage("Authentication failed. Please verify credentials.");
      setSubmitting(false);
    }
  };

  // Register Brand Handler
  const handleRegisterBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!regCompanyName.trim()) {
      setErrorMessage("Please enter your company / brand legal name.");
      return;
    }
    if (!regCompanyEmail.trim()) {
      setErrorMessage("Please enter an authorized corporate email address.");
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setErrorMessage("Access password must be at least 6 characters.");
      return;
    }

    if (regCategory === "Other" && !regCustomCategory.trim()) {
      setErrorMessage("Please enter your custom industry or product category.");
      return;
    }

    const effectiveIndustry = regCategory === "Other" ? regCustomCategory.trim() : regCategory;

    setSubmitting(true);
    setAiAnalyzing(true);

    try {
      await new Promise((r) => setTimeout(r, 900));
      setAiAnalyzing(false);

      const newCompany = await asemiStore.registerCompany({
        name: regCompanyName.trim(),
        email: regCompanyEmail.trim().toLowerCase(),
        phone: regCompanyPhone.trim(),
        countryCode: selectedCountryCode,
        registrationNumber: regCompanyNumber.trim()
          ? regCompanyNumber.trim().toUpperCase()
          : "UNREGISTERED / INDIE",
        industry: effectiveIndustry,
        verificationDocUrl: docPreviewUrl || "",
      });

      asemiStore.setCurrentCompany(newCompany.id);
      asemiStore.setRole("COMPANY_USER");

      await supabase.auth.signInAs({
        id: newCompany.id,
        email: newCompany.email,
        companyName: newCompany.name,
        role: "COMPANY_USER",
      });

      setSuccessMessage(
        `${newCompany.name} registered with 20 complimentary verification tags! Redirecting…`,
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err) {
      console.error(err);
      setErrorMessage(String(err));
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  // 1-Click Fill Helpers for quick testing
  const handleQuickFill = (type: "company-ng" | "company-us" | "admin") => {
    setErrorMessage("");
    if (type === "company-ng") {
      const comp = companies[0] || {
        registrationNumber: "RC-849201",
        email: "compliance@sterling-pharma.com",
      };
      setLoginEmailOrId(comp.email || "compliance@sterling-pharma.com");
      setLoginPassword("asemi_vault_2026_secured");
    } else if (type === "company-us") {
      const comp = companies.find((c) => c.countryCode === "US") ||
        companies[1] || {
          registrationNumber: "DEL-948201",
          email: "supplychain@apex-fmcg.com",
        };
      setLoginEmailOrId(comp.email || "supplychain@apex-fmcg.com");
      setLoginPassword("asemi_vault_2026_secured");
    } else {
      setLoginEmailOrId("admin@asemi.demo");
      setLoginPassword("asemi_admin_master_clearance_2026");
    }
  };

  return (
    <div
      id="asemi-auth-card"
      className="bg-white border border-zinc-200/90 w-full max-w-xl shadow-2xl rounded-2xl overflow-hidden font-sans flex flex-col max-h-[min(92vh,780px)] transition-all duration-200"
    >
      {/* Compact Top Security Banner */}
      <div className="shrink-0 bg-zinc-950 text-white px-5 py-3 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
          <ShieldCheck className="w-4 h-4 text-[#c9a84c]" />
          <span>Asemi Authentication Gateway</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#c9a84c] font-medium bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>256-Bit Ledger</span>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 flex flex-col justify-between">
        <div>
          {/* Header Title & Subtitle */}
          <div className="mb-4 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {activeMode === "login" ? "Manufacturer Sign In" : "Register Enterprise Brand"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              {activeMode === "login"
                ? "Access your packaging dashboard or regulatory inspection console."
                : "Register your legal manufacturing entity to mint cryptographic verification tags."}
            </p>
          </div>

          {/* Symmetrical Mode Tabs */}
          <div
            id="auth-mode-tabs"
            className="grid grid-cols-2 p-1 mb-4 bg-zinc-100 rounded-xl border border-zinc-200/80"
          >
            <button
              id="tab-btn-signin"
              type="button"
              onClick={() => {
                setActiveMode("login");
                setErrorMessage("");
              }}
              className={`py-2 px-3 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeMode === "login"
                  ? "bg-white text-zinc-950 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-btn-register"
              type="button"
              onClick={() => {
                setActiveMode("register");
                setErrorMessage("");
              }}
              className={`py-2 px-3 text-center text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeMode === "register"
                  ? "bg-white text-zinc-950 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Register Brand
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              id="auth-error-banner"
              className="mb-3 p-2.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs flex items-start gap-2 rounded-lg animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#dc2626]" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage ? (
            <div
              id="auth-success-banner"
              className="mb-4 p-5 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-center space-y-2 rounded-lg"
            >
              <CheckCircle2 className="w-8 h-8 text-[#16a34a] mx-auto animate-bounce" />
              <h4 className="font-bold text-sm text-[#15803d]">Identity Confirmed</h4>
              <p className="text-xs leading-relaxed text-[#166534]">{successMessage}</p>
            </div>
          ) : activeMode === "login" ? (
            /* ======================================================= */
            /* UNIFIED SIGN IN FORM                                    */
            /* ======================================================= */
            <form id="auth-unified-login-form" onSubmit={handleUnifiedLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-semibold text-zinc-700 mb-1.5"
                >
                  Work email or registration ID
                </label>
                <div className="relative">
                  <input
                    id="login-email-input"
                    required
                    type="text"
                    placeholder="e.g. name@company.com or RC-849201"
                    value={loginEmailOrId}
                    onChange={(e) => setLoginEmailOrId(e.target.value)}
                    className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-9 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                  />
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password-input"
                    className="text-xs font-semibold text-zinc-700"
                  >
                    Password or access key
                  </label>
                  <span className="text-[11px] text-zinc-400">Demo: any passphrase</span>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your security access key"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-9 pr-9 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-xs text-zinc-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-zinc-900 rounded"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-[11px] text-zinc-400">Auto-routes by account role</span>
              </div>

              <button
                id="btn-submit-unified-login"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 mt-2"
              >
                {submitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#c9a84c]" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Accounts - ONLY on Sign In mode, compact strip */}
              <div className="pt-3.5 mt-3.5 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-500">Quick-fill test accounts</span>
                  <span className="text-amber-700 font-medium">1-Click Fast Fill</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill("company-ng")}
                    className="p-2 bg-zinc-50/90 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-900 rounded-lg text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="font-semibold text-zinc-900 text-[11px] truncate">
                      Sterling Pharma
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">🇳🇬 NGN Brand</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("company-us")}
                    className="p-2 bg-zinc-50/90 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-900 rounded-lg text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="font-semibold text-zinc-900 text-[11px] truncate">
                      Apex FMCG
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">🇺🇸 USD Brand</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("admin")}
                    className="p-2 bg-zinc-50/90 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-900 rounded-lg text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="font-semibold text-zinc-900 text-[11px] truncate">
                      NAFDAC Admin
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">🛡️ Root Console</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ======================================================= */
            /* REGISTER BRAND FORM (2-COLUMN COMPACT GRID)             */
            /* ======================================================= */
            <form
              id="auth-register-brand-form"
              onSubmit={handleRegisterBrand}
              className="space-y-3.5"
            >
              {/* Row 1: Name & Reg Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-company-name"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Brand or company legal name
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-name"
                      required
                      type="text"
                      placeholder="e.g. Sterling Pharma Ltd"
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-8 text-xs text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                    />
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-company-number"
                      className="block text-xs font-semibold text-zinc-700"
                    >
                      Business Reg / Tax ID <span className="font-normal text-zinc-400">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">Small makers may leave blank</span>
                  </div>
                  <div className="relative">
                    <input
                      id="reg-company-number"
                      type="text"
                      placeholder="e.g. EIN, VAT, CRN, or Reg ID (optional)"
                      value={regCompanyNumber}
                      onChange={(e) => setRegCompanyNumber(e.target.value)}
                      className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-8 text-xs text-zinc-900 font-mono placeholder:text-zinc-400 rounded-lg transition-all"
                    />
                    <Tag className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Row 2: Country (All Countries) & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-country-select"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Operating country
                  </label>
                  <CountrySelectDropdown
                    id="reg-country-select"
                    selectedCode={selectedCountryCode}
                    onSelect={handleCountrySelect}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-industry-category"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Primary industry
                  </label>
                  <IndustrySelectDropdown
                    id="reg-industry-category"
                    selectedId={regCategory}
                    onSelect={setRegCategory}
                  />
                </div>
              </div>

              {/* Dynamic field if "Other" category is chosen */}
              {regCategory === "Other" && (
                <div className="bg-zinc-50/80 p-3 border border-zinc-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="reg-custom-category"
                      className="block text-xs font-semibold text-zinc-800"
                    >
                      Specify custom industry / product category *
                    </label>
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">
                      Custom Classification
                    </span>
                  </div>
                  <input
                    id="reg-custom-category"
                    required
                    type="text"
                    placeholder="e.g. Artisanal Soaps, Specialty Chemicals, Craft Drinks, Pet Food"
                    value={regCustomCategory}
                    onChange={(e) => setRegCustomCategory(e.target.value)}
                    className="w-full bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Enter the exact goods or product type your brand produces.
                  </p>
                </div>
              )}

              {/* Row 3: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-company-email"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Authorized work email
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-email"
                      required
                      type="email"
                      placeholder="compliance@brand.com"
                      value={regCompanyEmail}
                      onChange={(e) => setRegCompanyEmail(e.target.value)}
                      className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-8 text-xs text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                    />
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-company-phone"
                      className="block text-xs font-semibold text-zinc-700"
                    >
                      Phone number <span className="font-normal text-zinc-400">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">International format</span>
                  </div>
                  <div className="relative">
                    <input
                      id="reg-company-phone"
                      type="tel"
                      placeholder="e.g. +1 555 123 4567 or local format"
                      value={regCompanyPhone}
                      onChange={(e) => setRegCompanyPhone(e.target.value)}
                      className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-8 text-xs text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                    />
                    <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Row 4: Password & Company Document Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-password-input"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Security access password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password-input"
                      required
                      minLength={6}
                      type="password"
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#fafaf9] hover:bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 px-3 py-2 pl-8 text-xs text-zinc-900 placeholder:text-zinc-400 rounded-lg transition-all font-sans"
                    />
                    <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Business registration doc <span className="font-normal text-zinc-400">(Optional)</span>
                  </label>
                  <label
                    htmlFor="reg-company-doc-input"
                    className="flex items-center justify-between border border-dashed border-zinc-300 hover:border-zinc-900 bg-zinc-50/70 hover:bg-white px-3 py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-1.5 text-xs truncate max-w-[170px]">
                      {uploadedDocName ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate text-emerald-800 font-medium">
                            {uploadedDocName}
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-zinc-500 truncate">Attach License (Optional)</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">PDF/JPG</span>
                    <input
                      id="reg-company-doc-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Universal Access Notice: Small business & artisan inclusivity */}
              <div className="p-3 bg-sky-50/80 border border-sky-200/70 rounded-xl text-[11px] text-sky-900 flex items-start gap-2.5 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Universal Access:</strong> Product authentication and counterfeit defense is open to all brands. Official business incorporation documents and tax IDs are <strong>strictly optional</strong>—small businesses, artisanal makers, and independent brands can register and mint verification tags immediately. Regulatory certificates (such as FDA, CE, NAFDAC, or ISO) and Lab CoAs can be added per product or batch inside your console.
                </span>
              </div>

              {/* Free codes benefit banner */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <span className="font-medium">
                  🎁 20 complimentary verification tags credited upon registration.
                </span>
                <span className="font-bold text-[11px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Free Tier
                </span>
              </div>

              <button
                id="btn-submit-brand-registration"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 mt-1"
              >
                {aiAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#c9a84c]" />
                    <span>Verifying Legal Jurisdiction & Provisioning Vault…</span>
                  </>
                ) : submitting ? (
                  <span>Registering Entity…</span>
                ) : (
                  <>
                    <span>Register Brand & Claim 20 Free Codes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Micro Security Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#f4f4f2] text-center text-[10px] text-[#a1a1aa] flex items-center justify-center gap-2">
          <span>End-to-End Cryptographic Ledger</span>
          <span>•</span>
          <span>Region-Locked Currency Guarantee</span>
        </div>
      </div>
    </div>
  );
};
