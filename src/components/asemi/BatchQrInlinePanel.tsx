import React, { useEffect, useState } from "react";
import {
  generateBatchQrCode,
  downloadBatchQr,
  type BatchProductInfo,
  type BatchQrResult,
} from "@/lib/qr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Package,
  Layers,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

export interface BatchQrInlinePanelProps {
  batchId: string;
  productInfo: BatchProductInfo;
  onOpenModal?: () => void;
  className?: string;
}

/**
 * Dynamically generates, displays, and provides downloads for a batch's QR code
 * right inside the Code Bank page.
 */
export function BatchQrInlinePanel({
  batchId,
  productInfo,
  onOpenModal,
  className = "",
}: BatchQrInlinePanelProps) {
  const [loading, setLoading] = useState(true);
  const [batchQr, setBatchQr] = useState<BatchQrResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    let active = true;
    setLoading(true);

    generateBatchQrCode(batchId, productInfo, { width: 280, margin: 1 })
      .then((res) => {
        if (active) {
          setBatchQr(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Batch QR generation error:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [batchId, productInfo]);

  const handleDownload = (format: "png" | "svg") => {
    if (!batchQr) return;
    downloadBatchQr(batchQr, format);
    toast.success(`Downloaded Batch QR (${format.toUpperCase()})`);
  };

  const handleCopy = () => {
    if (!batchQr) return;
    navigator.clipboard.writeText(batchQr.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Verification URL copied to clipboard");
  };

  return (
    <div
      className={`panel overflow-hidden border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Info */}
        <div className="space-y-2 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-[#caa33a] border border-amber-500/40">
              <QrCode className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300">
              Batch Verification QR Code
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-foreground bg-background"
            >
              {productInfo.batchNumber || batchId.slice(0, 8)}
            </Badge>
          </div>

          <div>
            <h4 className="text-base font-semibold text-foreground">{productInfo.productName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dynamically generated master verification code for this production run. Scan with any
              mobile camera to verify origin and authenticity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            <span>
              Batch ID:{" "}
              <strong className="font-mono text-foreground font-normal">
                {batchId.slice(0, 12)}…
              </strong>
            </span>
            {productInfo.quantity !== undefined && (
              <span>
                Total Codes:{" "}
                <strong className="text-foreground">{productInfo.quantity.toLocaleString()}</strong>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleDownload("png")}
              disabled={loading || !batchQr}
              className="h-8 gap-1.5 text-xs bg-zinc-950 hover:bg-black text-white"
            >
              <Download className="size-3.5" /> Download QR (PNG)
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload("svg")}
              disabled={loading || !batchQr}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="size-3.5" /> SVG
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              disabled={loading || !batchQr}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy URL
            </Button>

            {batchQr && (
              <a
                href={batchQr.verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent text-foreground gap-1.5 transition-colors"
                title="Test verification scan in new tab"
              >
                <ExternalLink className="size-3.5" /> Test Scan
              </a>
            )}

            {onOpenModal && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onOpenModal}
                className="h-8 w-8 p-0"
                title="Open full view modal"
              >
                <Maximize2 className="size-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Dynamic QR preview badge */}
        <div className="flex flex-col items-center justify-center self-center sm:self-auto shrink-0">
          <div className="relative rounded-xl border-2 border-amber-500/40 bg-white p-2.5 shadow-md transition-transform hover:scale-105">
            {loading ? (
              <div className="flex h-32 w-32 items-center justify-center bg-zinc-50 rounded-lg">
                <Loader2 className="size-6 animate-spin text-zinc-400" />
              </div>
            ) : batchQr ? (
              <img
                src={batchQr.qrDataUrl}
                alt={`Batch QR for ${productInfo.batchNumber || batchId}`}
                className="h-32 w-32 object-contain"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center text-xs text-muted-foreground">
                QR Error
              </div>
            )}
          </div>
          <span className="mt-1.5 font-mono text-[10px] text-muted-foreground font-medium">
            asemi.io/verify?batch=…
          </span>
        </div>
      </div>
    </div>
  );
}
