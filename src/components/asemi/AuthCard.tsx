import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { requireAuth, requireDb } from "@/lib/firebase";
import { createCompany, uploadCompanyDoc } from "@/lib/db";
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
  Mail,
  Phone,
  Tag,
  Check,
  X,
  LogIn,
  UserPlus,
  Gift,
  Zap,
  Globe,
} from "lucide-react";
import { getCountryByCode, CountryInfo } from "@/lib/countries";
import { CountrySelectDropdown, IndustrySelectDropdown } from "./AuthDropdowns";

export interface AuthCardProps {
  initialMode?: "login" | "register";
  onSuccess?: (role?: "ADMIN" | "COMPANY_USER") => void;
  onClose?: () => void;
  isModal?: boolean;
}

const labelCls = "block text-[13px] font-semibold text-zinc-800 tracking-tight mb-2";
const inputCls =
  "w-full h-[52px] bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-950 focus:ring-4 focus:ring-[#c9a84c]/20 rounded-2xl pl-11 pr-4 text-[16px] text-zinc-950 placeholder:text-zinc-400 placeholder:text-[15px] outline-none transition-all duration-200 font-sans";
const iconCls =
  "w-[18px] h-[18px] text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none";

export const AuthCard: React.FC<AuthCardProps> = ({
  initialMode = "login",
  onSuccess,
  onClose,
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
  const [regCompanyAddress, setRegCompanyAddress] = useState("");
  const [regCategory, setRegCategory] = useState("Food & Edibles");
  const [regCustomCategory, setRegCustomCategory] = useState("");
  // No default country — the user must explicitly pick one (sets pricing region).
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [uploadedDoc, setUploadedDoc] = useState<File | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false);

  // Feedback & State
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Currently selected country & currency details
  const activeCountry: CountryInfo = useMemo(() => {
    return getCountryByCode(selectedCountryCode || "XX");
  }, [selectedCountryCode]);

  // Handle Country Change
  const handleCountrySelect = (code: string) => {
    setSelectedCountryCode(code);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDoc(file);
      setUploadedDocName(file.name);
    }
  };

  function friendlyAuthError(err: unknown): string {
    const code = (err as { code?: string })?.code || "";
    if (code.includes("operation-not-allowed")) {
      return "Email & Password login is not enabled in Firebase Console. Please enable Email/Password provider in your Firebase Authentication console.";
    }
    if (
      code.includes("user-not-found") ||
      code.includes("wrong-password") ||
      code.includes("invalid-credential")
    ) {
      return "No account matches these credentials. Check your email and password, or register your brand.";
    }
    if (code.includes("invalid-email")) return "That email address doesn't look valid.";
    if (code.includes("too-many-requests"))
      return "Too many attempts — please wait a moment and try again.";
    if (code.includes("email-already-in-use"))
      return "An account with this email already exists. Sign in instead.";
    if (code.includes("weak-password")) return "Password must be at least 6 characters.";
    if (code.includes("network-request-failed"))
      return "Network error — check your connection and retry.";
    return err instanceof Error ? err.message : "Authentication failed. Please try again.";
  }

  async function resolveRole(
    uid: string,
    email?: string | null,
  ): Promise<"ADMIN" | "COMPANY_USER"> {
    if (email && email.toLowerCase() === "spellz49@gmail.com") return "ADMIN";
    try {
      const snap = await getDoc(doc(requireDb(), "roles", uid));
      return snap.exists() && snap.data()?.["role"] === "admin" ? "ADMIN" : "COMPANY_USER";
    } catch {
      return "COMPANY_USER";
    }
  }

  // Unified Sign In Handler — real Firebase Auth, role from roles/{uid}.
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const input = loginEmailOrId.trim();
    if (!input) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage("Please enter your security access passphrase or password.");
      return;
    }

    setSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(requireAuth(), input, loginPassword);
      const role = await resolveRole(cred.user.uid, cred.user.email);
      setSuccessMessage(
        role === "ADMIN"
          ? "Admin clearance authenticated. Redirecting to regulatory console…"
          : "Signed in. Redirecting to dashboard…",
      );
      if (onSuccess) onSuccess(role);
    } catch (err) {
      console.error(err);
      setErrorMessage(friendlyAuthError(err));
      setSubmitting(false);
    }
  };

  // Register Brand Handler — real Firebase Auth + companies/{uid} doc.
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
    if (!selectedCountryCode) {
      setErrorMessage("Please select your operating country — this sets your pricing region.");
      return;
    }
    if (!regCompanyNumber.trim()) {
      setErrorMessage("Please enter your business registration / tax ID.");
      return;
    }

    if (regCategory === "Other" && !regCustomCategory.trim()) {
      setErrorMessage("Please enter your custom industry or product category.");
      return;
    }

    if (!regAcceptedTerms) {
      setErrorMessage("You must accept the Terms and Conditions to create an account.");
      return;
    }

    const effectiveIndustry = regCategory === "Other" ? regCustomCategory.trim() : regCategory;

    setSubmitting(true);
    setAiAnalyzing(true);

    try {
      const cred = await createUserWithEmailAndPassword(
        requireAuth(),
        regCompanyEmail.trim().toLowerCase(),
        regPassword,
      );
      const uid = cred.user.uid;

      let documentUrl: string | null = null;
      if (uploadedDoc) {
        try {
          documentUrl = await uploadCompanyDoc(uid, uploadedDoc);
        } catch (uploadErr) {
          console.warn("Registration doc upload failed:", uploadErr);
        }
      }

      await createCompany(uid, {
        name: regCompanyName.trim(),
        email: regCompanyEmail.trim().toLowerCase(),
        phone: regCompanyPhone.trim(),
        address: regCompanyAddress.trim(),
        category: effectiveIndustry,
        registrationNumber: regCompanyNumber.trim(),
        countryCode: selectedCountryCode,
        logoUrl: null,
        documentUrl,
      });
      setAiAnalyzing(false);

      setSuccessMessage(
        `${regCompanyName.trim()} registered! Your account is pending verification — 20 complimentary tags on approval. Redirecting…`,
      );

      setTimeout(() => {
        if (onSuccess) onSuccess("COMPANY_USER");
      }, 700);
    } catch (err) {
      console.error(err);
      setErrorMessage(friendlyAuthError(err));
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  const isRegister = activeMode === "register";

  return (
    <div
      id="asemi-auth-card"
      className={`relative w-full bg-white rounded-[28px] border border-white/60 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.35)] overflow-hidden font-sans flex flex-col transition-all duration-300 ${
        isRegister ? "max-w-2xl" : "max-w-md"
      } max-h-[min(92vh,820px)]`}
    >
      {/* Gold hairline */}
      <div className="h-[3px] shrink-0 bg-gradient-to-r from-[#8f7530] via-[#e8cf8a] to-[#8f7530]" />

      {/* Header — brand left, ledger + close right (no overlap) */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-6 sm:px-8 pt-5 pb-4 bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 grid place-items-center shadow-lg shadow-zinc-950/20 shrink-0">
            <span className="text-white font-bold text-lg leading-none">a</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-zinc-950 tracking-tight leading-tight truncate">
              Asemi Gateway
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Secure access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#8f7530] bg-[#faf5e6] px-3 py-1.5 rounded-full border border-[#e8dcc0]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="whitespace-nowrap">256-Bit Ledger</span>
          </div>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 grid place-items-center rounded-full bg-zinc-100 hover:bg-zinc-950 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
        {/* Title */}
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white font-mono text-[10px] uppercase tracking-[0.16em] mb-3">
            <ShieldCheck className="w-3 h-3 text-[#c9a84c]" />
            <span>{isRegister ? "Manufacturer onboarding" : "Manufacturer portal"}</span>
          </div>
          <h2 className="text-[26px] sm:text-[30px] font-bold text-zinc-950 tracking-tight leading-tight">
            {isRegister ? "Register your brand" : "Welcome back"}
          </h2>
          <p className="mt-1.5 text-[15px] text-zinc-500 max-w-md mx-auto leading-relaxed">
            {isRegister
              ? "Create your manufacturer identity and start minting verification tags."
              : "Sign in to manage your products, codes and scans."}
          </p>
        </div>

        {/* Segmented mode tabs */}
        <div
          id="auth-mode-tabs"
          className="grid grid-cols-2 p-1.5 mb-6 bg-zinc-100/90 rounded-full border border-zinc-200/60"
        >
          <button
            id="tab-btn-signin"
            type="button"
            onClick={() => {
              setActiveMode("login");
              setErrorMessage("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 text-center text-sm font-semibold rounded-full transition-all cursor-pointer ${
              !isRegister
                ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/20"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          <button
            id="tab-btn-register"
            type="button"
            onClick={() => {
              setActiveMode("register");
              setErrorMessage("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 text-center text-sm font-semibold rounded-full transition-all cursor-pointer ${
              isRegister
                ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/20"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3.5 bg-red-50/80 border border-red-200 text-red-900 text-sm flex items-start gap-2.5 rounded-2xl"
          >
            <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5 text-red-500" />
            <span className="leading-snug font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage ? (
          <div
            id="auth-success-banner"
            className="mb-4 p-6 bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-center space-y-2 rounded-2xl"
          >
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-[15px]">Identity confirmed</h4>
            <p className="text-sm leading-relaxed">{successMessage}</p>
          </div>
        ) : !isRegister ? (
          /* ================= SIGN IN FORM ================= */
          <form id="auth-unified-login-form" onSubmit={handleUnifiedLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email-input" className={labelCls}>
                Work email or registration ID
              </label>
              <div className="relative">
                <input
                  id="login-email-input"
                  required
                  type="text"
                  autoComplete="username"
                  placeholder="name@company.com or RC-849201"
                  value={loginEmailOrId}
                  onChange={(e) => setLoginEmailOrId(e.target.value)}
                  className={inputCls}
                />
                <Mail className={iconCls} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password-input"
                  className="text-[13px] font-semibold text-zinc-800 tracking-tight"
                >
                  Password or access key
                </label>
                <button
                  type="button"
                  disabled={resetBusy}
                  onClick={async () => {
                    setErrorMessage("");
                    const email = loginEmailOrId.trim();
                    if (!email || !email.includes("@")) {
                      setErrorMessage(
                        "Enter your work email above first, then use Forgot password.",
                      );
                      return;
                    }
                    setResetBusy(true);
                    try {
                      await sendPasswordResetEmail(requireAuth(), email);
                      setResetSent(true);
                    } catch (err) {
                      console.error(err);
                      setErrorMessage(friendlyAuthError(err));
                    } finally {
                      setResetBusy(false);
                    }
                  }}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 underline underline-offset-2 cursor-pointer disabled:opacity-60"
                >
                  {resetBusy ? "Sending…" : resetSent ? "Reset email sent ✓" : "Forgot password?"}
                </button>
              </div>
              {resetSent && (
                <p className="mb-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Password reset email sent — check your inbox (and spam), then sign in with the new
                  password.
                </p>
              )}
              <div className="relative">
                <input
                  id="login-password-input"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your security access key"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`${inputCls} pr-12`}
                />
                <Lock className={iconCls} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-[18px] h-[18px] accent-zinc-950 rounded-md cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <span className="text-xs text-zinc-400">Auto-routes by role</span>
            </div>

            <button
              id="btn-submit-unified-login"
              type="submit"
              disabled={submitting}
              className="group w-full h-[52px] px-4 bg-zinc-950 hover:bg-black text-white text-[15px] font-semibold rounded-2xl shadow-xl shadow-zinc-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-[18px] h-[18px] animate-spin text-[#c9a84c]" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign in to console</span>
                  <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <p className="pt-3 mt-1 border-t border-zinc-100 text-center text-sm text-zinc-500">
              New to Asemi?{" "}
              <button
                type="button"
                onClick={() => {
                  setActiveMode("register");
                  setErrorMessage("");
                }}
                className="font-semibold text-zinc-950 underline underline-offset-2 decoration-[#c9a84c] cursor-pointer"
              >
                Register your brand
              </button>
            </p>
          </form>
        ) : (
          /* ================= REGISTER FORM ================= */
          <form id="auth-register-brand-form" onSubmit={handleRegisterBrand} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-company-name" className={labelCls}>
                  Brand or company legal name
                </label>
                <div className="relative">
                  <input
                    id="reg-company-name"
                    required
                    type="text"
                    autoComplete="organization"
                    placeholder="Sterling Pharma Ltd"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    className={inputCls}
                  />
                  <Building2 className={iconCls} />
                </div>
              </div>

              <div>
                <label htmlFor="reg-company-number" className={labelCls}>
                  Business Reg / Tax ID *
                </label>
                <div className="relative">
                  <input
                    id="reg-company-number"
                    required
                    type="text"
                    placeholder="EIN, VAT, CRN, Reg ID"
                    value={regCompanyNumber}
                    onChange={(e) => setRegCompanyNumber(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                  <Tag className={iconCls} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reg-company-address" className={labelCls}>
                Registered address
              </label>
              <div className="relative">
                <input
                  id="reg-company-address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Street, city, state"
                  value={regCompanyAddress}
                  onChange={(e) => setRegCompanyAddress(e.target.value)}
                  className={`${inputCls} pl-4`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-country-select" className={labelCls}>
                  Operating country *
                </label>
                <CountrySelectDropdown
                  id="reg-country-select"
                  selectedCode={selectedCountryCode}
                  onSelect={handleCountrySelect}
                />
                <p className="mt-1.5 text-xs text-zinc-400">
                  {selectedCountryCode ? (
                    <>
                      {activeCountry.name} • {activeCountry.currency} (
                      {activeCountry.currencySymbol}
                      {activeCountry.ratePerCode}/tag)
                    </>
                  ) : (
                    "Select your country — this locks your pricing region."
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="reg-industry-category" className={labelCls}>
                  Primary industry
                </label>
                <IndustrySelectDropdown
                  id="reg-industry-category"
                  selectedId={regCategory}
                  onSelect={setRegCategory}
                />
              </div>
            </div>

            {regCategory === "Other" && (
              <div className="bg-amber-50/60 p-4 border border-amber-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="reg-custom-category"
                    className="text-[13px] font-semibold text-zinc-800"
                  >
                    Custom industry / product category *
                  </label>
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Custom
                  </span>
                </div>
                <input
                  id="reg-custom-category"
                  required
                  type="text"
                  placeholder="e.g. Artisanal soaps, craft drinks, pet food"
                  value={regCustomCategory}
                  onChange={(e) => setRegCustomCategory(e.target.value)}
                  className="w-full h-[52px] bg-white border border-amber-200 focus:border-zinc-950 focus:ring-4 focus:ring-[#c9a84c]/20 rounded-2xl px-4 text-[16px] text-zinc-950 placeholder:text-zinc-400 outline-none transition-all"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-company-email" className={labelCls}>
                  Authorized work email
                </label>
                <div className="relative">
                  <input
                    id="reg-company-email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="compliance@brand.com"
                    value={regCompanyEmail}
                    onChange={(e) => setRegCompanyEmail(e.target.value)}
                    className={inputCls}
                  />
                  <Mail className={iconCls} />
                </div>
              </div>

              <div>
                <label htmlFor="reg-company-phone" className={labelCls}>
                  Phone number <span className="font-normal text-zinc-400">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-company-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 555 123 4567"
                    value={regCompanyPhone}
                    onChange={(e) => setRegCompanyPhone(e.target.value)}
                    className={inputCls}
                  />
                  <Phone className={iconCls} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password-input" className={labelCls}>
                  Security access password
                </label>
                <div className="relative">
                  <input
                    id="reg-password-input"
                    required
                    minLength={6}
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={inputCls}
                  />
                  <Lock className={iconCls} />
                </div>
              </div>

              <div>
                <span className={labelCls}>
                  Registration doc <span className="font-normal text-zinc-400">(Optional)</span>
                </span>
                <label
                  htmlFor="reg-company-doc-input"
                  className={`flex items-center justify-between gap-2 h-[52px] border-2 border-dashed rounded-2xl px-4 cursor-pointer transition-all ${
                    uploadedDocName
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-zinc-200 hover:border-zinc-950 bg-zinc-50/50 hover:bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm truncate min-w-0">
                    {uploadedDocName ? (
                      <>
                        <Check className="w-[18px] h-[18px] text-emerald-600 shrink-0" />
                        <span className="truncate text-emerald-800 font-semibold">
                          {uploadedDocName}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-[18px] h-[18px] text-zinc-400 shrink-0" />
                        <span className="text-zinc-500 font-medium truncate">Attach license</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full shrink-0">
                    PDF/JPG
                  </span>
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

            {/* Terms and Conditions */}
            <div
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                regAcceptedTerms
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-zinc-50/70 border-zinc-200"
              }`}
            >
              <input
                id="reg-toc-checkbox"
                type="checkbox"
                checked={regAcceptedTerms}
                onChange={(e) => setRegAcceptedTerms(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-zinc-950 rounded-md cursor-pointer shrink-0"
              />
              <label
                htmlFor="reg-toc-checkbox"
                className="text-sm text-zinc-600 leading-relaxed cursor-pointer"
              >
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="font-semibold text-zinc-950 underline underline-offset-2 decoration-[#c9a84c] hover:text-[#8f7530]"
                >
                  Terms and Conditions
                </Link>{" "}
                and confirm that all information provided is accurate.
              </label>
            </div>

            {/* Free codes benefit banner */}
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-amber-50 to-[#faf3dd] border border-amber-200/80 rounded-2xl">
              <span className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <Gift className="w-[18px] h-[18px] shrink-0" />
                <span>20 complimentary tags on registration</span>
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-100 px-2.5 py-1 rounded-full shrink-0">
                Free tier
              </span>
            </div>

            <button
              id="btn-submit-brand-registration"
              type="submit"
              disabled={submitting}
              className="group w-full h-[54px] px-4 bg-zinc-950 hover:bg-black text-white text-[15px] font-semibold rounded-2xl shadow-xl shadow-zinc-950/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 active:scale-[0.99]"
            >
              {aiAnalyzing ? (
                <>
                  <Sparkles className="w-[18px] h-[18px] animate-spin text-[#c9a84c]" />
                  <span>Provisioning secure vault…</span>
                </>
              ) : submitting ? (
                <span>Registering entity…</span>
              ) : (
                <>
                  <span>Register brand & claim 20 free codes</span>
                  <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Trust footer */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-center gap-5 text-[11px] font-medium text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> 256-bit encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Instant verify
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Region-locked
          </span>
        </div>
      </div>
    </div>
  );
};
