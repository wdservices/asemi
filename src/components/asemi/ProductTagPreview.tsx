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
  style?: "rectangle" | "circle";
  showActions?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProductTagPreview({
  codeString,
  productName = "Product Authentication",
  brandName = "Asemi Security",
  batchNumber,
  style = "rectangle",
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
    generateQrDataUrl(verifyUrl, { width: 220, margin: 1 })
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
        productName,
        brandName,
        batchNumber,
        style,
        scale: 3, // High-res 300 DPI equivalent
      });
      const filename = `asemi-tag-${codeString}-${style}.png`;
      downloadDataUrl(dataUrl, filename);
      toast.success(`Downloaded ${style} tag for ${codeString}`);
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
        productName,
        brandName,
        batchNumber,
        style,
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
        productName,
        brandName,
        batchNumber,
        style,
      });
      downloadSingleTagSvg(svg, `asemi-tag-${codeString}-${style}.svg`);
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
      {style === "rectangle" ? (
        /* ================= HOLOGRAPHIC RECTANGLE TAG (Matches User Photo) ================= */
        <div
          className={`relative ${scaleClass} select-none overflow-hidden rounded-2xl border-2 border-[#b8932c] shadow-[0_12px_36px_rgba(184,147,44,0.35)] font-sans transition-transform hover:scale-[1.01]`}
          style={{
            background:
              "radial-gradient(circle at 50% 35%, #fff9d6 0%, #ecd37a 28%, #c59728 65%, #926f16 100%)",
          }}
        >
          {/* Holographic dynamic radial rays overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.8) 0deg 10deg, transparent 10deg 20deg)",
            }}
          />
          {/* Metallic shimmer hairline */}
          <div className="pointer-events-none absolute inset-1 rounded-xl border border-white/60" />

          {/* Tag Content */}
          <div className="relative z-10 flex flex-col items-center px-4 py-3.5 text-center">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-6 px-2 rounded-md bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                AS
              </div>
              <span className="font-serif italic font-extrabold text-[15px] tracking-tight text-zinc-950">
                {brandName}
              </span>
              <span className="text-[9px] font-bold text-zinc-800 -mt-2">®</span>
            </div>

            {/* Product Name if present */}
            {productName && (
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-800/80 mb-2 truncate max-w-[90%]">
                {productName}
              </p>
            )}

            {/* QR Code Plaque */}
            <div className="relative rounded-xl bg-white p-2 border-2 border-[#caa33a] shadow-md">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR for ${codeString}`}
                  className="w-28 h-28 object-contain"
                />
              ) : (
                <div className="w-28 h-28 bg-zinc-100 animate-pulse flex items-center justify-center text-xs text-zinc-400">
                  Loading QR…
                </div>
              )}
            </div>

            {/* Domain text */}
            <p className="mt-1.5 font-mono text-[10px] font-semibold text-zinc-900 tracking-tight">
              asemi.io/verify
            </p>

            {/* Scratch layer banner (Exactly as on photo) */}
            <div className="mt-2 w-full rounded-md border border-zinc-500 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 px-2 py-1 shadow-inner text-zinc-900">
              <p className="text-[9px] font-bold tracking-tight text-zinc-800 uppercase">
                Scrape the layer to verify authenticity
              </p>
              <div className="mt-0.5 font-mono text-xs font-black tracking-wider text-zinc-950 bg-white/70 rounded px-1.5 py-0.5">
                {codeString}
              </div>
            </div>

            {/* Bottom Caution / Anti-Counterfeit Notice */}
            <div className="mt-2.5">
              <p className="text-[11px] font-extrabold tracking-tight text-zinc-950">
                Beware of counterfeits
              </p>
              <p className="text-[8px] font-medium text-zinc-800">
                Scan QR or visit verification portal
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ================= CIRCULAR TAMPER-EVIDENT BADGE ================= */
        <div
          className={`relative ${
            size === "sm"
              ? "w-[200px] h-[200px]"
              : size === "lg"
                ? "w-[300px] h-[300px]"
                : "w-[250px] h-[250px]"
          } select-none rounded-full border-4 border-[#77550e] shadow-[0_12px_36px_rgba(184,147,44,0.35)] font-sans overflow-hidden transition-transform hover:scale-[1.01]`}
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #fff7ce 0%, #deb33a 45%, #b2861c 78%, #75540c 100%)",
          }}
        >
          {/* Guilloche concentric lines */}
          <div className="pointer-events-none absolute inset-2 rounded-full border-2 border-dashed border-white/70" />
          <div className="pointer-events-none absolute inset-3 rounded-full border border-black/30" />

          {/* Circular SVG curved text */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200">
            <path id={`curve-top-${codeString}`} d="M 25 100 A 75 75 0 0 1 175 100" fill="none" />
            <path
              id={`curve-bottom-${codeString}`}
              d="M 175 100 A 75 75 0 0 1 25 100"
              fill="none"
            />
            <text className="text-[9px] font-black fill-zinc-950 uppercase tracking-[0.2em]">
              <textPath href={`#curve-top-${codeString}`} startOffset="50%" textAnchor="middle">
                ★ GENUINE AUTHENTIC SEAL ★
              </textPath>
            </text>
            <text className="text-[8px] font-bold fill-zinc-950 uppercase tracking-[0.16em]">
              <textPath href={`#curve-bottom-${codeString}`} startOffset="50%" textAnchor="middle">
                • SCAN TO VERIFY AUTHENTICITY •
              </textPath>
            </text>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
            <div className="relative rounded-xl bg-white p-1.5 border-2 border-[#805e11] shadow-md">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR for ${codeString}`}
                  className="w-20 h-20 object-contain"
                />
              ) : (
                <div className="w-20 h-20 bg-zinc-100 animate-pulse flex items-center justify-center text-[10px] text-zinc-400">
                  QR…
                </div>
              )}
            </div>

            <div className="mt-1 bg-white/90 border border-zinc-800 rounded px-1.5 py-0.5 shadow-sm">
              <span className="font-mono text-[10px] font-black text-zinc-950">{codeString}</span>
            </div>
          </div>
        </div>
      )}

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
              <Sparkles className="size-3.5 animate-spin text-[#c9a84c]" />
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
            className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10"
            title="Download print-ready PDF proof (300 DPI)"
          >
            <FileText className="size-3.5 text-[#caa33a]" /> PDF
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
