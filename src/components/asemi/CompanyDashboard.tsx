import React, { useState, useEffect } from "react";
import {
  asemiStore,
  Company,
  Product,
  Batch,
  Code,
  Transaction,
  calculatePrice,
  generateQrDataUrl,
} from "@/lib/asemiStore";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import {
  Building2,
  Package,
  Layers,
  FileSpreadsheet,
  Printer,
  CreditCard,
  User,
  Plus,
  AlertCircle,
  CheckCircle2,
  Lock,
  Download,
  ExternalLink,
  QrCode,
  Search,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  LogOut,
  FileCheck,
  FileText,
  Upload,
  ShieldCheck,
} from "lucide-react";

interface CompanyDashboardProps {
  company: Company;
  onOpenVerifierWithCode?: (code: string) => void;
  onSignOut?: () => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  company,
  onOpenVerifierWithCode,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "generate" | "codes" | "billing" | "profile"
  >("overview");

  const [storeState, setStoreState] = useState(asemiStore.getState());

  // Products
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Food & Edibles");
  const [newProductCustomCategory, setNewProductCustomCategory] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductRegNumber, setNewProductRegNumber] = useState("");
  const [newProductRegDocName, setNewProductRegDocName] = useState("");
  const [newProductCoaDocName, setNewProductCoaDocName] = useState("");

  // Code Generation Form & Batch Traceability
  const [genProductId, setGenProductId] = useState("");
  const [genQuantity, setGenQuantity] = useState<number>(1000);
  const [genLotNumber, setGenLotNumber] = useState(
    `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [genMfgDate, setGenMfgDate] = useState(new Date().toISOString().split("T")[0]);
  const [genExpiryDate, setGenExpiryDate] = useState("2028-12-31");
  const [genBatchCoaDocName, setGenBatchCoaDocName] = useState("");
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"paystack" | "flutterwave" | "stripe">(
    company.countryCode === "NG" ? "paystack" : "stripe",
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "ussd">("card");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Document Inspection Viewer Modal
  const [docPreviewModal, setDocPreviewModal] = useState<{
    title: string;
    docName: string;
    type: "regulatory" | "coa" | "company";
    productName?: string;
    certNumber?: string;
  } | null>(null);

  // Code Bank State
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [codeProductFilter, setCodeProductFilter] = useState("ALL");
  const [inspectingCode, setInspectingCode] = useState<Code | null>(null);
  const [inspectingQrUrl, setInspectingQrUrl] = useState<string>("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBatchForPrint, setSelectedBatchForPrint] = useState<string>("ALL");

  // Subscribe to store updates
  useEffect(() => {
    return asemiStore.subscribe(() => {
      setStoreState({ ...asemiStore.getState() });
    });
  }, []);

  // Filter items belonging to this company
  const companyProducts = storeState.products.filter((p) => p.companyId === company.id);
  const companyBatches = storeState.batches.filter((b) => b.companyId === company.id);
  const companyCodes = storeState.codes.filter((c) => c.companyId === company.id);
  const companyTransactions = storeState.transactions.filter((t) => t.companyId === company.id);

  // Set default product for generator
  useEffect(() => {
    if (companyProducts.length > 0 && !genProductId) {
      setGenProductId(companyProducts[0].id);
    }
  }, [companyProducts, genProductId]);

  // Live price calculation for current generator input
  const priceQuote = calculatePrice(
    genQuantity,
    company.totalCodesGenerated,
    company.countryCode,
    company.freeCodesRemaining,
  );

  // Filtered codes in code bank
  const filteredCodes = companyCodes.filter((c) => {
    const matchesQuery = c.codeString.toLowerCase().includes(codeSearchQuery.toLowerCase());
    const matchesProduct = codeProductFilter === "ALL" || c.productId === codeProductFilter;
    return matchesQuery && matchesProduct;
  });

  // Handle product creation with regulatory & lab documents
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    if (newProductCategory === "Other" && !newProductCustomCategory.trim()) {
      alert("Please specify your custom product category.");
      return;
    }

    const effectiveCategory =
      newProductCategory === "Other" ? newProductCustomCategory.trim() : newProductCategory;

    asemiStore.createProduct(company.id, {
      name: newProductName,
      category: effectiveCategory,
      description: newProductDescription,
      imageUrl:
        newProductImageUrl ||
        "https://images.unsplash.com/photo-1608248597359-e9392e2195f1?auto=format&fit=crop&w=600&q=80",
      regulatoryNumber: newProductRegNumber.trim() || undefined,
      regulatoryDocName: newProductRegDocName.trim() || undefined,
      regulatoryDocUrl: newProductRegDocName
        ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"
        : undefined,
      certificateOfAnalysisName: newProductCoaDocName.trim() || undefined,
      certificateOfAnalysisUrl: newProductCoaDocName
        ? "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80"
        : undefined,
    });

    setShowAddProductModal(false);
    setNewProductName("");
    setNewProductDescription("");
    setNewProductImageUrl("");
    setNewProductRegNumber("");
    setNewProductRegDocName("");
    setNewProductCoaDocName("");
    setNewProductCustomCategory("");
  };

  // Handle batch generation execution with batch traceability & CoA
  const handleExecutePaymentAndGenerate = async () => {
    if (!genProductId) {
      alert("Please select a product.");
      return;
    }

    setPaymentProcessing(true);

    try {
      // Simulate payment gateway latency
      await new Promise((r) => setTimeout(r, 1200));

      await asemiStore.generateBatch(company.id, genProductId, genQuantity, paymentProvider, {
        lotNumber: genLotNumber.trim(),
        mfgDate: genMfgDate,
        expiryDate: genExpiryDate,
        coaDocName: genBatchCoaDocName.trim() || undefined,
      });

      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        setPaymentSuccess(false);
        setShowPaymentModal(false);
        setActiveTab("codes");
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Error generating batch: " + err);
      setPaymentProcessing(false);
    }
  };

  // Inspect QR
  const handleInspectCode = async (code: Code) => {
    setInspectingCode(code);
    const url = await generateQrDataUrl(code.codeString);
    setInspectingQrUrl(url);
  };

  // Export CSV
  const handleExportCsv = (batchId?: string) => {
    const codesToExport = batchId
      ? companyCodes.filter((c) => c.batchId === batchId)
      : companyCodes;

    if (codesToExport.length === 0) {
      alert("No codes to export.");
      return;
    }

    const host = typeof window !== "undefined" ? window.location.origin : "https://asemi.id";
    const headers = "Code,Product,BatchID,VerificationURL,TotalScans,Status,CreatedAt\n";
    const rows = codesToExport
      .map((c) => {
        const prod = companyProducts.find((p) => p.id === c.productId);
        const url = `${host}/v/${c.codeString}`;
        return `"${c.codeString}","${prod?.name || "Product"}","${c.batchId}","${url}","${c.scanCount}","${c.status}","${c.createdAt}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asemi_${company.name.toLowerCase().replace(/\s+/g, "_")}_codes.csv`;
    link.click();
  };

  return (
    <div className="bg-[#fafaf8] text-[#1c1a17] min-h-screen">
      {/* Top Banner if Pending */}
      {company.status === "PENDING" && (
        <div className="bg-[#fff9ed] border-b border-[#eedab2] px-6 py-3 text-xs font-mono text-[#8a560f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#d4830a]" />
            <span>
              <strong>Registration Pending Review:</strong> We are verifying your business
              documents. Batch generation will unlock upon administrator approval.
            </span>
          </div>
          <span className="bg-[#d4830a] text-white px-2 py-0.5 text-[10px] font-bold">
            REGION LOCKED: {company.countryCode} ({company.countryCode === "NG" ? "NGN" : "USD"})
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#e2ded5] px-6 py-5">
        <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a1a1e] text-white flex items-center justify-center font-bold text-lg">
              {company.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#1a1a1e]">{company.name}</h1>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider ${
                    company.status === "APPROVED"
                      ? "bg-[#f0f8f3] text-[#2e8b57] border border-[#c6e5d2]"
                      : "bg-[#fff4db] text-[#b86d14] border border-[#ecd299]"
                  }`}
                >
                  {company.status}
                </span>
              </div>
              <p className="text-xs font-mono text-[#78716c]">
                Reg: {company.registrationNumber} • Jurisdiction: {company.countryCode} • Currency:{" "}
                {company.countryCode === "NG" ? "NGN (₦)" : "USD ($)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("generate")}
              className="btn btn-fill btn-sm flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Codes</span>
            </button>
            {onSignOut && (
              <button
                id="btn-company-signout"
                onClick={onSignOut}
                className="btn btn-ghost btn-sm flex items-center gap-1.5 border border-[#e2ded5] bg-white hover:bg-[#ede8df]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#f4f2ee] border-b border-[#e2ded5] px-6">
        <div className="max-w-[1240px] mx-auto flex overflow-x-auto text-xs font-mono uppercase tracking-wider font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "overview"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "products"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({companyProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("generate")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "generate"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Generate Codes</span>
          </button>

          <button
            onClick={() => setActiveTab("codes")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "codes"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Code Bank ({companyCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "billing"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Billing & Region</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "profile"
                ? "border-[#1a1a1e] text-[#1a1a1e] bg-white"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1e]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Company Profile</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-[1240px] mx-auto p-6">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW                                           */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-[#e2ded5] p-5">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Products Listed
                </div>
                <div className="text-2xl font-bold text-[#1a1a1e] mt-1">
                  {companyProducts.length}
                </div>
                <button
                  onClick={() => setActiveTab("products")}
                  className="text-[11px] font-mono text-[#b8962e] hover:underline mt-2 block"
                >
                  Manage catalog →
                </button>
              </div>

              <div className="bg-white border border-[#e2ded5] p-5">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Total Codes Issued
                </div>
                <div className="text-2xl font-bold text-[#1a1a1e] mt-1">
                  {company.totalCodesGenerated.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-[#78716c] mt-2">
                  Across {companyBatches.length} batch{companyBatches.length !== 1 ? "es" : ""}
                </div>
              </div>

              <div className="bg-white border border-[#e2ded5] p-5">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Free Onboarding Codes
                </div>
                <div className="text-2xl font-bold text-[#2e8b57] mt-1">
                  {company.freeCodesRemaining} left
                </div>
                <div className="text-[11px] font-mono text-[#78716c] mt-2">
                  20 free codes granted at registration
                </div>
              </div>

              <div className="bg-white border border-[#e2ded5] p-5">
                <div className="text-[10px] font-mono text-[#78716c] uppercase">
                  Locked Region & Pricing
                </div>
                <div className="text-xl font-bold text-[#1a1a1e] mt-1">
                  {company.countryCode} ({company.countryCode === "NG" ? "NGN" : "USD"})
                </div>
                <div className="text-[11px] font-mono text-[#78716c] mt-2">
                  Tier: {company.countryCode === "NG" ? "₦50 → ₦12" : "$0.15 → $0.05"}
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Batches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 cols: Recent Batches */}
              <div className="md:col-span-2 bg-white border border-[#e2ded5] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-[#1a1a1e]">Recent Batches</h3>
                  <button
                    onClick={() => setActiveTab("codes")}
                    className="text-xs font-mono text-[#78716c] hover:text-[#1a1a1e]"
                  >
                    View Code Bank →
                  </button>
                </div>

                {companyBatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#78716c]">
                    No batches generated yet. Click "Generate Codes" to create your first packaging
                    run.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0ece4]">
                    {companyBatches.slice(0, 5).map((b) => (
                      <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-[#1a1a1e]">{b.productName}</div>
                          <div className="text-[11px] font-mono text-[#78716c]">
                            Batch ID: {b.id} • {new Date(b.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-[#1a1a1e]">
                            {b.quantity.toLocaleString()} codes
                          </div>
                          <div className="text-[10px] text-[#78716c]">
                            {b.currency} {b.amountCharged.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 1 col: Verification Sample & QR quick link */}
              <div className="bg-[#fcfbf9] border border-[#e2ded5] p-6">
                <h3 className="font-bold text-sm text-[#1a1a1e] mb-2">Consumer Verification</h3>
                <p className="text-xs text-[#78716c] mb-4">
                  Each generated code has a unique mobile verification page with instant consumer
                  feedback.
                </p>

                {companyCodes.length > 0 && (
                  <div className="bg-white border border-[#e2ded5] p-4 text-xs font-mono space-y-3">
                    <div>
                      <span className="text-[10px] text-[#78716c] uppercase block">
                        Sample Code
                      </span>
                      <strong className="text-sm text-[#1a1a1e]">
                        {companyCodes[0].codeString}
                      </strong>
                    </div>

                    <button
                      onClick={() => onOpenVerifierWithCode?.(companyCodes[0].codeString)}
                      className="w-full bg-[#1a1a1e] hover:bg-[#b8962e] text-white py-2 text-xs font-semibold font-mono transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Simulate Consumer Scan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[#ede8df] text-[11px] text-[#78716c] space-y-1">
                  <div>✓ Print-ready QR labels</div>
                  <div>✓ CSV batch exports</div>
                  <div>✓ Soft counterfeit escalation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRODUCTS CATALOG                                   */}
        {/* ========================================================= */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1a1a1e]">Registered Products</h2>
                <p className="text-xs text-[#78716c]">
                  Products associated with your company registry. Each batch links to a product
                  profile.
                </p>
              </div>

              <button
                onClick={() => setShowAddProductModal(true)}
                className="bg-[#1a1a1e] hover:bg-[#b8962e] text-white px-4 py-2 text-xs font-mono font-semibold transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {companyProducts.map((p) => {
                const prodBatches = companyBatches.filter((b) => b.productId === p.id);
                const prodCodesCount = prodBatches.reduce((acc, b) => acc + b.quantity, 0);

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-[#e2ded5] overflow-hidden flex flex-col"
                  >
                    <div className="h-44 bg-[#f0ece4] overflow-hidden relative">
                      <img
                        src={
                          p.imageUrl ||
                          "https://images.unsplash.com/photo-1608248597359-e9392e2195f1?auto=format&fit=crop&w=600&q=80"
                        }
                        alt={p.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#1a1a1e] font-mono text-[10px] px-2 py-0.5 font-bold uppercase">
                        {p.category}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-[#1a1a1e]">{p.name}</h3>
                        </div>
                        <p className="text-xs text-[#78716c] mt-1 line-clamp-2">
                          {p.description || "No description provided."}
                        </p>

                        {/* Product Authenticity Documents Bar */}
                        <div className="mt-3 pt-3 border-t border-[#f0ece4] space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#6e6e7a]">Reg / Approval:</span>
                            <span className="font-bold text-[#1a1a1e] bg-[#f5f0e8] px-1.5 py-0.5 rounded text-[10px]">
                              {p.regulatoryNumber || "Self-Declared / Pending"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {p.regulatoryDocName && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDocPreviewModal({
                                    title: "Regulatory Approval Certificate",
                                    docName: p.regulatoryDocName!,
                                    type: "regulatory",
                                    productName: p.name,
                                    certNumber: p.regulatoryNumber,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] hover:bg-[#dcfce7] px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                <FileCheck className="w-3 h-3 text-[#16a34a]" />
                                <span>Reg Cert</span>
                              </button>
                            )}

                            {p.certificateOfAnalysisName && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDocPreviewModal({
                                    title: "Certificate of Analysis (Lab Release)",
                                    docName: p.certificateOfAnalysisName!,
                                    type: "coa",
                                    productName: p.name,
                                    certNumber: p.regulatoryNumber,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] hover:bg-[#dbeafe] px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                <FileText className="w-3 h-3 text-[#2563eb]" />
                                <span>Lab CoA</span>
                              </button>
                            )}

                            {!p.regulatoryDocName && !p.certificateOfAnalysisName && (
                              <span className="text-[10px] font-mono text-[#9ca3af] italic">
                                No lab documents attached
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#f0ece4] flex items-center justify-between text-xs font-mono text-[#78716c]">
                        <span>{prodCodesCount.toLocaleString()} codes</span>
                        <button
                          onClick={() => {
                            setGenProductId(p.id);
                            setActiveTab("generate");
                          }}
                          className="text-[#1a1a1e] font-semibold hover:text-[#b8962e] cursor-pointer"
                        >
                          Generate codes →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GENERATE CODES (PRICING TIERS & STRIPE/PAYSTACK)  */}
        {/* ========================================================= */}
        {activeTab === "generate" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#1a1a1e]">Generate Packaging Codes</h2>
              <p className="text-xs text-[#78716c]">
                Generate cryptographically random 10-12 character codes and QR assets for your
                production run.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-6">
              {/* Product Selection */}
              <div>
                <label
                  htmlFor="gen-product-select"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-[#6e6e7a] mb-2"
                >
                  Select Product *
                </label>
                <select
                  id="gen-product-select"
                  value={genProductId}
                  onChange={(e) => setGenProductId(e.target.value)}
                  className="w-full border border-[#cfc9be] p-3 text-xs bg-white focus:outline-none focus:border-[#1a1a1e]"
                >
                  {companyProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="gen-quantity-input"
                    className="text-xs font-mono font-bold uppercase tracking-wider text-[#6e6e7a]"
                  >
                    Quantity of Codes to Generate *
                  </label>
                  <span className="text-xs font-mono text-[#78716c]">
                    Current Lifetime Total: {company.totalCodesGenerated.toLocaleString()} codes
                  </span>
                </div>
                <input
                  id="gen-quantity-input"
                  type="number"
                  min={1}
                  max={2000000}
                  step={500}
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full border border-[#cfc9be] p-3 text-base font-mono font-bold focus:outline-none focus:border-[#1a1a1e]"
                />

                {/* Quick quantity presets */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[500, 2000, 5000, 25000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGenQuantity(preset)}
                      className={`px-3 py-1 text-xs font-mono border ${
                        genQuantity === preset
                          ? "bg-[#1a1a1e] text-white border-[#1a1a1e]"
                          : "border-[#cfc9be] hover:bg-[#f5f0e8]"
                      }`}
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setGenQuantity(1200000);
                      setShowQuoteModal(true);
                    }}
                    className="px-3 py-1 text-xs font-mono border border-[#d4830a] text-[#b86d14] hover:bg-[#fff9ed]"
                  >
                    1,000,000+ (Enterprise Quote)
                  </button>
                </div>
              </div>

              {/* Batch Lot Traceability & Lab Release Documents */}
              <div className="bg-[#fafaf8] border border-[#e2ded5] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e2ded5] pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2e8b57]" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a1a1e]">
                      Batch Traceability & Quality Control (QC)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#6e6e7a] bg-[#f0ece4] px-2 py-0.5 rounded">
                    Product Integrity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="gen-lot-number"
                      className="block text-xs font-mono text-[#6e6e7a] mb-1"
                    >
                      Lot / Batch Number *
                    </label>
                    <input
                      id="gen-lot-number"
                      type="text"
                      required
                      value={genLotNumber}
                      onChange={(e) => setGenLotNumber(e.target.value)}
                      className="w-full border border-[#cfc9be] p-2 text-xs font-mono bg-white focus:outline-none focus:border-[#1a1a1e]"
                      placeholder="e.g. LOT-2026-SH01"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gen-mfg-date"
                      className="block text-xs font-mono text-[#6e6e7a] mb-1"
                    >
                      Manufacturing Date
                    </label>
                    <input
                      id="gen-mfg-date"
                      type="date"
                      value={genMfgDate}
                      onChange={(e) => setGenMfgDate(e.target.value)}
                      className="w-full border border-[#cfc9be] p-2 text-xs font-mono bg-white focus:outline-none focus:border-[#1a1a1e]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gen-exp-date"
                      className="block text-xs font-mono text-[#6e6e7a] mb-1"
                    >
                      Expiry Date
                    </label>
                    <input
                      id="gen-exp-date"
                      type="date"
                      value={genExpiryDate}
                      onChange={(e) => setGenExpiryDate(e.target.value)}
                      className="w-full border border-[#cfc9be] p-2 text-xs font-mono bg-white focus:outline-none focus:border-[#1a1a1e]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gen-batch-coa"
                    className="block text-xs font-mono text-[#6e6e7a] mb-1"
                  >
                    Batch Certificate of Analysis (CoA) Release
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="gen-batch-coa"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setGenBatchCoaDocName(file.name);
                      }}
                      className="w-full border border-[#cfc9be] p-1.5 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                  {genBatchCoaDocName ? (
                    <p className="text-[10px] font-mono text-[#2e8b57] mt-1">
                      ✓ Lab Release attached: {genBatchCoaDocName}
                    </p>
                  ) : (
                    <p className="text-[10px] font-mono text-[#78716c] mt-1">
                      If left blank, this batch will inherit the primary Certificate of Analysis
                      attached to the product.
                    </p>
                  )}
                </div>
              </div>

              {/* Live Bracket Breakdown & Pricing calculation */}
              <div className="bg-[#fafaf8] border border-[#e2ded5] p-5">
                <div className="flex items-center justify-between mb-3 border-b border-[#e2ded5] pb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a1a1e]">
                    Progressive Bracket Calculation ({priceQuote.currency})
                  </span>
                  <span className="text-xs font-mono text-[#2e8b57]">
                    {priceQuote.freeCodesApplied > 0 &&
                      `✓ ${priceQuote.freeCodesApplied} free onboarding codes applied`}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {priceQuote.breakdown.map((b, idx) => (
                    <div key={idx} className="flex justify-between text-[#78716c]">
                      <span>
                        {b.bracket}: {b.quantity.toLocaleString()} codes @{" "}
                        {priceQuote.currencySymbol}
                        {b.rate}
                      </span>
                      <span>
                        {priceQuote.currencySymbol}
                        {b.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-[#e2ded5] flex justify-between items-center text-base font-bold text-[#1a1a1e]">
                    <span>Total Estimated Cost</span>
                    <span>
                      {priceQuote.currencySymbol}
                      {priceQuote.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {genQuantity > 1000000 ? (
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  className="w-full bg-[#d4830a] hover:bg-[#b86d14] text-white py-3.5 font-mono font-bold text-sm transition-colors"
                >
                  Request Enterprise Custom Quote
                </button>
              ) : (
                <button
                  type="button"
                  disabled={company.status === "PENDING" && priceQuote.totalAmount > 0}
                  onClick={() => setShowPaymentModal(true)}
                  className="btn btn-fill w-full py-3.5 font-mono font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>
                    {company.status === "PENDING" && priceQuote.totalAmount > 0
                      ? "Pending Account Approval — Locked"
                      : `Proceed to Checkout (${priceQuote.currencySymbol}${priceQuote.totalAmount.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CODE BANK & EXPORT CSV / PRINT                     */}
        {/* ========================================================= */}
        {activeTab === "codes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#1a1a1e]">Code Bank</h2>
                <p className="text-xs text-[#78716c]">
                  All generated serial codes, high-res QR codes, and packaging export options.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCsv()}
                  className="border border-[#cfc9be] hover:bg-[#f5f0e8] text-[#1a1a1e] px-3.5 py-2 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="bg-[#1a1a1e] hover:bg-[#b8962e] text-white px-3.5 py-2 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print QR Labels</span>
                </button>
              </div>
            </div>

            {/* Filter / Search toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by code (e.g. ASM-9K4T)..."
                  value={codeSearchQuery}
                  onChange={(e) => setCodeSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#cfc9be] pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-[#1a1a1e]"
                />
              </div>

              <select
                value={codeProductFilter}
                onChange={(e) => setCodeProductFilter(e.target.value)}
                className="bg-white border border-[#cfc9be] px-3 py-2 text-xs font-mono focus:outline-none"
              >
                <option value="ALL">All Products</option>
                {companyProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Codes Table */}
            <div className="bg-white border border-[#e2ded5] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f2ee] border-b border-[#e2ded5] font-mono text-[11px] text-[#78716c] uppercase">
                  <tr>
                    <th className="py-3 px-4">Packaging Code</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Consumer Scans</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece4] font-mono">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#78716c]">
                        No codes match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((code) => {
                      const prod = companyProducts.find((p) => p.id === code.productId);
                      return (
                        <tr key={code.id} className="hover:bg-[#fafaf8]">
                          <td className="py-3 px-4 font-bold text-[#1a1a1e] tracking-wider">
                            {code.codeString}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-[#1a1a1e]">
                            {prod?.name || "Product"}
                          </td>
                          <td className="py-3 px-4 text-[#78716c]">{code.batchId}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold ${
                                code.scanCount > 2
                                  ? "bg-[#fff9ed] text-[#b86d14]"
                                  : "text-[#78716c]"
                              }`}
                            >
                              {code.scanCount} scans
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold ${
                                code.status === "ACTIVE"
                                  ? "bg-[#f0f8f3] text-[#2e8b57]"
                                  : "bg-[#fff4db] text-[#b86d14]"
                              }`}
                            >
                              {code.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-3">
                            <button
                              onClick={() => handleInspectCode(code)}
                              className="text-[#1a1a1e] hover:text-[#b8962e] font-semibold underline"
                            >
                              Inspect QR
                            </button>
                            <button
                              onClick={() => onOpenVerifierWithCode?.(code.codeString)}
                              className="text-[#78716c] hover:text-[#1a1a1e] underline"
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: BILLING & REGION LOCKING                           */}
        {/* ========================================================= */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e]">Billing & Pricing Tiers</h2>
              <p className="text-xs text-[#78716c]">
                Volume-tiered pricing schedule locked to your verified business jurisdiction.
              </p>
            </div>

            {/* Region Locking Disclosure */}
            <div className="bg-[#f5f0e8] border border-[#e0dbd2] p-5 text-xs">
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-[#1a1a1e] mb-1">
                <Lock className="w-4 h-4 text-[#c9a84c]" />
                <span>Permanent Region Lock: {company.countryCode}</span>
              </div>
              <p className="text-[#6e6e7a]">
                To guarantee equal fair pricing and eliminate VPN arbitrage, company accounts are
                permanently locked to their official corporate registry country (
                {company.countryCode}).
              </p>
            </div>

            {/* Pricing Schedule Table */}
            <div className="bg-white border border-[#e2ded5] p-5">
              <h3 className="text-xs font-mono font-bold uppercase text-[#1a1a1e] mb-3">
                Active Pricing Schedule (
                {company.countryCode === "NG" ? "NGN - Nigeria" : "USD - International"})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#fafaf8] border border-[#f0ece4]">
                  <div className="text-[#78716c] text-[10px]">Tier 1 (1–5,000)</div>
                  <div className="font-bold text-base text-[#1a1a1e] mt-1">
                    {company.countryCode === "NG" ? "₦50.00" : "$0.15"}
                  </div>
                  <div className="text-[10px] text-[#78716c]">per code</div>
                </div>

                <div className="p-3 bg-[#fafaf8] border border-[#f0ece4]">
                  <div className="text-[#78716c] text-[10px]">Tier 2 (5,001–20,000)</div>
                  <div className="font-bold text-base text-[#1a1a1e] mt-1">
                    {company.countryCode === "NG" ? "₦35.00" : "$0.10"}
                  </div>
                  <div className="text-[10px] text-[#78716c]">per code</div>
                </div>

                <div className="p-3 bg-[#fafaf8] border border-[#f0ece4]">
                  <div className="text-[#78716c] text-[10px]">Tier 3 (20,001–100,000)</div>
                  <div className="font-bold text-base text-[#1a1a1e] mt-1">
                    {company.countryCode === "NG" ? "₦25.00" : "$0.08"}
                  </div>
                  <div className="text-[10px] text-[#78716c]">per code</div>
                </div>

                <div className="p-3 bg-[#fafaf8] border border-[#f0ece4]">
                  <div className="text-[#78716c] text-[10px]">Tier 4 (100,001–500,000)</div>
                  <div className="font-bold text-base text-[#1a1a1e] mt-1">
                    {company.countryCode === "NG" ? "₦18.00" : "$0.06"}
                  </div>
                  <div className="text-[10px] text-[#78716c]">per code</div>
                </div>

                <div className="p-3 bg-[#fafaf8] border border-[#f0ece4]">
                  <div className="text-[#78716c] text-[10px]">Tier 5 (500,001–1,000,000)</div>
                  <div className="font-bold text-base text-[#1a1a1e] mt-1">
                    {company.countryCode === "NG" ? "₦12.00" : "$0.05"}
                  </div>
                  <div className="text-[10px] text-[#78716c]">per code</div>
                </div>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white border border-[#e2ded5] p-5">
              <h3 className="text-xs font-mono font-bold uppercase text-[#1a1a1e] mb-3">
                Transaction History ({companyTransactions.length})
              </h3>

              {companyTransactions.length === 0 ? (
                <div className="text-xs text-[#78716c] py-4">No billing transactions yet.</div>
              ) : (
                <div className="divide-y divide-[#f0ece4] text-xs font-mono">
                  {companyTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#1a1a1e]">
                          {tx.currency} {Number(tx.amount).toLocaleString()} via {tx.provider}
                        </div>
                        <div className="text-[10px] text-[#78716c]">
                          Ref: {tx.reference} • {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[#2e8b57] font-bold bg-[#f0f8f3] px-2 py-0.5 border border-[#c6e5d2]">
                        ✓ {tx.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: COMPANY PROFILE & AI REVIEW SUMMARY               */}
        {/* ========================================================= */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1e]">Company Profile</h2>
              <p className="text-xs text-[#78716c]">
                Verified entity metadata and automated compliance checks.
              </p>
            </div>

            <div className="bg-white border border-[#e2ded5] p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#78716c] text-[10px] uppercase block">
                    Legal Business Name
                  </span>
                  <strong className="text-sm text-[#1a1a1e]">{company.name}</strong>
                </div>
                <div>
                  <span className="text-[#78716c] text-[10px] uppercase block">
                    Business Reg / Tax ID
                  </span>
                  <strong className="text-sm text-[#1a1a1e]">{company.registrationNumber}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#f0ece4]">
                <div>
                  <span className="text-[#78716c] text-[10px] uppercase block">
                    Primary Contact Email
                  </span>
                  <strong className="text-sm text-[#1a1a1e]">{company.email}</strong>
                </div>
                <div>
                  <span className="text-[#78716c] text-[10px] uppercase block">Phone</span>
                  <strong className="text-sm text-[#1a1a1e]">{company.phone}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f0ece4]">
                <span className="text-[#78716c] text-[10px] uppercase block">
                  Locked Jurisdiction
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Lock className="w-4 h-4 text-[#c9a84c]" />
                  <strong className="text-sm text-[#1a1a1e]">
                    {company.countryCode} — Region Permanently Locked
                  </strong>
                </div>
              </div>

              {/* AI Verification Flags Summary */}
              {company.aiReviewScore !== undefined && (
                <div className="mt-4 pt-4 border-t border-[#f0ece4] bg-[#f0f8f3] p-4 text-[#144729]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2e8b57]" />
                      <span>Automated Document Verification</span>
                    </span>
                    <span className="bg-[#2e8b57] text-white px-2 py-0.5 text-[10px] font-bold">
                      {company.aiReviewScore}% Confidence
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {company.aiReviewFlags?.map((flag, i) => (
                      <div key={i} className="text-[11px] bg-white/70 p-2 border border-[#c6e5d2]">
                        ✓ <strong>{flag.label}:</strong> {flag.detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADD PRODUCT                                        */}
        {/* ========================================================= */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <h3 className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                  Register New Product
                </h3>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div>
                  <label
                    htmlFor="product-name"
                    className="block font-mono text-xs text-[#6e6e7a] mb-1"
                  >
                    Product Name *
                  </label>
                  <input
                    id="product-name"
                    required
                    type="text"
                    placeholder="e.g. Organic Shea Body Butter 250ml"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="product-category"
                      className="block font-mono text-xs text-[#6e6e7a]"
                    >
                      Product Category *
                    </label>
                    <span className="text-[11px] text-[#8e8e93]">
                      Classifies packaging & regulatory rules
                    </span>
                  </div>
                  <select
                    id="product-category"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full border border-[#cfc9be] p-2.5 bg-white font-sans text-xs focus:outline-none focus:border-[#1a1a1e] cursor-pointer"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {newProductCategory === "Other" && (
                  <div className="p-3 bg-[#fafaf8] border border-[#e2ded5] space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="new-product-custom-category"
                        className="block font-mono text-xs text-[#1a1a1e] font-semibold"
                      >
                        Specify Custom Product Category *
                      </label>
                      <span className="text-[10px] font-mono text-[#b86d14] bg-[#fff8e6] px-1.5 py-0.5 rounded">
                        Custom Classification
                      </span>
                    </div>
                    <input
                      id="new-product-custom-category"
                      required
                      type="text"
                      placeholder="e.g. Artisanal Black Soap, Specialty Cleaning Compound, Craft Cider, Pet Care"
                      value={newProductCustomCategory}
                      onChange={(e) => setNewProductCustomCategory(e.target.value)}
                      className="w-full border border-[#cfc9be] p-2 text-xs font-sans bg-white focus:outline-none focus:border-[#1a1a1e]"
                    />
                    <p className="text-[11px] text-[#6e6e7a]">
                      Consumers and verification scans will show this exact category when scanning
                      your products.
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="product-description"
                    className="block font-mono text-xs text-[#6e6e7a] mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    rows={2}
                    placeholder="Brief description shown to consumers when verifying..."
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                {/* Product Authenticity Documents */}
                <div className="p-3 bg-[#fafaf8] border border-[#e2ded5] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#1a1a1e]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2e8b57]" />
                    <span>Product Authenticity & Lab Documents</span>
                  </div>
                  <p className="text-[11px] text-[#6e6e7a]">
                    Attach official laboratory and regulatory documentation to verify this product's
                    safety formulation.
                  </p>

                  <div>
                    <label
                      htmlFor="product-reg-number"
                      className="block font-mono text-[11px] text-[#6e6e7a] mb-1"
                    >
                      Regulatory Registration Number (Optional)
                    </label>
                    <input
                      id="product-reg-number"
                      type="text"
                      placeholder="e.g. NAFDAC Reg: 04-2918 or FDA NDC: 68192-441-02"
                      value={newProductRegNumber}
                      onChange={(e) => setNewProductRegNumber(e.target.value)}
                      className="w-full border border-[#cfc9be] p-2 text-xs focus:outline-none focus:border-[#1a1a1e] bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="product-reg-doc"
                        className="block font-mono text-[11px] text-[#6e6e7a] mb-1"
                      >
                        Regulatory Certificate (PDF/JPG)
                      </label>
                      <input
                        id="product-reg-doc"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewProductRegDocName(file.name);
                        }}
                        className="w-full border border-[#cfc9be] p-1.5 text-[11px] bg-white focus:outline-none"
                      />
                      {newProductRegDocName && (
                        <p className="text-[10px] font-mono text-[#2e8b57] mt-0.5">
                          ✓ {newProductRegDocName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="product-coa-doc"
                        className="block font-mono text-[11px] text-[#6e6e7a] mb-1"
                      >
                        Certificate of Analysis / CoA (PDF/JPG)
                      </label>
                      <input
                        id="product-coa-doc"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewProductCoaDocName(file.name);
                        }}
                        className="w-full border border-[#cfc9be] p-1.5 text-[11px] bg-white focus:outline-none"
                      />
                      {newProductCoaDocName && (
                        <p className="text-[10px] font-mono text-[#2e8b57] mt-0.5">
                          ✓ {newProductCoaDocName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="product-image-url"
                    className="block font-mono text-xs text-[#6e6e7a] mb-1"
                  >
                    Product Photo URL (Optional)
                  </label>
                  <input
                    id="product-image-url"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newProductImageUrl}
                    onChange={(e) => setNewProductImageUrl(e.target.value)}
                    className="w-full border border-[#cfc9be] p-2.5 focus:outline-none focus:border-[#1a1a1e]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#1a1a1e] text-white py-2.5 font-mono font-bold hover:bg-[#b8962e] transition-colors"
                  >
                    Save Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="border border-[#cfc9be] px-4 py-2.5 font-mono hover:bg-[#f5f0e8]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: REALISTIC CHECKOUT MODAL (PAYSTACK / STRIPE)       */}
        {/* ========================================================= */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#c9a84c]" />
                  <h3 className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                    Batch Checkout
                  </h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Order summary box */}
              <div className="bg-[#fafaf8] border border-[#e2ded5] p-3 text-xs font-mono space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-[#78716c]">Quantity:</span>
                  <span className="font-bold">{genQuantity.toLocaleString()} codes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716c]">Product:</span>
                  <span className="font-bold">
                    {companyProducts.find((p) => p.id === genProductId)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1a1a1e] pt-2 border-t border-[#e2ded5]">
                  <span>Amount Due:</span>
                  <span>
                    {priceQuote.currencySymbol}
                    {priceQuote.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Gateway selector based on country */}
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-[11px] text-[#78716c] uppercase block mb-1">
                    Select Payment Gateway
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {company.countryCode === "NG" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPaymentProvider("paystack")}
                          className={`p-2.5 border text-center font-bold ${
                            paymentProvider === "paystack"
                              ? "border-[#1a1a1e] bg-[#1a1a1e] text-white"
                              : "border-[#cfc9be] hover:bg-[#fafaf8]"
                          }`}
                        >
                          Paystack (NGN)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentProvider("flutterwave")}
                          className={`p-2.5 border text-center font-bold ${
                            paymentProvider === "flutterwave"
                              ? "border-[#1a1a1e] bg-[#1a1a1e] text-white"
                              : "border-[#cfc9be] hover:bg-[#fafaf8]"
                          }`}
                        >
                          Flutterwave (NGN)
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPaymentProvider("stripe")}
                        className="col-span-2 p-2.5 border border-[#1a1a1e] bg-[#1a1a1e] text-white text-center font-bold"
                      >
                        Stripe International Checkout (USD)
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Payment Methods */}
                {company.countryCode === "NG" && (
                  <div>
                    <span className="text-[11px] text-[#78716c] uppercase block mb-1">Method</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`flex-1 py-1.5 border text-[11px] ${
                          paymentMethod === "card"
                            ? "bg-[#f5f0e8] border-[#1a1a1e] font-bold"
                            : "border-[#cfc9be]"
                        }`}
                      >
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("transfer")}
                        className={`flex-1 py-1.5 border text-[11px] ${
                          paymentMethod === "transfer"
                            ? "bg-[#f5f0e8] border-[#1a1a1e] font-bold"
                            : "border-[#cfc9be]"
                        }`}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("ussd")}
                        className={`flex-1 py-1.5 border text-[11px] ${
                          paymentMethod === "ussd"
                            ? "bg-[#f5f0e8] border-[#1a1a1e] font-bold"
                            : "border-[#cfc9be]"
                        }`}
                      >
                        USSD
                      </button>
                    </div>
                  </div>
                )}

                {/* Virtual Account Simulator if Transfer selected */}
                {paymentMethod === "transfer" && company.countryCode === "NG" && (
                  <div className="p-3 bg-[#f5f0e8] border border-[#e0dbd2] text-[11px] space-y-1">
                    <div className="text-[#6e6e7a]">Virtual Dedicated Account:</div>
                    <div className="font-bold text-[#1a1a1e]">Wema Bank: 9021849201</div>
                    <div className="text-[10px] text-[#78716c]">
                      Expires in 30:00 • Auto-detected on transfer
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={paymentProcessing}
                  onClick={handleExecutePaymentAndGenerate}
                  className="w-full bg-[#2e8b57] hover:bg-[#247045] text-white py-3 font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <span>Processing Payment & Generating Cryptographic Codes…</span>
                  ) : paymentSuccess ? (
                    <span>✓ Payment Verified! Batch Created!</span>
                  ) : (
                    <span>
                      Authorize Payment & Issue Codes ({priceQuote.currencySymbol}
                      {priceQuote.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                      )
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: INSPECT QR CODE                                    */}
        {/* ========================================================= */}
        {inspectingCode && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-sm w-full p-6 shadow-2xl text-center">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <span className="font-bold text-xs text-[#1a1a1e] uppercase font-mono">
                  Packaging Label Asset
                </span>
                <button
                  onClick={() => setInspectingCode(null)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              {/* QR Code image */}
              <div className="p-4 bg-white border border-[#e2ded5] inline-block mb-3">
                {inspectingQrUrl ? (
                  <img
                    src={inspectingQrUrl}
                    alt="Packaging QR"
                    className="w-48 h-48 mx-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center font-mono text-xs">
                    Generating...
                  </div>
                )}
              </div>

              <div className="font-mono text-lg font-bold text-[#1a1a1e] tracking-widest mb-1">
                {inspectingCode.codeString}
              </div>
              <div className="text-[11px] font-mono text-[#78716c] mb-4">
                Batch: {inspectingCode.batchId} • Scans: {inspectingCode.scanCount}
              </div>

              <div className="flex gap-2">
                <a
                  href={inspectingQrUrl}
                  download={`asemi_qr_${inspectingCode.codeString}.png`}
                  className="flex-1 bg-[#1a1a1e] hover:bg-[#b8962e] text-white py-2 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </a>
                <button
                  onClick={() => {
                    onOpenVerifierWithCode?.(inspectingCode.codeString);
                    setInspectingCode(null);
                  }}
                  className="border border-[#cfc9be] px-3 py-2 text-xs font-mono hover:bg-[#fafaf8]"
                >
                  Test Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: PRINT QR SHEET                                     */}
        {/* ========================================================= */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#c9a84c]" />
                  <span className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                    Print-Ready QR Label Sheet
                  </span>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-[#78716c]">
                  Previewing sticker layout formatted for label printers or adhesive sheets:
                </span>
                <button
                  onClick={() => window.print()}
                  className="bg-[#1a1a1e] hover:bg-[#b8962e] text-white px-4 py-1.5 text-xs font-mono font-bold"
                >
                  Print Now
                </button>
              </div>

              {/* Printable Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#fafaf8] border border-[#e2ded5]">
                {companyCodes.slice(0, 12).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white border border-[#d8d2c6] text-center font-mono space-y-1 shadow-sm"
                  >
                    <div className="w-20 h-20 bg-[#1a1a1e] mx-auto flex items-center justify-center text-white text-[10px] p-1 font-mono">
                      <QrCode className="w-16 h-16 text-white" />
                    </div>
                    <div className="font-bold text-[11px] text-[#1a1a1e] tracking-wider">
                      {c.codeString}
                    </div>
                    <div className="text-[9px] text-[#78716c]">asemi.id/v</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ENTERPRISE QUOTE REQUEST (1M+ CODES)               */}
        {/* ========================================================= */}
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3 mb-4">
                <h3 className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                  Enterprise Production Quote
                </h3>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="text-gray-400 hover:text-black font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-[#6e6e7a]">
                  For high-volume runs exceeding 1,000,000 codes, Asemi offers dedicated factory
                  integration, custom ERP barcode streams, and wholesale volume pricing.
                </p>

                <div className="bg-[#fafaf8] p-3 border border-[#e2ded5] font-mono">
                  <div className="text-[#78716c]">Company: {company.name}</div>
                  <div className="text-[#78716c]">
                    Requested Volume: {genQuantity.toLocaleString()} codes
                  </div>
                  <div className="text-[#78716c]">Jurisdiction: {company.countryCode}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    alert(
                      "Your enterprise quote request has been sent to the Asemi accounts director.",
                    );
                    setShowQuoteModal(false);
                  }}
                  className="w-full bg-[#1a1a1e] hover:bg-[#b8962e] text-white py-2.5 font-mono font-bold"
                >
                  Submit Enterprise Inquiry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: DOCUMENT & CERTIFICATE INSPECTION VIEWER           */}
        {/* ========================================================= */}
        {docPreviewModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-[#1a1a1e] max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#e2ded5] pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#2e8b57]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#1a1a1e] uppercase font-mono">
                      {docPreviewModal.title}
                    </h3>
                    <p className="text-[11px] font-mono text-[#6e6e7a]">
                      Verified Authenticity Record
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDocPreviewModal(null)}
                  className="text-gray-400 hover:text-black font-mono text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Certificate simulated seal & preview card */}
              <div className="border border-[#e2ded5] p-5 bg-[#fafaf8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716c]">
                    Official Dossier Seal
                  </span>
                  <span className="bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    CRYPTOGRAPHICALLY ANCHORED
                  </span>
                </div>

                <div className="border-t border-[#f0ece4] pt-2 space-y-2 text-xs font-mono">
                  {docPreviewModal.productName && (
                    <div className="flex justify-between">
                      <span className="text-[#6e6e7a]">Product:</span>
                      <span className="font-bold text-[#1a1a1e]">
                        {docPreviewModal.productName}
                      </span>
                    </div>
                  )}

                  {docPreviewModal.certNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#6e6e7a]">Approval / Reg #:</span>
                      <span className="font-bold text-[#1a1a1e]">{docPreviewModal.certNumber}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-[#6e6e7a]">Document File:</span>
                    <span className="font-bold text-[#2563eb]">{docPreviewModal.docName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6e6e7a]">Document Type:</span>
                    <span className="font-bold text-[#1a1a1e]">
                      {docPreviewModal.type === "regulatory"
                        ? "Government Regulatory Clearance"
                        : docPreviewModal.type === "coa"
                          ? "Laboratory Certificate of Analysis (HPLC/GC-MS)"
                          : "Corporate Legal Entity Filing"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6e6e7a]">Issuer Jurisdiction:</span>
                    <span className="font-bold text-[#1a1a1e]">{company.countryCode}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6e6e7a]">Hash Digest (SHA-256):</span>
                    <span className="font-mono text-[10px] text-[#78716c] truncate max-w-[200px]">
                      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </span>
                  </div>
                </div>

                <div className="bg-[#f0f8f3] border border-[#c6e5d2] p-3 text-[11px] text-[#144729] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2e8b57] flex-shrink-0" />
                  <span>
                    This document directly authenticates the safety formula and batch composition
                    for consumer and retail verification.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDocPreviewModal(null)}
                  className="bg-[#1a1a1e] hover:bg-[#b8962e] text-white px-5 py-2 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
