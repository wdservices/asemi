import React, { useState } from "react";
import { asemiStore } from "@/lib/asemiStore";
import { fb as supabase } from "@/integrations/firebase/client";
import {
  Building2,
  Lock,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Shield,
  UserCheck,
} from "lucide-react";

export interface AuthCardProps {
  initialMode?: "login" | "register";
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export type AuthTargetRole = "COMPANY" | "ADMIN";

export const AuthCard: React.FC<AuthCardProps> = ({
  initialMode = "login",
  onSuccess,
  onClose: _onClose,
  isModal: _isModal = false,
}) => {
  const [activeMode, setActiveMode] = useState<"login" | "register">(initialMode);
  const [targetRole, setTargetRole] = useState<AuthTargetRole>("COMPANY");

  // Company Registration Form Fields
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regCompanyEmail, setRegCompanyEmail] = useState("");
  const [regCompanyPhone, setRegCompanyPhone] = useState("");
  const [regCompanyNumber, setRegCompanyNumber] = useState("");
  const [companyCountryCode, setCompanyCountryCode] = useState("NG");
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>("");

  // Admin Registration Form Fields
  const [regAdminName, setRegAdminName] = useState("");
  const [regAdminEmail, setRegAdminEmail] = useState("");
  const [regAdminKey, setRegAdminKey] = useState("");
  const [regAdminAgency, setRegAdminAgency] = useState("NAFDAC Regulatory Directorate");
  const [regAdminClearanceId, setRegAdminClearanceId] = useState("");
  const [adminJurisdiction, setAdminJurisdiction] = useState("NG");

  // Sign In Form Fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginJurisdiction, setLoginJurisdiction] = useState("NG");

