import React, { useState, useEffect, useCallback } from "react";
import { asemiStore, Product, Company, Batch, Code } from "@/lib/asemiStore";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  Flag,
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  MapPin,
  ExternalLink,
  Smartphone,
  Info,
} from "lucide-react";

interface ConsumerVerificationProps {
  initialCode?: string;
  onBackToApp?: () => void;
}

export const ConsumerVerification: React.FC<ConsumerVerificationProps> = ({
  initialCode = "ASM-9K4T-7X2P",
  onBackToApp,
}) => {
  const [inputCode, setInputCode] = useState(initialCode);
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{
    status: "genuine" | "soft_escalation" | "invalid";
    product?: Product;
    company?: Company;
    batch?: Batch;
    code?: Code;
    scanCount: number;
    distinctVisitors: number;
    isRepeatVisitor: boolean;
    warningMessage?: string;
  } | null>(null);

  // Report Form state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportContact, setReportContact] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Browser token simulation
  const getBrowserToken = () => {
    if (typeof window === "undefined") return "token_default";
    let tok = localStorage.getItem("asemi_consumer_token");
    if (!tok) {
      tok = `tok_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("asemi_consumer_token", tok);
    }
    return tok;
  };

  const handleVerify = useCallback(
    async (codeToTest?: string) => {
      const target = codeToTest || inputCode;
      if (!target.trim()) return;

      setVerifying(true);
      setReportSubmitted(false);

      try {
        // Simulate scan latency
        await new Promise((r) => setTimeout(r, 400));
        const res = await asemiStore.verifyCode({
          codeString: target,
          browserToken: getBrowserToken(),
          roughLocation: "Consumer Scanner / Lagos, NG",
          deviceFingerprint: typeof navigator !== "undefined" ? navigator.userAgent : "Device",
        });
        setVerifiedResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setVerifying(false);
      }
    },
    [inputCode],
  );

  // Run initial verification on mount
  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode);
    }
  }, [initialCode, handleVerify]);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedResult?.code && !inputCode) return;

    asemiStore.submitReport({
      codeId: verifiedResult?.code?.id || inputCode,
      codeString: verifiedResult?.code?.codeString || inputCode,
      companyId: verifiedResult?.company?.id || "comp_unknown",
      productName: verifiedResult?.product?.name || "Reported Product",
      message: reportMessage,
      contact: reportContact,
    });

    setReportSubmitted(true);
    setShowReportModal(false);
    setReportMessage("");
    setReportContact("");
  };

  return (
    <div className="bg-[#fafaf8] text-[#1c1a17] min-h-screen py-10 px-4 sm:px-6 selection:bg-[#c9a84c] selection:text-white">
      <div className="max-w-[760px] mx-auto">
        {/* Header / Nav */}
        <div className="flex items-center justify-between border-b border-[#e2ded5] pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a1a1e] flex items-center justify-center text-white font-bold text-base">
              a
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-[#1a1a1e]">Asemi Verify</div>
              <div className="text-[11px] font-mono text-[#6e6e7a] uppercase tracking-wider">
                Official Consumer Product Authentication
              </div>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 text-xs font-mono text-[#6e6e7a] hover:text-[#1a1a1e] border border-[#e2ded5] px-3 py-1.5 bg-white hover:bg-[#f5f0e8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
          )}
        </div>

        {/* Scanner / Code Lookup Box */}
        <div className="bg-white border border-[#e2ded5] p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="code-input"
              className="text-xs font-mono font-bold uppercase tracking-wider text-[#6e6e7a] flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#c9a84c]" />
              <span>Enter Packaging Code or Scan QR</span>
            </label>
            <span className="text-[11px] font-mono text-[#99948a]">No app download required</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="code-input"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. ASM-9K4T-7X2P"
              className="flex-1 px-4 py-3 border border-[#cfc9be] text-base font-mono font-medium focus:outline-none focus:border-[#1a1a1e] uppercase tracking-wider bg-[#fafaf8]"
            />
            <button
              onClick={() => handleVerify()}
              disabled={verifying}
              className="btn btn-fill px-6 py-3 font-semibold text-sm disabled:opacity-50"
            >
              <span>{verifying ? "Checking Registry…" : "Verify Authenticity"}</span>
            </button>
          </div>

          {/* Quick interactive test chips */}
          <div className="mt-4 pt-4 border-t border-[#f0ece4] flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#888]">
              Test Scenarios:
            </span>
            <button
              onClick={() => {
                setInputCode("ASM-9K4T-7X2P");
                handleVerify("ASM-9K4T-7X2P");
              }}
              className="px-2.5 py-1 bg-[#f5f0e8] hover:bg-[#e8e2d9] border border-[#dfd8cc] font-mono text-[11px] text-[#2e8b57] font-medium"
            >
              ✓ Genuine (Dove Shea Butter)
            </button>
            <button
              onClick={() => {
                setInputCode("ASM-3B8R-9Q1Z");
                handleVerify("ASM-3B8R-9Q1Z");
              }}
              className="px-2.5 py-1 bg-[#fbf5ea] hover:bg-[#f3e6cf] border border-[#eedab2] font-mono text-[11px] text-[#b86d14] font-medium"
            >
              ⚠ Repeat Scans (Soft Warning)
            </button>
            <button
              onClick={() => {
                setInputCode("ASM-FAKE-9999");
                handleVerify("ASM-FAKE-9999");
              }}
              className="px-2.5 py-1 bg-[#faeceb] hover:bg-[#f3d3d1] border border-[#f0b9b6] font-mono text-[11px] text-[#c0392b] font-medium"
            >
              ✕ Unregistered / Fake Code
            </button>
          </div>
        </div>

        {/* Verification Result Display */}
        {verifiedResult && (
          <div className="space-y-6">
            {/* 1. Genuine State */}
            {verifiedResult.status === "genuine" && (
              <div className="bg-[#f0f8f3] border-2 border-[#2e8b57] p-6 text-[#144729]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#2e8b57] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-widest bg-[#2e8b57] text-white px-2 py-0.5 font-bold">
                        100% Genuine Product
                      </span>
                      {verifiedResult.isRepeatVisitor && (
                        <span className="text-[11px] font-mono text-[#2e8b57] bg-white px-2 py-0.5 border border-[#2e8b57]">
                          Scanned by you before
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-[#0c2e19] mt-1.5">
                      {verifiedResult.product?.name}
                    </h2>
                    <p className="text-xs text-[#1e5c36] mt-1">
                      Verified by{" "}
                      <strong className="underline">{verifiedResult.company?.name}</strong> via
                      official manufacturer registry.
                    </p>
                  </div>
                </div>

                {/* Product spec list */}
                <div className="mt-6 pt-5 border-t border-[#c6e5d2] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-[#3c7d56] uppercase text-[10px]">Category</div>
                    <div className="font-semibold text-[#0c2e19] mt-0.5">
                      {verifiedResult.product?.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#3c7d56] uppercase text-[10px]">Batch ID</div>
                    <div className="font-semibold text-[#0c2e19] mt-0.5">
                      {verifiedResult.batch?.id.replace("batch_", "B-").toUpperCase() || "B-101"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#3c7d56] uppercase text-[10px]">Total Scans</div>
                    <div className="font-semibold text-[#0c2e19] mt-0.5">
                      {verifiedResult.scanCount} scan{verifiedResult.scanCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#3c7d56] uppercase text-[10px]">Verification Date</div>
                    <div className="font-semibold text-[#0c2e19] mt-0.5">Today</div>
                  </div>
                </div>

                {verifiedResult.product?.description && (
                  <p className="mt-4 text-xs font-sans text-[#255e39] bg-white/70 p-3 border border-[#c6e5d2]">
                    {verifiedResult.product.description}
                  </p>
                )}
              </div>
            )}

            {/* 2. Soft Warning State (Repeat distinct visitor scans) */}
            {verifiedResult.status === "soft_escalation" && (
              <div className="bg-[#fff9ef] border-2 border-[#d4830a] p-6 text-[#613b03]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#d4830a] text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-widest bg-[#d4830a] text-white px-2 py-0.5 font-bold">
                        Warning: Checked Multiple Times
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#452900] mt-1.5">
                      {verifiedResult.product?.name}
                    </h2>
                    <p className="text-sm text-[#734706] mt-1">{verifiedResult.warningMessage}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-6 pt-4 border-t border-[#f0d6aa] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-[#945f13] uppercase text-[10px]">Manufacturer</div>
                    <div className="font-semibold text-[#3b2302]">
                      {verifiedResult.company?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#945f13] uppercase text-[10px]">Distinct Scanners</div>
                    <div className="font-semibold text-[#3b2302]">
                      {verifiedResult.distinctVisitors} different phones/locations
                    </div>
                  </div>
                  <div>
                    <div className="text-[#945f13] uppercase text-[10px]">Total Scans</div>
                    <div className="font-semibold text-[#3b2302]">{verifiedResult.scanCount}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="bg-[#d4830a] hover:bg-[#b56e07] text-white px-4 py-2 text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Suspicious Item</span>
                  </button>
                  <span className="text-xs text-[#734706] self-center">
                    Help Asemi and the manufacturer stop counterfeiters.
                  </span>
                </div>
              </div>
            )}

            {/* 3. Invalid / Not Recognised State */}
            {verifiedResult.status === "invalid" && (
              <div className="bg-[#fff5f5] border-2 border-[#c0392b] p-6 text-[#52130d]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#c0392b] text-white flex items-center justify-center shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-mono uppercase tracking-widest bg-[#c0392b] text-white px-2 py-0.5 font-bold">
                      Unverified Code
                    </span>
                    <h2 className="text-xl font-bold text-[#3d0d08] mt-1.5">
                      Code Not Found in Registry
                    </h2>
                    <p className="text-sm text-[#6e2017] mt-1">
                      The code <strong className="font-mono">{inputCode}</strong> does not exist in
                      the official Asemi manufacturer registry. The packaging may be counterfeit or
                      the code was mistyped.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#f0c3bf] flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="bg-[#c0392b] hover:bg-[#9c2d21] text-white px-4 py-2 text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Counterfeit Packaging</span>
                  </button>
                  <span className="text-xs text-[#6e2017] self-center">
                    Let us investigate where this product was sold.
                  </span>
                </div>
              </div>
            )}

            {/* Confirmation when report is submitted */}
            {reportSubmitted && (
              <div className="p-4 bg-[#eef7f1] border border-[#a2d8b5] text-[#144729] text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2e8b57]" />
                <span>
                  Thank you. Your report has been dispatched to our fraud desk and the brand's
                  security team.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Consumer Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#c0392b]" />
                  <span className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                    Report Suspicious Item
                  </span>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label
                    htmlFor="report-code"
                    className="block text-[11px] font-mono text-[#6e6e7a] uppercase mb-1"
                  >
                    Product Code
                  </label>
                  <input
                    id="report-code"
                    type="text"
                    readOnly
                    value={verifiedResult?.code?.codeString || inputCode}
                    className="w-full bg-[#f5f0e8] border border-[#d8d2c6] px-3 py-2 text-xs font-mono text-[#1a1a1e]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="report-message"
                    className="block text-[11px] font-mono text-[#6e6e7a] uppercase mb-1"
                  >
                    What felt wrong? Where did you purchase this? *
                  </label>
                  <textarea
                    id="report-message"
                    required
                    rows={4}
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="e.g. Bought at a market stall in Ikeja. The packaging foil looked blurry and seal was already broken."
                    className="w-full border border-[#cfc9be] p-3 text-xs focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="report-contact"
                    className="block text-[11px] font-mono text-[#6e6e7a] uppercase mb-1"
                  >
                    Your Phone or Email (Optional, for investigation updates)
                  </label>
                  <input
                    id="report-contact"
                    type="text"
                    value={reportContact}
                    onChange={(e) => setReportContact(e.target.value)}
                    placeholder="name@example.com or +234..."
                    className="w-full border border-[#cfc9be] px-3 py-2 text-xs focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#1a1a1e] text-white py-2.5 text-xs font-mono font-bold hover:bg-[#b8962e] transition-colors"
                  >
                    Submit Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="border border-[#cfc9be] px-4 py-2.5 text-xs font-mono hover:bg-[#f5f0e8]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
