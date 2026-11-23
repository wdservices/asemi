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

const labelCls = "block text-xs font-semibold text-zinc-600 tracking-wide mb-1.5";
const visibleLabelCls = "block text-xs font-semibold text-zinc-600 tracking-wide mb-1.5";
const inputCls =
  "w-full h-12 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-[#c9a84c]/30 border border-zinc-300 rounded-lg pl-11 pr-4 text-sm text-zinc-950 placeholder:text-zinc-400 outline-none transition-colors duration-150 font-sans";
const iconCls =
  "w-[18px] h-[18px] text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none";

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

  async function resolveRole(uid: string): Promise<"ADMIN" | "COMPANY_USER"> {
    try {
      const companySnap = await getDoc(doc(requireDb(), "companies", uid));
      if (companySnap.exists()) return "COMPANY_USER";
      const snap = await getDoc(doc(requireDb(), "roles", uid));
      return snap.exists() && snap.data()?.["role"] === "admin" ? "ADMIN" : "COMPANY_USER";
    } catch {
      return "COMPANY_USER";
    }
  }

  // Unified Sign In Handler — real Firebase Auth.
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
      const role = await resolveRole(cred.user.uid);
      setSuccessMessage("Signed in. Redirecting to dashboard…");
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
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal ? true : undefined}
      aria-labelledby="auth-card-title"
      className={`relative grid w-full grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] bg-white rounded-2xl border border-zinc-200 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.4)] overflow-hidden font-sans transition-all duration-200 ${
        isRegister ? "max-w-5xl h-[min(92vh,860px)]" : "max-w-4xl h-[min(86vh,700px)]"
      } max-h-[min(92vh,860px)]`}
    >
      <aside className="hidden md:flex flex-col justify-between gap-6 bg-[#1a1a1e] px-7 py-6 text-white">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/asemi_logo.png"
              alt="Asemi logo"
              className="size-10 shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-white/15"
            />
            <span>
              <span className="block text-lg font-bold tracking-tight">Asemi</span>
              <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
                Product security
              </span>
            </span>
          </div>

          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d8c27d]">
              {isRegister ? "Manufacturer onboarding" : "Secure account access"}
            </p>
            <h3 className="mt-4 text-[30px] font-semibold leading-[1.12] tracking-tight">
              Trust starts with
              <span className="block text-[#d8c27d]">what you make.</span>
            </h3>
            <p className="mt-4 max-w-[230px] text-sm leading-6 text-zinc-300">
              {isRegister
                ? "Create your brand profile and protect every unit with verifiable product identity."
                : "Manage your products, verification codes, and customer scans in one secure place."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d8c27d]" />
            Verified manufacturer accounts
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d8c27d]" />
            Instant consumer verification
          </div>
          <div className="border-t border-white/15 pt-5">
            <p className="text-3xl font-semibold tracking-tight">20</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              complimentary codes when your brand is approved
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 min-h-0 flex-col bg-white">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5 md:hidden">
            <img
              src="/asemi_logo.png"
              alt="Asemi logo"
              className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5 ring-1 ring-zinc-200"
            />
            <span className="font-bold tracking-tight text-zinc-950">Asemi</span>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 md:flex">
            <span className="h-2 w-2 bg-emerald-600" />
            Secure account access
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 sm:block">
              256-bit encrypted
            </span>
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
          <div className="mb-6 text-left">
            <div className="inline-flex items-center gap-2 border border-[#e2ded5] bg-[#f7f4ed] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#806a32]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isRegister ? "Create manufacturer account" : "Manufacturer portal"}</span>
            </div>
            <h2
              id="auth-card-title"
              className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[32px]"
            >
              {isRegister ? "Register your brand" : "Welcome back"}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-500">
              {isRegister
                ? "Set up your brand profile to start protecting every product."
                : "Sign in to manage your products, codes, and scans."}
            </p>
          </div>

          {/* Segmented mode tabs */}
          <div
            id="auth-mode-tabs"
            role="tablist"
            aria-label="Account access"
            className="grid grid-cols-2 gap-1 border border-zinc-200 bg-zinc-100 p-1 mb-6"
          >
            <button
              id="tab-btn-signin"
              type="button"
              role="tab"
              aria-selected={!isRegister}
              onClick={() => {
                setActiveMode("login");
                setErrorMessage("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 text-center text-sm font-semibold transition-colors cursor-pointer ${
                !isRegister
                  ? "bg-[#1a1a1e] text-white"
                  : "text-zinc-600 hover:bg-white hover:text-zinc-950"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              id="tab-btn-register"
              type="button"
              role="tab"
              aria-selected={isRegister}
              onClick={() => {
                setActiveMode("register");
                setErrorMessage("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 text-center text-sm font-semibold transition-colors cursor-pointer ${
                isRegister
                  ? "bg-[#1a1a1e] text-white"
                  : "text-zinc-600 hover:bg-white hover:text-zinc-950"
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
              className="mb-4 flex items-start gap-2.5 border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            >
              <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5 text-red-500" />
              <span className="leading-snug font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage ? (
            <div
              id="auth-success-banner"
              className="mb-4 space-y-2 border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900"
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
                  Company email or registration ID
                </label>
                <div className="relative">
                  <input
                    id="login-email-input"
                    required
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your company email or registration ID"
                    value={loginEmailOrId}
                    onChange={(e) => setLoginEmailOrId(e.target.value)}
                    className={inputCls}
                  />
                  <Mail className={iconCls} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password-input" className={labelCls}>
                    Password
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
                    Password reset email sent — check your inbox (and spam), then sign in with the
                    new password.
                  </p>
                )}
                <div className="relative">
                  <input
                    id="login-password-input"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
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
                className="group flex h-12 w-full items-center justify-center gap-2 bg-[#356fd6] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#285fbd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Sparkles className="w-[18px] h-[18px] animate-spin text-white" />
                    <span>Verifying credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to console</span>
                    <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="mt-1 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500">
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
            <form
              id="auth-register-brand-form"
              onSubmit={handleRegisterBrand}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-company-name" className={labelCls}>
                    Company name *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-name"
                      required
                      type="text"
                      autoComplete="organization"
                      placeholder="Enter your registered company name"
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      className={inputCls}
                    />
                    <Building2 className={iconCls} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-company-number" className={labelCls}>
                    Company registration or tax ID *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-number"
                      required
                      type="text"
                      placeholder="Enter your registration or tax ID"
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
                  Company registered address
                </label>
                <div className="relative">
                  <input
                    id="reg-company-address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Enter street, city, state, and postal code"
                    value={regCompanyAddress}
                    onChange={(e) => setRegCompanyAddress(e.target.value)}
                    className={`${inputCls} pl-4`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-country-select" className={visibleLabelCls}>
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
                  <label htmlFor="reg-industry-category" className={visibleLabelCls}>
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
                <div className="space-y-2 border border-[#e2ded5] bg-[#f7f4ed] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="reg-custom-category"
                      className="text-xs font-semibold text-zinc-700"
                    >
                      Custom industry / product category *
                    </label>
                    <span className="shrink-0 bg-[#e9dfc3] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#6f5a27]">
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
                    className="h-12 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-[#c9a84c]/30"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-company-email" className={labelCls}>
                    Company email *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-email"
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your company email address"
                      value={regCompanyEmail}
                      onChange={(e) => setRegCompanyEmail(e.target.value)}
                      className={inputCls}
                    />
                    <Mail className={iconCls} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-company-phone" className={labelCls}>
                    Company phone <span className="font-normal text-zinc-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-company-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Enter your company phone number"
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
                    Create password *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password-input"
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a password (minimum 6 characters)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className={inputCls}
                    />
                    <Lock className={iconCls} />
                  </div>
                </div>

                <div>
                  <span className={visibleLabelCls}>
                    Registration doc <span className="font-normal text-zinc-400">(Optional)</span>
                  </span>
                  <label
                    htmlFor="reg-company-doc-input"
                    className={`flex h-12 cursor-pointer items-center justify-between gap-2 border border-dashed px-3 transition-colors ${
                      uploadedDocName
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-zinc-300 bg-white hover:border-zinc-700"
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
                className={`flex items-start gap-3 border p-3 transition-colors ${
                  regAcceptedTerms
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-zinc-200 bg-zinc-50"
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
                    className="font-semibold text-zinc-950 underline underline-offset-2 decoration-[#c9a84c] hover:text-[#806a32]"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and confirm that all information provided is accurate.
                </label>
              </div>

              {/* Free codes benefit banner */}
              <div className="flex items-center justify-between gap-3 border border-[#e2ded5] bg-[#f7f4ed] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Gift className="w-[18px] h-[18px] shrink-0" />
                  <span>20 complimentary tags on registration</span>
                </span>
                <span className="shrink-0 bg-[#1a1a1e] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  Free tier
                </span>
              </div>

              <button
                id="btn-submit-brand-registration"
                type="submit"
                disabled={submitting}
                className="group flex h-12 w-full items-center justify-center gap-2 bg-[#356fd6] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#285fbd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiAnalyzing ? (
                  <>
                    <Sparkles className="w-[18px] h-[18px] animate-spin text-white" />
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
    </div>
  );
};