  // Processing & Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const companies = asemiStore.getState().companies;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocName(file.name);
      const url = URL.createObjectURL(file);
      setDocPreviewUrl(url);
    }
  };

  // -------------------------------------------------------------
  // Sign Up Handlers (Company vs Admin)
  // -------------------------------------------------------------
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!regCompanyName.trim() || !regCompanyNumber.trim() || !regCompanyEmail.trim()) {
      setErrorMessage("Please complete all required company registration fields (*).");
      return;
    }

    setSubmitting(true);
    setAiAnalyzing(true);

    try {
      await new Promise((r) => setTimeout(r, 1000));

      const newCompany = asemiStore.registerCompany({
        name: regCompanyName.trim(),
        email: regCompanyEmail.trim(),
        phone: regCompanyPhone.trim(),
        registrationNumber: regCompanyNumber.trim(),
        countryCode: companyCountryCode,
        verificationDocUrl:
          docPreviewUrl ||
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      });

      asemiStore.setActiveCompany(newCompany.id);
      asemiStore.setRole("COMPANY_USER");
      await supabase.auth.signInAs("usr_company_demo_001", regCompanyEmail.trim());

      setAiAnalyzing(false);
      setSubmitting(false);
      setSuccessMessage(
        `Brand account created for ${newCompany.name}. Jurisdiction locked to ${companyCountryCode} (${
          companyCountryCode === "NG" ? "NGN" : "USD"
        }). 20 free codes granted. Redirecting to console…`,
      );

      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage(String(err));
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!regAdminName.trim() || !regAdminEmail.trim() || !regAdminKey.trim()) {
      setErrorMessage("Please complete all required administrative registration fields (*).");
      return;
    }

    setSubmitting(true);
    setAiAnalyzing(true);

    try {
      await new Promise((r) => setTimeout(r, 900));

      asemiStore.setRole("ADMIN");
      await supabase.auth.signInAs("usr_admin_demo_001", regAdminEmail.trim(), ["admin"]);

      setAiAnalyzing(false);
      setSubmitting(false);
      setSuccessMessage(
        `Sovereign administrative clearance granted to ${regAdminName}. Official Agency: ${regAdminAgency}. Entering Sovereign Registry Console…`,
      );

      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage(String(err));
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  // -------------------------------------------------------------
  // Sign In Handlers (Company vs Admin)
  // -------------------------------------------------------------
  const handleLoginCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!loginEmail.trim()) {
      setErrorMessage("Please provide your authorized manufacturer email.");
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((r) => setTimeout(r, 600));

      const match =
        companies.find(
          (c) =>
            c.registrationNumber.toLowerCase() === loginIdentifier.trim().toLowerCase() ||
            c.name.toLowerCase().includes(loginIdentifier.trim().toLowerCase()) ||
            c.id === loginIdentifier.trim(),
        ) || companies[0];

      if (match) {
        asemiStore.setActiveCompany(match.id);
        asemiStore.setRole("COMPANY_USER");
        await supabase.auth.signInAs("usr_company_demo_001", loginEmail || "company@asemi.demo");
      } else {
        asemiStore.setRole("COMPANY_USER");
        await supabase.auth.signInAs("usr_company_demo_001", loginEmail);
      }

      setSubmitting(false);
      setSuccessMessage(`Authenticated as ${match?.name || "Manufacturer"}. Opening dashboard…`);

      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch (err) {
      console.error(err);
      setErrorMessage(String(err));
      setSubmitting(false);
    }
  };

  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!loginEmail.trim()) {
      setErrorMessage("Please enter your sovereign administrative work email.");
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((r) => setTimeout(r, 600));

      asemiStore.setRole("ADMIN");
      await supabase.auth.signInAs("usr_admin_demo_001", loginEmail.trim(), ["admin"]);

      setSubmitting(false);
      setSuccessMessage("Sovereign administrator clearance authenticated. Entering console…");

      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch (err) {
      console.error(err);
      setErrorMessage(String(err));
      setSubmitting(false);
    }
  };

  // 1-click test fillers
  const handleSelectDemoCompany = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;

    setTargetRole("COMPANY");
    setLoginIdentifier(comp.registrationNumber);
    setLoginEmail(`auth@${comp.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`);
    setLoginPassword("asemi_vault_2026_secured");
    setLoginJurisdiction(comp.countryCode);

    asemiStore.setActiveCompany(comp.id);
    asemiStore.setRole("COMPANY_USER");
    supabase.auth.signInAs(
      "usr_company_demo_001",
      `auth@${comp.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    );

    setSuccessMessage(`Verified credentials loaded for ${comp.name}. Accessing dashboard…`);
    setTimeout(() => {
      onSuccess?.();
    }, 600);
  };

  const handleSelectDemoAdmin = () => {
    setTargetRole("ADMIN");
    setLoginEmail("admin@asemi.demo");
    setLoginPassword("asemi_admin_master_clearance_2026");

    asemiStore.setRole("ADMIN");
    supabase.auth.signInAs("usr_admin_demo_001", "admin@asemi.demo", ["admin"]);

    setSuccessMessage(
      "Administrator clearance verified. Redirecting to sovereign registry console…",
    );
    setTimeout(() => {
      onSuccess?.();
    }, 600);
  };

  return (
    <div
      id="asemi-auth-card"
      className="bg-[#fafaf8] border border-[#d9d4c7] w-full max-w-xl shadow-xl transition-all duration-200"
    >
      {/* Top Security Banner */}
      <div className="bg-[#1a1a1e] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase">
          <ShieldCheck className="w-4 h-4 text-[#c9a84c]" />
          <span>Asemi Sovereign Auth Gateway</span>
        </div>
        <span className="text-[10px] font-mono text-[#c9a84c] border border-[#c9a84c]/40 px-2 py-0.5 rounded-sm">
          256-Bit Vault Verified
        </span>
      </div>

      <div className="p-6 sm:p-8">
        {/* Header Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            {targetRole === "ADMIN" ? (
              <Shield className="w-5 h-5 text-[#c9a84c]" />
            ) : (
              <Building2 className="w-5 h-5 text-[#c9a84c]" />
            )}
            <h2 className="text-xl font-bold text-[#1a1a1e] tracking-tight font-display">
              {activeMode === "register"
                ? targetRole === "ADMIN"
                  ? "Sovereign Administrator Registration"
                  : "Manufacturer Brand Registration"
                : targetRole === "ADMIN"
                  ? "Registry Administrator Sign In"
                  : "Manufacturer Sign In"}
            </h2>
          </div>
          <p className="text-xs text-[#6e6e7a] leading-relaxed">
            {activeMode === "register"
              ? targetRole === "ADMIN"
                ? "Register verified administrative personnel or regulatory agency staff for counterfeit monitoring and registry governance."
                : "Register your enterprise brand to mint tamper-evident NFC & QR verification tags with region-locked currency guarantees."
              : targetRole === "ADMIN"
                ? "Enter your sovereign clearance credentials to review flagged codes, verify companies, and manage cryptographic ledger nodes."
                : "Enter your authorized manufacturer credentials to mint codes, manage packaging runs, and view live consumer scan metrics."}
          </p>
        </div>

        {/* Mode Switcher: Sign In vs Sign Up */}
        <div
          id="auth-mode-tabs"
          className="grid grid-cols-2 border border-[#d9d4c7] bg-[#ede8df]/50 p-1 mb-4 rounded-md font-mono text-xs"
        >
          <button
            id="tab-btn-signin"
            type="button"
            onClick={() => {
              setActiveMode("login");
              setErrorMessage("");
            }}
            className={`py-2 px-3 text-center transition-all font-semibold rounded ${
              activeMode === "login"
                ? "bg-white text-[#1a1a1e] shadow-sm border border-[#d9d4c7]"
                : "text-[#6e6e7a] hover:text-[#1a1a1e] hover:bg-white/40"
            }`}
          >
            Sign In to Account
          </button>
          <button
            id="tab-btn-register"
            type="button"
            onClick={() => {
              setActiveMode("register");
              setErrorMessage("");
            }}
            className={`py-2 px-3 text-center transition-all font-semibold rounded ${
              activeMode === "register"
                ? "bg-white text-[#1a1a1e] shadow-sm border border-[#d9d4c7]"
                : "text-[#6e6e7a] hover:text-[#1a1a1e] hover:bg-white/40"
            }`}
          >
            Sign Up New Entity
          </button>
        </div>

        {/* Account Role Selector: Company vs Administrator */}
        <div className="mb-6">
          <label className="block font-mono text-[10px] text-[#78716c] uppercase mb-1.5 font-semibold">
            Account Type / Clearance Level
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              id="role-select-company"
              type="button"
              onClick={() => {
                setTargetRole("COMPANY");
                setErrorMessage("");
              }}
              className={`p-2.5 border text-left flex items-center gap-2.5 rounded-sm transition-all ${
                targetRole === "COMPANY"
                  ? "border-[#1a1a1e] bg-white text-[#1a1a1e] shadow-sm font-bold ring-1 ring-[#1a1a1e]"
                  : "border-[#d9d4c7] bg-[#ede8df]/30 text-[#6e6e7a] hover:text-[#1a1a1e] hover:bg-white"
              }`}
            >
              <Building2
                className={`w-4 h-4 ${targetRole === "COMPANY" ? "text-[#c9a84c]" : "text-[#78716c]"}`}
              />
              <div>
                <div className="text-xs">Company / Brand</div>
                <div className="text-[10px] font-normal text-[#78716c]">Packaging Manufacturer</div>
              </div>
            </button>

            <button
              id="role-select-admin"
              type="button"
              onClick={() => {
                setTargetRole("ADMIN");
                setErrorMessage("");
              }}
              className={`p-2.5 border text-left flex items-center gap-2.5 rounded-sm transition-all ${
                targetRole === "ADMIN"
                  ? "border-[#1a1a1e] bg-white text-[#1a1a1e] shadow-sm font-bold ring-1 ring-[#1a1a1e]"
                  : "border-[#d9d4c7] bg-[#ede8df]/30 text-[#6e6e7a] hover:text-[#1a1a1e] hover:bg-white"
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${targetRole === "ADMIN" ? "text-[#c9a84c]" : "text-[#78716c]"}`}
              />
              <div>
                <div className="text-xs">Administrator</div>
                <div className="text-[10px] font-normal text-[#78716c]">Registry & Compliance</div>
              </div>
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mb-5 p-3.5 bg-[#fdf2f2] border border-[#f8b4b4] text-[#9b1c1c] text-xs flex items-center gap-2.5 rounded"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage ? (
          <div
            id="auth-success-banner"
            className="mb-5 p-5 bg-[#f0f8f3] border border-[#a6d8b6] text-[#144729] text-center space-y-2 rounded"
          >
            <CheckCircle2 className="w-8 h-8 text-[#2e8b57] mx-auto animate-bounce" />
            <h4 className="font-bold text-sm text-[#144729]">Operation Successful</h4>
            <p className="text-xs leading-relaxed">{successMessage}</p>
          </div>
        ) : activeMode === "register" ? (
          /* ======================================================= */
          /* REGISTRATION FORM: COMPANY OR ADMIN                     */
          /* ======================================================= */
          targetRole === "COMPANY" ? (
            <form
              id="auth-register-company-form"
              onSubmit={handleRegisterCompany}
              className="space-y-4 text-xs"
            >
              <div>
                <label
                  htmlFor="reg-company-name"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Legal Company Name *
                </label>
                <input
                  id="reg-company-name"
                  required
                  type="text"
                  placeholder="e.g. Sterling Pharmaceuticals Ltd"
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-company-email"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Authorized Work Email *
                  </label>
                  <input
                    id="reg-company-email"
                    required
                    type="email"
                    placeholder="compliance@sterling-pharma.com"
                    value={regCompanyEmail}
                    onChange={(e) => setRegCompanyEmail(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-company-phone"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Contact Phone *
                  </label>
                  <input
                    id="reg-company-phone"
                    required
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={regCompanyPhone}
                    onChange={(e) => setRegCompanyPhone(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-company-number"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Official Registration Number (CAC / RC / Tax ID) *
                </label>
                <input
                  id="reg-company-number"
                  required
                  type="text"
                  placeholder="RC-849201"
                  value={regCompanyNumber}
                  onChange={(e) => setRegCompanyNumber(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 font-mono text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-company-country"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Operating Jurisdiction (Region-Locked Pricing) *
                </label>
                <select
                  id="reg-company-country"
                  value={companyCountryCode}
                  onChange={(e) => setCompanyCountryCode(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                >
                  <option value="NG">🇳🇬 Nigeria — Region-locked in NGN (₦12 / code flat)</option>
                  <option value="US">
                    🇺🇸 United States / International — USD ($0.008 / code flat)
                  </option>
                  <option value="GB">🇬🇧 United Kingdom — USD Equivalent</option>
                  <option value="GH">🇬🇭 Ghana — USD Equivalent</option>
                  <option value="KE">🇰🇪 Kenya — USD Equivalent</option>
                  <option value="ZA">🇿🇦 South Africa — USD Equivalent</option>
                </select>
                <p className="mt-1 text-[10px] text-[#b86d14]">
                  Permanent lock: Nigerian entities settle in NGN; international accounts settle in
                  USD.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-file-upload"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Upload Business Certificate / CAC Document *
                </label>
                <div className="border border-dashed border-[#cfc9be] bg-[#fafaf8] p-4 text-center hover:bg-[#f5f0e8]/60 transition-colors relative cursor-pointer rounded-sm">
                  <input
                    id="reg-file-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-[#78716c] mx-auto mb-1.5" />
                  {uploadedDocName ? (
                    <div className="flex items-center justify-center gap-2 text-[#1a1a1e] font-mono text-xs font-semibold">
                      <FileText className="w-4 h-4 text-[#c9a84c]" />
                      <span>{uploadedDocName}</span>
                      <span className="text-[10px] bg-[#f0f8f3] text-[#2e8b57] px-1.5 py-0.5 rounded">
                        Ready for OCR
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-[#1a1a1e]">
                        Drop CAC / Incorporation Document or Browse
                      </p>
                      <p className="text-[10px] text-[#78716c] mt-0.5">
                        PDF, JPG, or PNG up to 10MB. Automated OCR extracts business metadata.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#ede8df] border border-[#d9d4c7] flex items-center gap-2 text-xs rounded-sm">
                <Sparkles className="w-4 h-4 text-[#c9a84c] shrink-0" />
                <span className="text-[#2b2b32]">
                  <strong>20 Free Codes Included:</strong> Unlocked immediately upon ledger
                  activation.
                </span>
              </div>

              <button
                id="btn-submit-register-company"
                type="submit"
                disabled={submitting}
                className="btn btn-fill w-full py-3.5 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2"
              >
                {aiAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#c9a84c]" />
                    <span>Validating Corporate Registry & OCR…</span>
                  </>
                ) : submitting ? (
                  <span>Submitting Registration…</span>
                ) : (
                  <>
                    <span>Register Company Account & Claim 20 Codes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ADMIN REGISTRATION FORM */
            <form
              id="auth-register-admin-form"
              onSubmit={handleRegisterAdmin}
              className="space-y-4 text-xs"
            >
              <div>
                <label
                  htmlFor="reg-admin-name"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Administrator Full Name *
                </label>
                <input
                  id="reg-admin-name"
                  required
                  type="text"
                  placeholder="e.g. Dr. Alistair Vance or Inspector Chinedu"
                  value={regAdminName}
                  onChange={(e) => setRegAdminName(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-admin-email"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Official Agency Email *
                  </label>
                  <input
                    id="reg-admin-email"
                    required
                    type="email"
                    placeholder="compliance@asemi.gov or admin@asemi.org"
                    value={regAdminEmail}
                    onChange={(e) => setRegAdminEmail(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-admin-key"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Master Passphrase / Key *
                  </label>
                  <input
                    id="reg-admin-key"
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={regAdminKey}
                    onChange={(e) => setRegAdminKey(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] font-mono focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-admin-agency"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Oversight Agency / Directorate *
                </label>
                <select
                  id="reg-admin-agency"
                  value={regAdminAgency}
                  onChange={(e) => setRegAdminAgency(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                >
                  <option value="NAFDAC Regulatory Directorate">
                    NAFDAC Regulatory & Anti-Counterfeit Directorate
                  </option>
                  <option value="Standards Organisation of Nigeria (SON)">
                    Standards Organisation of Nigeria (SON)
                  </option>
                  <option value="Sovereign Cryptographic Root Authority">
                    Sovereign Cryptographic Root Authority
                  </option>
                  <option value="Federal Anti-Fraud Taskforce">
                    Federal Anti-Fraud & Enforcement Taskforce
                  </option>
                  <option value="International Brand Security Consortium">
                    International Brand Security Consortium
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-admin-clearance"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Clearance ID / Staff Badge #
                  </label>
                  <input
                    id="reg-admin-clearance"
                    type="text"
                    placeholder="AS-EXEC-8491"
                    value={regAdminClearanceId}
                    onChange={(e) => setRegAdminClearanceId(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] font-mono focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-admin-jurisdiction"
                    className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                  >
                    Administrative Scope
                  </label>
                  <select
                    id="reg-admin-jurisdiction"
                    value={adminJurisdiction}
                    onChange={(e) => setAdminJurisdiction(e.target.value)}
                    className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                  >
                    <option value="NG">Federal Republic of Nigeria (Sovereign)</option>
                    <option value="ECOWAS">ECOWAS Regional West Africa</option>
                    <option value="GLOBAL">Global / Multi-National Root</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#ede8df] border border-[#d9d4c7] flex items-center gap-2 text-xs rounded-sm">
                <ShieldCheck className="w-4 h-4 text-[#c9a84c] shrink-0" />
                <span className="text-[#2b2b32]">
                  <strong>Immutable Audit Trail:</strong> All administrative code reviews and batch
                  approvals are signed to the sovereign ledger.
                </span>
              </div>

              <button
                id="btn-submit-register-admin"
                type="submit"
                disabled={submitting}
                className="btn btn-fill w-full py-3.5 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2"
              >
                {aiAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-[#c9a84c]" />
                    <span>Verifying Regulatory Clearance Keys…</span>
                  </>
                ) : submitting ? (
                  <span>Registering Administrator…</span>
                ) : (
                  <>
                    <span>Register Administrator & Grant Clearance</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )
        ) : /* ======================================================= */
        /* SIGN IN FORM: COMPANY OR ADMIN                          */
        /* ======================================================= */
        targetRole === "COMPANY" ? (
          <form
            id="auth-login-company-form"
            onSubmit={handleLoginCompany}
            className="space-y-4 text-xs"
          >
            <div>
              <label
                htmlFor="login-company-identifier"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
              >
                Registered Company or RC Number *
              </label>
              <input
                id="login-company-identifier"
                required
                type="text"
                placeholder="e.g. Sterling Pharmaceuticals or RC-849201"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="login-company-email"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
              >
                Authorized Work Email *
              </label>
              <input
                id="login-company-email"
                required
                type="email"
                placeholder="compliance@sterling-pharma.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-company-password"
                  className="font-mono text-[11px] text-[#6e6e7a] uppercase font-medium"
                >
                  Access Key or Security Passphrase *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Demo environment: Select any registered brand below to auto-authenticate with zero friction.",
                    )
                  }
                  className="text-[10px] text-[#c9a84c] hover:underline font-mono"
                >
                  Forgot Key?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-company-password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 pr-10 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1a1a1e]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="login-company-jurisdiction"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
                >
                  Operating Jurisdiction
                </label>
                <select
                  id="login-company-jurisdiction"
                  value={loginJurisdiction}
                  onChange={(e) => setLoginJurisdiction(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                >
                  <option value="NG">🇳🇬 Nigeria (NGN - ₦)</option>
                  <option value="US">🇺🇸 International (USD - $)</option>
                </select>
              </div>

              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#2b2b32]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-[#1a1a1e] rounded"
                  />
                  <span>Remember this device</span>
                </label>
              </div>
            </div>

            <div className="p-3 bg-[#ede8df] border border-[#d9d4c7] flex items-center gap-2 text-xs rounded-sm">
              <Lock className="w-4 h-4 text-[#c9a84c] shrink-0" />
              <span className="text-[#2b2b32]">
                <strong>Encrypted Session:</strong> Cryptographic token signing ensures zero code
                duplication.
              </span>
            </div>

            <button
              id="btn-submit-login-company"
              type="submit"
              disabled={submitting}
              className="btn btn-fill w-full py-3.5 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Authenticating Company Credentials…</span>
              ) : (
                <>
                  <span>Sign In to Manufacturer Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ADMIN SIGN IN FORM */
          <form
            id="auth-login-admin-form"
            onSubmit={handleLoginAdmin}
            className="space-y-4 text-xs"
          >
            <div>
              <label
                htmlFor="login-admin-email"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1.5 font-medium"
              >
                Sovereign Administrator Email *
              </label>
              <input
                id="login-admin-email"
                required
                type="email"
                placeholder="admin@asemi.demo or compliance@asemi.gov"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-admin-password"
                  className="font-mono text-[11px] text-[#6e6e7a] uppercase font-medium"
                >
                  Master Clearance Key / Security Passphrase *
                </label>
                <button
                  type="button"
                  onClick={handleSelectDemoAdmin}
                  className="text-[10px] text-[#c9a84c] hover:underline font-mono"
                >
                  Fill Demo Key
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-admin-password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] px-3 py-2.5 pr-10 text-[#1a1a1e] focus:outline-none focus:border-[#1a1a1e] focus:ring-1 focus:ring-[#1a1a1e] transition-colors rounded-sm font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1a1a1e]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#ede8df] border border-[#d9d4c7] flex items-center gap-2 text-xs rounded-sm">
              <ShieldCheck className="w-4 h-4 text-[#c9a84c] shrink-0" />
              <span className="text-[#2b2b32]">
                <strong>Root Privilege Access:</strong> Administrative clearance permits entity
                approvals, batch audits, and fraud counter-measures.
              </span>
            </div>

            <button
              id="btn-submit-login-admin"
              type="submit"
              disabled={submitting}
              className="btn btn-fill w-full py-3.5 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Authenticating Administrative Clearance…</span>
              ) : (
                <>
                  <span>Authenticate Sovereign Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick-Access Test Identities */}
        <div className="pt-4 mt-6 border-t border-[#e2ded5] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#6e6e7a] uppercase font-semibold">
              ⚡ Pre-Verified Test Accounts (1-Click Fill)
            </span>
            <span className="font-mono text-[10px] text-[#c9a84c]">Instant Demo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {companies.slice(0, 2).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectDemoCompany(c.id)}
                className="w-full text-left p-2.5 bg-white border border-[#e2ded5] hover:border-[#1a1a1e] hover:bg-[#fafaf8] transition-all rounded-sm group flex flex-col justify-between"
              >
                <div className="font-bold text-[#1a1a1e] text-xs group-hover:text-[#c9a84c] transition-colors line-clamp-1">
                  {c.name}
                </div>
                <div className="text-[10px] font-mono text-[#78716c] flex items-center justify-between mt-1">
                  <span>{c.countryCode} • Brand</span>
                  <span className="bg-[#f0f8f3] text-[#2e8b57] px-1 py-0.2 rounded text-[9px] uppercase font-bold">
                    {c.status}
                  </span>
                </div>
              </button>
            ))}

            {/* Sovereign Admin Account Button */}
            <button
              type="button"
              onClick={handleSelectDemoAdmin}
              className="w-full text-left p-2.5 bg-white border border-[#c9a84c]/60 hover:border-[#c9a84c] hover:bg-[#fafaf8] transition-all rounded-sm group sm:col-span-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#c9a84c]" />
                <div>
                  <div className="font-bold text-[#1a1a1e] text-xs group-hover:text-[#c9a84c] transition-colors">
                    Sovereign Registry Administrator (NAFDAC / Root)
                  </div>
                  <div className="text-[10px] font-mono text-[#78716c]">
                    admin@asemi.demo • Full Ledger Access
                  </div>
                </div>
              </div>
              <span className="bg-[#1a1a1e] text-[#c9a84c] px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold">
                ROOT
              </span>
            </button>
          </div>
        </div>

        {/* Security Micro Footer */}
        <div className="mt-6 pt-4 border-t border-[#e2ded5] text-center text-[10px] text-[#78716c] font-mono flex items-center justify-center gap-3">
          <span>256-Bit Elliptic Vault</span>
          <span>•</span>
          <span>Region-Locked Ledger</span>
          <span>•</span>
          <span>FIPS 140-2 Compatible</span>
        </div>
      </div>
    </div>
  );
};
