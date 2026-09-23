import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateBatchQrCode,
  downloadBatchQr,
  type BatchProductInfo,
  type BatchQrResult,
} from "@/lib/qr";
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
} from "lucide-react";
import { toast } from "sonner";

export interface BatchQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  productInfo: BatchProductInfo;
}

export function BatchQrModal({ open, onOpenChange, batchId, productInfo }: BatchQrModalProps) {
  const [loading, setLoading] = useState(true);
  const [batchQr, setBatchQr] = useState<BatchQrResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !batchId) return;

    let active = true;
    setLoading(true);

    generateBatchQrCode(batchId, productInfo, { width: 360, margin: 1 })
      .then((res) => {
        if (active) {
          setBatchQr(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Batch QR generation failed", err);
        if (active) setLoading(false);
        toast.error("Failed to generate Batch QR code");
      });

    return () => {
      active = false;
    };
  }, [open, batchId, productInfo]);

  const handleCopyUrl = () => {
    if (!batchQr) return;
    navigator.clipboard.writeText(batchQr.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Batch verification URL copied to clipboard");
  };

  const handleDownloadPng = () => {
    if (!batchQr) return;
    downloadBatchQr(batchQr, "png");
    toast.success(`Downloaded batch QR code (PNG)`);
  };

  const handleDownloadSvg = () => {
    if (!batchQr) return;
    downloadBatchQr(batchQr, "svg");
    toast.success(`Downloaded batch QR vector (SVG)`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-zinc-200">
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-[#caa33a] border border-amber-500/30">
                <QrCode className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Batch Verification QR Code
                </DialogTitle>
                <p className="text-xs text-zinc-300">
                  Dynamic high-density QR code for entire production batch
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-amber-300 border-amber-500/40 text-[11px]">
              {productInfo.batchNumber || batchId.slice(0, 8)}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Metadata Card */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Package className="size-3.5" /> Product
              </span>
              <span className="font-semibold text-zinc-900">{productInfo.productName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Layers className="size-3.5" /> Batch Number
              </span>
              <span className="font-mono font-medium text-zinc-900">
                {productInfo.batchNumber || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Batch ID</span>
              <span className="font-mono text-[11px] text-zinc-600 truncate max-w-[200px]">
                {batchId}
              </span>
            </div>
            {productInfo.quantity !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total Batch Codes</span>
                <span className="font-semibold text-zinc-900">
                  {productInfo.quantity.toLocaleString()} units
                </span>
              </div>
            )}
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center py-2">
            {loading ? (
              <div className="flex h-56 w-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50">
                <Loader2 className="size-8 animate-spin text-zinc-500" />
                <p className="mt-2 text-xs text-zinc-500">Generating dynamic batch QR…</p>
              </div>
            ) : batchQr ? (
              <div className="flex flex-col items-center">
                <div className="relative rounded-2xl border-2 border-zinc-900/10 bg-white p-4 shadow-xl">
                  <img
                    src={batchQr.qrDataUrl}
                    alt={`Batch QR for ${productInfo.batchNumber || batchId}`}
                    className="h-52 w-52 object-contain"
                  />
                  <div className="mt-2 text-center">
                    <span className="font-mono text-[10px] text-zinc-500 block truncate max-w-[210px]">
                      {batchQr.verificationUrl}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-zinc-500 max-w-xs">
                  Scan to verify this batch, check authentication logs, or verify origin integrity.
                </p>
              </div>
            ) : null}
          </div>

          {/* Download & Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t">
            <Button
              onClick={handleDownloadPng}
              disabled={loading || !batchQr}
              className="gap-2 bg-zinc-950 hover:bg-black text-white text-xs"
            >
              <Download className="size-3.5" /> Download QR (PNG)
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadSvg}
              disabled={loading || !batchQr}
              className="gap-2 text-xs"
            >
              <Download className="size-3.5" /> Vector SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              disabled={loading || !batchQr}
              className="gap-1.5 text-xs"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy Verify URL
            </Button>
            {batchQr && (
              <a
                href={batchQr.verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground gap-1.5"
              >
                <ExternalLink className="size-3.5" /> Test Scanner Link
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
