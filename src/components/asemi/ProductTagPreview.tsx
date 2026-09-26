import React, { useEffect, useState } from "react";
import {
  generateQrDataUrl,
  renderTagToCanvas,
  generateTagSvg,
  downloadSingleTagSvg,
  downloadDataUrl,
  getVerificationUrl,
} from "@/lib/qr";
import { downloadSingleTagPdf } from "@/lib/tag-exporter";
import { Download, Printer, Check, Copy, ExternalLink, Sparkles, FileText, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ProductTagProps {
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  logoUrl?: string;
  showActions?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function BrandInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-10 px-3 rounded-xl bg-emerald-800 text-white font-bold text-sm flex items-center justify-center shadow-sm">
      {initials || "AS"}
    </div>
  );
}

export function ProductTagPreview({
  codeString,
  productName = "Product Authentication",
  brandName = "Asemi Security",
  batchNumber,
  logoUrl,
  showActions = true,
  className = "",
  size = "md",
}: ProductTagProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const verifyUrl = getVerificationUrl(codeString);

  useEffect(() => {
    let active = true;
    // Render at 2x display size so the QR stays razor-sharp for cameras.
    generateQrDataUrl(verifyUrl, { width: 480, margin: 1 })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((err) => console.error("QR generation failed", err));
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  const handleDownloadTag = async () => {
    try {
      setDownloading(true);
      const dataUrl = await renderTagToCanvas({
        codeString,
        ...(productName ? { productName } : {}),
        ...(brandName ? { brandName } : {}),
        ...(batchNumber ? { batchNumber } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        style: "rectangle",
        scale: 3, // High-res 300 DPI equivalent
      });
      const filename = `asemi-tag-${codeString}-rectangle.png`;
      downloadDataUrl(dataUrl, filename);
      toast.success(`Downloaded tag for ${codeString}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate tag image");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadQrOnly = () => {
    if (!qrUrl) return;
    downloadDataUrl(qrUrl, `asemi-qr-${codeString}.png`);
    toast.success("Downloaded QR code");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`Copied code: ${codeString}`);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await downloadSingleTagPdf({
        codeString,
        ...(productName ? { productName } : {}),
        ...(brandName ? { brandName } : {}),
        ...(batchNumber ? { batchNumber } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        style: "rectangle",
      });
      toast.success(`Downloaded print-ready PDF proof for ${codeString}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF proof");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSvg = async () => {
    try {
      setDownloading(true);
      const svg = await generateTagSvg({
        codeString,
        ...(productName ? { productName } : {}),
        ...(brandName ? { brandName } : {}),
        ...(batchNumber ? { batchNumber } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        style: "rectangle",
      });
      downloadSingleTagSvg(svg, `asemi-tag-${codeString}-rectangle.svg`);
      toast.success(`Downloaded vector SVG for ${codeString}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate SVG");
    } finally {
      setDownloading(false);
    }
  };

  // Dimensions based on size
  const scaleClass = size === "sm" ? "w-[200px]" : size === "lg" ? "w-[320px]" : "w-[260px]";

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Plain printable verification label — no holographic patterns so it
          prints cleanly on real holographic sticker stock. Pops with a soft
          drop shadow behind it. */}
      <div
        className={`relative ${scaleClass} select-none overflow-hidden rounded-2xl border border-slate-300 bg-white font-sans shadow-[0_20px_45px_rgba(15,23,42,0.28)] transition-transform hover:scale-[1.01]`}
      >
        {/* Tag Content */}
        <div className="relative z-10 flex flex-col items-center px-4 py-3.5 text-center">
          {/* Product logo header */}
          <div className="mb-1.5 flex min-h-[40px] items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Product logo"
                className="h-10 max-w-[140px] rounded-lg bg-white object-contain px-1 shadow-sm ring-1 ring-slate-200"
              />
            ) : (
              <BrandInitials name={brandName} />
            )}
          </div>

          {/* Product name */}
          {productName && (
            <p className="mb-2 max-w-[92%] truncate text-[13px] font-bold tracking-tight text-zinc-950">
              {productName}
            </p>
          )}

          {/* QR Code Plaque — smaller, rendered 2x for camera-sharp edges */}
          <div className="relative rounded-xl border-2 border-slate-300 bg-white p-2 shadow-md">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR for ${codeString}`}
                className="h-24 w-24 object-contain [image-rendering:pixelated]"
              />
            ) : (
              <div className="flex h-24 w-24 animate-pulse items-center justify-center bg-zinc-100 text-xs text-zinc-400">
                Loading QR…
              </div>
            )}
          </div>

          {/* Verification code — printed openly as plain text (not tappable: print can't be tapped) */}
          <div className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 shadow-sm">
            <p className="text-[11px] font-extrabold tracking-tight text-zinc-950">
              Beware of counterfeits
            </p>
            <p className="mt-0.5 font-mono text-xs font-black tracking-wider text-zinc-950">
              {codeString}
            </p>
            <p className="mt-0.5 text-[8px] font-medium text-zinc-600">
              Scan QR or visit verification portal
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <Button
            variant="default"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadTag}
            className="h-8 gap-1.5 text-xs bg-zinc-950 hover:bg-black text-white"
            title="Download high-resolution PNG"
          >
            {downloading ? (
              <Sparkles className="size-3.5 animate-spin text-blue-500" />
            ) : (
              <Download className="size-3.5" />
            )}
            PNG
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="h-8 gap-1.5 text-xs"
            title="Download print-ready PDF proof (300 DPI)"
          >
            <FileText className="size-3.5" /> PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadSvg}
            className="h-8 gap-1.5 text-xs hover:bg-accent"
            title="Download infinite vector SVG"
          >
            <Code2 className="size-3.5" /> SVG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQrOnly}
            className="h-8 gap-1.5 text-xs"
            title="Download QR code only"
          >
            QR
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-8 w-8 p-0"
            title="Copy code string"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>

          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
            title="Open test verification"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
