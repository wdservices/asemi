import React, { useState } from "react";
import { asemiStore, Company, Report, Scan, Code, Batch, Product } from "@/lib/asemiStore";
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  ArrowRight,
  TrendingUp,
  Inbox,
  Clock,
  Sparkles,
  MapPin,
  Smartphone,
  ExternalLink,
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "queue" | "companies" | "oversight" | "fraud" | "reports" | "metrics"
  >("queue");

  const [storeState, setStoreState] = useState(asemiStore.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected company for detailed inspection & approval
  const [inspectingCompany, setInspectingCompany] = useState<Company | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [confirmedCountry, setConfirmedCountry] = useState("NG");

  // Selected flagged code for scan timeline inspection
  const [inspectingFlaggedCode, setInspectingFlaggedCode] = useState<string | null>(null);

  // Subscribe to store updates
  React.useEffect(() => {
    return asemiStore.subscribe(() => {
      setStoreState({ ...asemiStore.getState() });
    });
  }, []);

  const pendingCompanies = storeState.companies.filter((c) => c.status === "PENDING");
  const approvedCompanies = storeState.companies.filter((c) => c.status === "APPROVED");

  // Filtered companies
  const filteredCompanies = storeState.companies.filter((c) => {
    const matchesQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Flagged scans / codes
  const flaggedScans = storeState.scans.filter((s) => s.flagged);
  const flaggedCodeStrings = Array.from(new Set(flaggedScans.map((s) => s.codeString)));

  // Calculate platform metrics
  const totalCodesIssued = storeState.companies.reduce((acc, c) => acc + c.totalCodesGenerated, 0);
  const totalScans = storeState.scans.length;
  const totalReports = storeState.reports.length;
  const pendingReports = storeState.reports.filter((r) => !r.reviewed).length;

  // Calculate revenue
  const revenueNGN = storeState.transactions
    .filter((t) => t.currency === "NGN" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const revenueUSD = storeState.transactions
    .filter((t) => t.currency === "USD" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const handleApprove = (companyId: string) => {
    asemiStore.approveCompany(
      companyId,
      confirmedCountry,
      adminNoteInput || "Document cross-checked and verified by admin.",
    );
    setInspectingCompany(null);
    setAdminNoteInput("");
  };

  const handleReject = (companyId: string) => {
    if (!adminNoteInput.trim()) {
      alert("Please provide a reason in the Admin Note field before rejecting.");
      return;
    }
    asemiStore.rejectCompany(companyId, adminNoteInput);
    setInspectingCompany(null);
    setAdminNoteInput("");
  };

  const handleRequestInfo = (companyId: string) => {
    if (!adminNoteInput.trim()) {
      alert("Please specify what additional information is required in the Admin Note field.");
      return;
    }
    asemiStore.requestMoreInfo(companyId, adminNoteInput);
    setInspectingCompany(null);
    setAdminNoteInput("");
  };

  return (
    <div className="bg-[#fafaf8] text-[#1c1a17] min-h-screen">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e2ded5] px-6 py-4">
        <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a1a1e] text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#1a1a1e]">
                Asemi Admin Console
              </h1>
              <p className="text-[11px] font-mono text-[#78716c] uppercase tracking-wider">
                Operations, Fraud Review & Entity Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {pendingCompanies.length > 0 && (
              <span className="bg-[#fff4db] text-[#b86d14] border border-[#ecd299] px-2.5 py-1 flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCompanies.length} pending approval</span>
              </span>
            )}
            {flaggedCodeStrings.length > 0 && (
              <span className="bg-[#fceeed] text-[#c0392b] border border-[#f5c6c2] px-2.5 py-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {flaggedCodeStrings.length} flagged code
                  {flaggedCodeStrings.length !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Admin Nav Tabs */}
      <div className="bg-[#f4f2ee] border-b border-[#e2ded5] px-6">
        <div className="max-w-[1240px] mx-auto flex overflow-x-auto text-xs font-mono uppercase tracking-wider font-semibold">
          <button
            onClick={() => setActiveTab("queue")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "queue"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Approval Queue ({pendingCompanies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("companies")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "companies"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Companies Directory ({storeState.companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("oversight")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "oversight"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Products & Batches</span>
          </button>

          <button
            onClick={() => setActiveTab("fraud")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "fraud"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#c0392b]" />
            <span>Fraud Queue ({flaggedCodeStrings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "reports"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Consumer Reports ({pendingReports} new)</span>
          </button>

          <button
            onClick={() => setActiveTab("metrics")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "metrics"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Platform Metrics</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-[1240px] mx-auto p-6">
        {/* ========================================================= */}
        {/* TAB 1: COMPANY APPROVAL QUEUE                             */}
        {/* ========================================================= */}
        {activeTab === "queue" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1a1a1e]">Company Registration Queue</h2>
                <p className="text-xs text-[#78716c]">
                  Review business certificates and AI-assisted cross-references before locking
                  country codes.
                </p>
              </div>
              <span className="text-xs font-mono text-[#78716c]">
                {pendingCompanies.length} awaiting human decision
              </span>
            </div>

            {pendingCompanies.length === 0 ? (
              <div className="bg-white border border-[#e2ded5] p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#2e8b57] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1a1a1e]">All Caught Up</h3>
                <p className="text-xs text-[#78716c] mt-1 max-w-sm mx-auto">
                  There are no pending manufacturer applications in the queue right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingCompanies.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-white border border-[#e2ded5] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#1a1a1e]">{comp.name}</span>
                        <span className="bg-[#fff4db] text-[#b86d14] border border-[#ecd299] text-[10px] font-mono px-2 py-0.5 font-semibold">
                          PENDING APPROVAL
                        </span>
                      </div>
                      <div className="text-xs text-[#78716c] flex flex-wrap gap-4 font-mono">
                        <span>
                          Reg No: <strong>{comp.registrationNumber}</strong>
                        </span>
                        <span>
                          Country: <strong>{comp.countryCode}</strong>
                        </span>
                        <span>
                          Email: <strong>{comp.email}</strong>
                        </span>
                        <span>
                          Phone: <strong>{comp.phone}</strong>
                        </span>
                      </div>

                      {/* AI Review summary pill */}
                      {comp.aiReviewScore !== undefined && (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-[11px] font-mono bg-[#f0f8f3] text-[#2e8b57] border border-[#c6e5d2] px-2 py-0.5 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Check: {comp.aiReviewScore}% match</span>
                          </span>
                          <span className="text-[11px] text-[#78716c]">
                            {comp.aiReviewFlags?.length || 0} automated verification flags
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setInspectingCompany(comp);
                          setConfirmedCountry(comp.countryCode);
                        }}
                        className="bg-[#1a1a1e] hover:bg-[#b8962e] text-white px-4 py-2 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Decide</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COMPANIES DIRECTORY                                */}
        {/* ========================================================= */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by company name, reg number, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#1a1a1e]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#78716c]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-[#cfc9be] px-3 py-2 text-xs font-mono focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NEEDS_INFO">Needs Info</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-[#e2ded5] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f2ee] border-b border-[#e2ded5] font-mono text-[11px] text-[#78716c] uppercase">
                  <tr>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Reg Number</th>
                    <th className="py-3 px-4">Country & Pricing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-4">Codes Issued</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece4]">
                  {filteredCompanies.map((c) => {
                    const prodCount = storeState.products.filter(
                      (p) => p.companyId === c.id,
                    ).length;
                    return (
                      <tr key={c.id} className="hover:bg-[#fafaf8]">
                        <td className="py-3 px-4 font-semibold text-[#1a1a1e]">
                          <div>{c.name}</div>
                          <div className="text-[10px] text-[#78716c] font-mono">{c.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">{c.registrationNumber}</td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-semibold text-[#1a1a1e]">{c.countryCode}</span>
                          <span className="text-[#78716c]">
                            {" "}
                            ({c.countryCode === "NG" ? "NGN" : "USD"})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                              c.status === "APPROVED"
                                ? "bg-[#f0f8f3] text-[#2e8b57] border border-[#c6e5d2]"
                                : c.status === "PENDING"
                                  ? "bg-[#fff4db] text-[#b86d14] border border-[#ecd299]"
                                  : "bg-[#fceeed] text-[#c0392b] border border-[#f5c6c2]"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{prodCount}</td>
                        <td className="py-3 px-4 font-mono">
                          {c.totalCodesGenerated.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              asemiStore.setActiveCompany(c.id);
                              asemiStore.setRole("COMPANY_USER");
                            }}
                            className="text-[#1a1a1e] hover:text-[#b8962e] font-mono font-medium underline"
                          >
                            View as Company →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: OVERSIGHT (PRODUCTS & BATCHES)                     */}
        {/* ========================================================= */}
        {activeTab === "oversight" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e]">Global Batches & Products</h2>
              <p className="text-xs text-[#78716c]">
                Cross-company audit trail of registered products and issued code batches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batches Table */}
              <div className="bg-white border border-[#e2ded5] p-5">
                <h3 className="text-sm font-bold text-[#1a1a1e] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#c9a84c]" />
                  <span>Production Batches ({storeState.batches.length})</span>
                </h3>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {storeState.batches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-[#fafaf8] border border-[#f0ece4] text-xs font-mono"
                    >
                      <div className="flex justify-between font-semibold text-[#1a1a1e]">
                        <span>{b.productName}</span>
                        <span>{b.quantity.toLocaleString()} codes</span>
                      </div>
                      <div className="flex justify-between text-[#78716c] text-[10px] mt-1">
                        <span>Batch: {b.id}</span>
                        <span>
                          Charged: {b.currency} {b.amountCharged.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white border border-[#e2ded5] p-5">
                <h3 className="text-sm font-bold text-[#1a1a1e] mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#c9a84c]" />
                  <span>Registered Products ({storeState.products.length})</span>
                </h3>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {storeState.products.map((p) => {
                    const comp = storeState.companies.find((c) => c.id === p.companyId);
                    return (
                      <div key={p.id} className="p-3 bg-[#fafaf8] border border-[#f0ece4] text-xs">
                        <div className="font-semibold text-[#1a1a1e]">{p.name}</div>
                        <div className="text-[#78716c] text-[10px] font-mono mt-1 flex justify-between">
                          <span>Brand: {comp?.name || "Unknown"}</span>
                          <span>Category: {p.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FRAUD & ANOMALY REVIEW QUEUE                       */}
        {/* ========================================================= */}
        {activeTab === "fraud" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#c0392b]" />
                <span>Suspected Counterfeit & Scan Anomaly Queue</span>
              </h2>
              <p className="text-xs text-[#78716c]">
                Codes triggering soft escalation due to repeat scans across multiple geographic
                zones or user reports.
              </p>
            </div>

            {flaggedCodeStrings.length === 0 ? (
              <div className="bg-white border border-[#e2ded5] p-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#2e8b57] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1a1a1e]">No Flagged Scan Patterns</p>
                <p className="text-xs text-[#78716c] mt-1">
                  All consumer scans are within normal thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedCodeStrings.map((codeString) => {
                  const scansForCode = storeState.scans.filter((s) => s.codeString === codeString);
                  const codeObj = storeState.codes.find((c) => c.codeString === codeString);
                  const prod = storeState.products.find((p) => p.id === codeObj?.productId);
                  const comp = storeState.companies.find((c) => c.id === codeObj?.companyId);

                  const distinctCities = Array.from(
                    new Set(scansForCode.map((s) => s.roughLocation)),
                  );
                  const distinctTokens = Array.from(
                    new Set(scansForCode.map((s) => s.browserToken)),
                  );

                  return (
                    <div
                      key={codeString}
                      className="bg-white border border-[#f5c6c2] p-5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0ece4] pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-[#c0392b] bg-[#fceeed] px-2.5 py-0.5 border border-[#f5c6c2]">
                              {codeString}
                            </span>
                            <span className="text-xs font-semibold text-[#1a1a1e]">
                              {prod?.name || "Product"}
                            </span>
                            <span className="text-xs text-[#78716c]">({comp?.name})</span>
                          </div>
                          <p className="text-xs text-[#c0392b] mt-1 font-mono">
                            High velocity: {scansForCode.length} scans from {distinctTokens.length}{" "}
                            distinct phones across {distinctCities.length} cities.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (codeObj) {
                                asemiStore.clearFlag(codeObj.id);
                              }
                            }}
                            className="px-3 py-1.5 border border-[#cfc9be] text-xs font-mono hover:bg-[#fafaf8]"
                          >
                            Mark Reviewed / Clear
                          </button>
                          <button
                            onClick={() => {
                              alert(
                                `Escalation dispatch sent to brand compliance officer at ${comp?.email}.`,
                              );
                            }}
                            className="bg-[#c0392b] text-white px-3 py-1.5 text-xs font-mono font-semibold hover:bg-[#9c2d21]"
                          >
                            Escalate to Manufacturer
                          </button>
                        </div>
                      </div>

                      {/* Detailed Scan Log Timeline */}
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] block mb-2">
                          Scan Timeline (Geographic Velocity Trace)
                        </span>
                        <div className="space-y-1.5">
                          {scansForCode.map((scan) => (
                            <div
                              key={scan.id}
                              className="text-xs font-mono bg-[#fafaf8] p-2.5 border border-[#f0ece4] flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[#78716c]">
                                  {new Date(scan.timestamp).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-[#1a1a1e]">
                                  <MapPin className="w-3.5 h-3.5 text-[#c0392b]" />
                                  <span>{scan.roughLocation}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-[#78716c]">
                                <span>Fingerprint: {scan.deviceFingerprint}</span>
                                <span className="bg-[#f0ece4] px-1.5 py-0.5">
                                  Token: {scan.browserToken.slice(0, 8)}…
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CONSUMER REPORTS INBOX                             */}
        {/* ========================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e]">Consumer Fraud Reports</h2>
              <p className="text-xs text-[#78716c]">
                Reports submitted by consumers scanning suspicious items in the field.
              </p>
            </div>

            {storeState.reports.length === 0 ? (
              <div className="bg-white border border-[#e2ded5] p-10 text-center">
                <Inbox className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold">No consumer reports submitted</p>
              </div>
            ) : (
              <div className="space-y-3">
                {storeState.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-4 border text-xs ${
                      rep.reviewed
                        ? "bg-white border-[#e2ded5] opacity-75"
                        : "bg-[#fffdfa] border-[#e8d2b0] shadow-sm"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#f0ece4]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-[#f4f2ee] px-2 py-0.5 border border-[#e2ded5]">
                          {rep.codeString}
                        </span>
                        <span className="font-semibold text-[#1a1a1e]">{rep.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-[#78716c]">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                        {rep.reviewed ? (
                          <span className="text-[#2e8b57] font-semibold">✓ Resolved</span>
                        ) : (
                          <button
                            onClick={() => asemiStore.markReportReviewed(rep.id)}
                            className="bg-[#1a1a1e] text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#b8962e]"
                          >
                            Mark Reviewed
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[#2b2b32] font-sans bg-[#f9f8f6] p-3 border border-[#f0ece4]">
                      "{rep.message}"
                    </p>

                    {rep.contact && (
                      <div className="mt-2 font-mono text-[11px] text-[#78716c]">
                        Reporter Contact: <strong>{rep.contact}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PLATFORM METRICS                                   */}
        {/* ========================================================= */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e]">Asemi Platform Overview</h2>
              <p className="text-xs text-[#78716c]">
                Live network telemetry across manufacturers, scan traffic, and regional volume.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-[#e2ded5] p-4">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Total Manufacturers
                </div>
                <div className="text-2xl font-bold text-[#1a1a1e] mt-1">
                  {storeState.companies.length}
                </div>
                <div className="text-[10px] text-[#2e8b57] font-mono mt-1">
                  {approvedCompanies.length} Active / Approved
                </div>
              </div>

              <div className="bg-white border border-[#e2ded5] p-4">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Total Codes Generated
                </div>
                <div className="text-2xl font-bold text-[#1a1a1e] mt-1">
                  {totalCodesIssued.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#78716c] font-mono mt-1">
                  Across {storeState.batches.length} batches
                </div>
              </div>

              <div className="bg-white border border-[#e2ded5] p-4">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">Consumer Scans</div>
                <div className="text-2xl font-bold text-[#1a1a1e] mt-1">{totalScans}</div>
                <div className="text-[10px] text-[#c0392b] font-mono mt-1">
                  {flaggedScans.length} soft warnings triggered
                </div>
              </div>

              <div className="bg-white border border-[#e2ded5] p-4">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">Gross Revenue</div>
                <div className="text-xl font-bold text-[#1a1a1e] mt-1">
                  ₦{revenueNGN.toLocaleString()}
                </div>
                <div className="text-[11px] font-bold text-[#1a1a1e] font-mono">
                  + ${revenueUSD.toLocaleString()} USD
                </div>
              </div>
            </div>

            {/* Regional Lock Distribution */}
            <div className="bg-white border border-[#e2ded5] p-5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a1a1e] mb-3">
                Regional Currency Distribution
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>Nigeria (NGN - Paystack / Flutterwave)</span>
                    <span className="font-bold">
                      {storeState.companies.filter((c) => c.countryCode === "NG").length}{" "}
                      manufacturers
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f0ece4] overflow-hidden">
                    <div
                      className="h-full bg-[#2e8b57]"
                      style={{
                        width: `${
                          (storeState.companies.filter((c) => c.countryCode === "NG").length /
                            storeState.companies.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>International (USD - Stripe)</span>
                    <span className="font-bold">
                      {storeState.companies.filter((c) => c.countryCode !== "NG").length}{" "}
                      manufacturers
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f0ece4] overflow-hidden">
                    <div
                      className="h-full bg-[#c9a84c]"
                      style={{
                        width: `${
                          (storeState.companies.filter((c) => c.countryCode !== "NG").length /
                            storeState.companies.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: INSPECT COMPANY & AI DOCUMENT REVIEW               */}
        {/* ========================================================= */}
        {inspectingCompany && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#c9a84c]" />
                  <div>
                    <h3 className="font-bold text-base text-[#1a1a1e]">{inspectingCompany.name}</h3>
                    <p className="text-[11px] font-mono text-[#78716c]">
                      Application ID: {inspectingCompany.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingCompany(null)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Basic Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fafaf8] p-3 border border-[#e2ded5] font-mono">
                  <div>
                    <span className="text-[#78716c] block text-[10px]">Registration No</span>
                    <span className="font-bold text-[#1a1a1e]">
                      {inspectingCompany.registrationNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#78716c] block text-[10px]">Email</span>
                    <span className="font-semibold text-[#1a1a1e]">{inspectingCompany.email}</span>
                  </div>
                  <div>
                    <span className="text-[#78716c] block text-[10px]">Phone</span>
                    <span className="font-semibold text-[#1a1a1e]">{inspectingCompany.phone}</span>
                  </div>
                </div>

                {/* AI Document Review Layer */}
                <div className="bg-[#f0f8f3] border border-[#c6e5d2] p-4 text-[#144729]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold font-mono text-xs">
                      <Sparkles className="w-4 h-4 text-[#2e8b57]" />
                      <span>AI Document Analysis & Cross-Check</span>
                    </div>
                    <span className="bg-[#2e8b57] text-white px-2 py-0.5 font-mono text-[10px] font-bold">
                      Confidence: {inspectingCompany.aiReviewScore || 92}%
                    </span>
                  </div>

                  <p className="text-[11px] text-[#255e39] mb-3">
                    Automated OCR analyzed the submitted business certificate against national
                    company registrar registries:
                  </p>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    {inspectingCompany.aiReviewFlags?.map((flag, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 bg-white/80 p-2 border border-[#d2eadc]"
                      >
                        <span
                          className={flag.type === "warning" ? "text-[#b86d14]" : "text-[#2e8b57]"}
                        >
                          {flag.type === "warning" ? "⚠" : "✓"}
                        </span>
                        <div>
                          <strong>{flag.label}:</strong> {flag.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Preview */}
                {inspectingCompany.verificationDocUrl && (
                  <div>
                    <span className="font-mono text-[11px] text-[#78716c] block mb-1">
                      Uploaded Business Certificate / CAC Document:
                    </span>
                    <div className="border border-[#e2ded5] p-2 bg-[#f4f2ee] flex items-center justify-center">
                      <img
                        src={inspectingCompany.verificationDocUrl}
                        alt="Registration document"
                        className="max-h-56 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {/* Confirm Locked Country Code */}
                <div className="bg-[#fafaf8] p-3 border border-[#cfc9be]">
                  <label
                    htmlFor="confirm-country-code"
                    className="block font-mono text-[11px] font-bold uppercase text-[#1a1a1e] mb-1"
                  >
                    Confirmed Locked Country Code (Sets Permanent Pricing Region)
                  </label>
                  <p className="text-[11px] text-[#78716c] mb-2">
                    As an administrator, confirm the official jurisdiction based on the verified
                    certificate. Once approved, the company cannot alter this country code.
                  </p>
                  <select
                    id="confirm-country-code"
                    value={confirmedCountry}
                    onChange={(e) => setConfirmedCountry(e.target.value)}
                    className="w-full border border-[#cfc9be] p-2 font-mono text-xs bg-white"
                  >
                    <option value="NG">
                      NG - Nigeria (Locked to NGN Pricing Tiers: ₦50 down to ₦12)
                    </option>
                    <option value="US">
                      US - United States (Locked to USD Pricing Tiers: $0.15 down to $0.05)
                    </option>
                    <option value="GB">GB - United Kingdom (Locked to USD Pricing Tiers)</option>
                    <option value="DE">DE - Germany (Locked to USD Pricing Tiers)</option>
                    <option value="ZA">ZA - South Africa (Locked to USD Pricing Tiers)</option>
                    <option value="GH">GH - Ghana (Locked to USD Pricing Tiers)</option>
                    <option value="KE">KE - Kenya (Locked to USD Pricing Tiers)</option>
                  </select>
                </div>

                {/* Admin Note */}
                <div>
                  <label
                    htmlFor="admin-note-input"
                    className="block font-mono text-[11px] text-[#78716c] uppercase mb-1"
                  >
                    Admin Review Note (Visible to internal team and manufacturer)
                  </label>
                  <textarea
                    id="admin-note-input"
                    rows={2}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="e.g. CAC certificate cross-verified against corporate database. Approved."
                    className="w-full border border-[#cfc9be] p-2 text-xs focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#e2ded5]">
                  <button
                    onClick={() => handleApprove(inspectingCompany.id)}
                    className="flex-1 bg-[#2e8b57] hover:bg-[#247045] text-white py-2.5 font-mono font-bold text-xs transition-colors"
                  >
                    ✓ Approve & Lock Region ({confirmedCountry})
                  </button>
                  <button
                    onClick={() => handleRequestInfo(inspectingCompany.id)}
                    className="bg-[#d4830a] hover:bg-[#b56e07] text-white px-4 py-2.5 font-mono font-bold text-xs transition-colors"
                  >
                    Request Info
                  </button>
                  <button
                    onClick={() => handleReject(inspectingCompany.id)}
                    className="bg-[#c0392b] hover:bg-[#9c2d21] text-white px-4 py-2.5 font-mono font-bold text-xs transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
