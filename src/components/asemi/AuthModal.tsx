import React, { useState } from "react";
import { asemiStore, COUNTRIES } from "@/lib/asemiStore";
import {
  Building2,
  Lock,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";

interface AuthModalProps {
  mode: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, isOpen, onClose, onSuccess }) => {
  const [activeMode, setActiveMode] = useState<"login" | "register">(mode);

  // Registration Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [countrySearch, setCountrySearch] = useState("");
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>("");

  // Processing state
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  // Filter countries for combobox
  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(([c]) => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocName(file.name);
      const url = URL.createObjectURL(file);
      setDocPreviewUrl(url);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !registrationNumber.trim()) return;

    setSubmitting(true);
    setAiAnalyzing(true);

    try {
      // Simulate AI document extraction & cross-check latency
      await new Promise((r) => setTimeout(r, 1200));

      const newCompany = asemiStore.registerCompany({
        name,
        email,
        phone,
        registrationNumber,
        countryCode,
        verificationDocUrl:
          docPreviewUrl ||
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      });

      setAiAnalyzing(false);
      setSubmitting(false);
      setSuccessMessage(
        `Company registered successfully! Your account is in PENDING review with ${countryCode} pricing locked.`,
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
      alert("Error: " + err);
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  const handleQuickLogin = (companyId: string) => {
    asemiStore.setActiveCompany(companyId);
    asemiStore.setRole("COMPANY_USER");
    onSuccess();
    onClose();
  };

  const companies = asemiStore.getState().companies;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#1a1a1e] max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#c9a84c]" />
            <span className="font-bold text-base text-[#1a1a1e]">
              {activeMode === "register" ? "Manufacturer Registration" : "Manufacturer Sign In"}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black font-mono text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#e2ded5] mb-5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveMode("register")}
            className={`flex-1 py-2 font-bold ${
              activeMode === "register"
                ? "border-b-2 border-[#1a1a1e] text-[#1a1a1e]"
                : "text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            Create Brand Account
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("login")}
            className={`flex-1 py-2 font-bold ${
              activeMode === "login"
                ? "border-b-2 border-[#1a1a1e] text-[#1a1a1e]"
                : "text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            Access Existing Brand
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage ? (
          <div className="p-6 bg-[#f0f8f3] border border-[#c6e5d2] text-[#144729] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#2e8b57] mx-auto" />
            <h4 className="font-bold text-sm">Registration Submitted</h4>
            <p className="text-xs">{successMessage}</p>
          </div>
        ) : activeMode === "register" ? (
          /* ===================================== */
          /* REGISTER FORM                         */
          /* ===================================== */
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="auth-company-name"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1"
              >
                Legal Company Name *
              </label>
              <input
                id="auth-company-name"
                required
                type="text"
                placeholder="e.g. Sterling Pharmaceuticals Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1"
                >
                  Corporate Email *
                </label>
                <input
                  id="auth-email"
                  required
                  type="email"
                  placeholder="compliance@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-phone"
                  className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1"
                >
                  Phone Number *
                </label>
                <input
                  id="auth-phone"
                  required
                  type="tel"
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-registration-number"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1"
              >
                CAC / Business Registration RC Number *
              </label>
              <input
                id="auth-registration-number"
                required
                type="text"
                placeholder="e.g. RC-982341 or EIN / Companies House ID"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full border border-[#cfc9be] p-2.5 font-mono focus:outline-none focus:border-[#1a1a1e]"
              />
            </div>

            {/* Country Selection Combobox */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-country-select"
                  className="font-mono text-[11px] text-[#6e6e7a] uppercase"
                >
                  Country of Legal Incorporation (Region Lock) *
                </label>
                <span className="text-[10px] font-mono text-[#c9a84c] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked to certificate
                </span>
              </div>

              <input
                type="text"
                placeholder="Search country (e.g. Nigeria, United States)..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full border border-[#cfc9be] p-2 text-xs mb-1.5 focus:outline-none font-mono"
              />

              <select
                id="auth-country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full border border-[#cfc9be] p-2.5 font-mono bg-white focus:outline-none"
              >
                {filteredCountries.slice(0, 40).map(([cName, cCode]) => (
                  <option key={cCode} value={cCode}>
                    {cName} ({cCode}) — {cCode === "NG" ? "NGN Currency" : "USD Currency"}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Upload */}
            <div>
              <label
                htmlFor="auth-cert-upload"
                className="block font-mono text-[11px] text-[#6e6e7a] uppercase mb-1"
              >
                Upload Business Certificate / CAC Document *
              </label>
              <div className="border-2 border-dashed border-[#cfc9be] p-4 text-center bg-[#fafaf8] hover:bg-[#f5f0e8] transition-colors relative cursor-pointer">
                <input
                  id="auth-cert-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 text-[#78716c] mx-auto mb-1" />
                <div className="font-mono text-xs font-semibold text-[#1a1a1e]">
                  {uploadedDocName ? uploadedDocName : "Click or drag certificate here"}
                </div>
                <div className="text-[10px] text-[#78716c] mt-0.5">
                  Automated OCR analyzes the document to assist admin approval.
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1a1a1e] hover:bg-[#b8962e] text-white py-3 font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {aiAnalyzing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Registration Certificate & Running AI Verification…</span>
                </>
              ) : (
                <span>Submit Application & Claim 20 Free Codes</span>
              )}
            </button>
          </form>
        ) : (
          /* ===================================== */
          /* LOGIN / QUICK DEMO ACCOUNTS           */
          /* ===================================== */
          <div className="space-y-4 text-xs">
            <p className="text-[#6e6e7a]">
              Select a registered brand or enter credentials to access your manufacturer dashboard:
            </p>

            <div className="space-y-2">
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleQuickLogin(c.id)}
                  className="w-full text-left p-3 border border-[#e2ded5] hover:border-[#1a1a1e] hover:bg-[#fafaf8] transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#1a1a1e]">{c.name}</div>
                    <div className="text-[11px] font-mono text-[#78716c]">
                      {c.registrationNumber} • {c.countryCode} (
                      {c.countryCode === "NG" ? "NGN" : "USD"})
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase ${
                      c.status === "APPROVED"
                        ? "bg-[#f0f8f3] text-[#2e8b57] border border-[#c6e5d2]"
                        : "bg-[#fff4db] text-[#b86d14] border border-[#ecd299]"
                    }`}
                  >
                    {c.status}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  asemiStore.setRole("ADMIN");
                  onSuccess();
                  onClose();
                }}
                className="text-[#c9a84c] hover:underline font-mono text-xs font-semibold"
              >
                Switch to Administrator Console →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
