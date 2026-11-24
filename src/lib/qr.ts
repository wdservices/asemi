import QRCode from "qrcode";
import { resolveLabelPalette, type LabelStyleConfig } from "@/lib/label-themes";

export interface QrOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

export function getVerificationUrl(codeString: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/v/${encodeURIComponent(codeString)}`;
  }
  return `https://asemi.io/v/${encodeURIComponent(codeString)}`;
}

export async function generateQrDataUrl(text: string, options: QrOptions = {}): Promise<string> {
  const { width = 300, margin = 1, darkColor = "#000000", lightColor = "#ffffff" } = options;

  return QRCode.toDataURL(text, {
    width,
    margin,
    errorCorrectionLevel: "H",
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

export async function generateQrSvg(text: string, options: QrOptions = {}): Promise<string> {
  const { width = 300, margin = 1, darkColor = "#000000", lightColor = "#ffffff" } = options;
  return QRCode.toString(text, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel: "H",
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface TagRenderOptions {
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  logoUrl?: string;
  style: "rectangle" | "circle";
  scale?: number; // default 2 for crisp print/export
  labelStyle?: LabelStyleConfig | undefined;
}

/** Load a logo image with CORS; resolves null on any failure (fallback art). */
async function loadLogoImage(url: string, timeoutMs = 4000): Promise<HTMLImageElement | null> {
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(new Error("logo timeout")), timeoutMs);
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("logo load failed"));
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

/** Fetch a remote image and return a data URL (for embedding in SVG exports). */
async function fetchImageDataUrl(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function brandInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AS"
  );
}

/** Draw an image contained (aspect-preserved) inside the given box. */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * r;
  const dh = img.naturalHeight * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/**
 * Renders high-fidelity holographic / security tag onto an HTMLCanvasElement
 * and returns the PNG data URL.
 */
export async function renderTagToCanvas(options: TagRenderOptions): Promise<string> {
  const {
    codeString,
    productName = "Product Authentication",
    brandName = "Asemi Security",
    logoUrl,
    labelStyle,
    scale = 2,
  } = options;

  const palette = resolveLabelPalette(labelStyle);
  const verifyUrl = getVerificationUrl(codeString);
  // Render the QR large, then draw it down — downscaling keeps edges sharp.
  const qrDataUrl = await generateQrDataUrl(verifyUrl, {
    width: 200 * scale,
    margin: 1,
    darkColor: palette.qrDark,
    lightColor: palette.qrLight,
  });

  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  const logoImage = logoUrl ? await loadLogoImage(logoUrl) : null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  {
    const w = 280 * scale;
    const h = 320 * scale;
    canvas.width = w;
    canvas.height = h;

    // Outer rounded corner clip
    const radius = 16 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.clip();

    // 1. Card background (metallic gradient, tinted gradient, or crisp white)
    if (palette.cardGradientStops && palette.cardGradientStops.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      const stops = palette.cardGradientStops;
      stops.forEach((color, idx) => {
        grad.addColorStop(idx / (stops.length - 1), color);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = palette.cardBg;
    }
    ctx.fillRect(0, 0, w, h);

    // Subtle brushed grain overlay for metallic finishes
    if (palette.isMetallic) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = 1 * scale;
      for (let yPos = 0; yPos < h; yPos += 6 * scale) {
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(w, yPos - 14 * scale);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Inner rounded frame stroke
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect(4 * scale, 4 * scale, w - 8 * scale, h - 8 * scale, 13 * scale);
    ctx.stroke();

    // 2. Product logo header (crisp plate if logo exists, otherwise brand monogram)
    const plateW = 132 * scale;
    const plateH = 52 * scale;
    const plateX = (w - plateW) / 2;
    const plateY = 14 * scale;

    if (logoImage) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.beginPath();
      ctx.roundRect(plateX, plateY, plateW, plateH, 8 * scale);
      ctx.fill();
      drawImageContain(
        ctx,
        logoImage,
        plateX + 6 * scale,
        plateY + 5 * scale,
        plateW - 12 * scale,
        plateH - 10 * scale,
      );
    } else {
      ctx.fillStyle = palette.accentColor;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 26 * scale, plateY + 8 * scale, 52 * scale, 36 * scale, 7 * scale);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(brandInitials(brandName), w / 2, plateY + 32 * scale);
    }

    // Product name right under the logo
    const shortName = productName.length > 26 ? `${productName.slice(0, 25)}…` : productName;
    ctx.fillStyle = palette.textPrimary;
    ctx.font = `bold ${13 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(shortName, w / 2, 86 * scale);

    // 3. High-Contrast QR Code box
    const qrSize = 120 * scale;
    const qrX = (w - qrSize) / 2;
    const qrY = 96 * scale;

    ctx.fillStyle = palette.qrPlaqueBg;
    ctx.strokeStyle = palette.qrPlaqueBorder;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.roundRect(
      qrX - 6 * scale,
      qrY - 6 * scale,
      qrSize + 12 * scale,
      qrSize + 12 * scale,
      8 * scale,
    );
    ctx.fill();
    ctx.stroke();

    // Draw QR code
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // 4. Verification code panel
    const panelY = 228 * scale;
    const panelW = w - 38 * scale;
    const panelH = 66 * scale;
    const panelX = (w - panelW) / 2;

    ctx.fillStyle = palette.footerBg;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 6 * scale);
    ctx.fill();
    ctx.strokeStyle = palette.footerBorder;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    ctx.fillStyle = palette.footerText;
    ctx.font = `bold ${11 * scale}px sans-serif`;
    ctx.fillText("Beware of counterfeits", w / 2, panelY + 19 * scale);

    ctx.fillStyle = palette.footerText;
    ctx.font = `bold ${12 * scale}px "JetBrains Mono", monospace`;
    ctx.fillText(codeString, w / 2, panelY + 39 * scale);

    ctx.fillStyle = palette.footerSubtext;
    ctx.font = `500 ${8.5 * scale}px sans-serif`;
    ctx.fillText("Scan QR or visit verification portal", w / 2, panelY + 56 * scale);

    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Generates a high-resolution, vector SVG string for the specified security tag
 * preserving the exact 'Circular Tag' or 'Rectangular Label' design for professional printing.
 */
export async function generateTagSvg(options: TagRenderOptions): Promise<string> {
  const {
    codeString,
    productName = "Product Authentication",
    brandName = "Asemi Security",
    logoUrl,
    labelStyle,
  } = options;

  const palette = resolveLabelPalette(labelStyle);
  const verifyUrl = getVerificationUrl(codeString);
  const qrDataUrl = await generateQrDataUrl(verifyUrl, {
    width: 480,
    margin: 1,
    darkColor: palette.qrDark,
    lightColor: palette.qrLight,
  });
  const logoDataUrl = logoUrl ? await fetchImageDataUrl(logoUrl) : null;

  const uid = `tag-${codeString.replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 7)}`;

  {
    // 280 x 320 standard packaging sticker aspect ratio (28x32mm print)
    const w = 280;
    const h = 320;

    const shortProduct = escapeXml(
      productName.length > 26 ? `${productName.slice(0, 25)}…` : productName,
    );
    const safeCode = escapeXml(codeString);
    const logoHeader = logoDataUrl
      ? `<rect x="74" y="14" width="132" height="52" rx="8" fill="rgba(255,255,255,0.94)" />
    <image href="${logoDataUrl}" x="80" y="19" width="120" height="42" preserveAspectRatio="xMidYMid meet" />`
      : `<rect x="114" y="22" width="52" height="36" rx="7" fill="${palette.accentColor}" />
    <text x="${w / 2}" y="46" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle">${escapeXml(brandInitials(brandName))}</text>`;

    const gradientDef =
      palette.cardGradientStops && palette.cardGradientStops.length >= 2
        ? `<linearGradient id="card-bg-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      ${palette.cardGradientStops
        .map((stop, idx) => {
          const pct = Math.round((idx / (palette.cardGradientStops!.length - 1)) * 100);
          return `<stop offset="${pct}%" stop-color="${stop}" />`;
        })
        .join("\n      ")}
    </linearGradient>`
        : "";
    const cardFill = gradientDef ? `url(#card-bg-${uid})` : palette.cardBg;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="28mm" height="32mm" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    ${gradientDef}
    <filter id="tag-shadow-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.28" />
    </filter>
    <clipPath id="rect-clip-${uid}">
      <rect x="0" y="0" width="${w}" height="${h}" rx="16" ry="16" />
    </clipPath>
  </defs>

  <g clip-path="url(#rect-clip-${uid})" filter="url(#tag-shadow-${uid})">
    <!-- 1. Label body -->
    <rect x="0" y="0" width="${w}" height="${h}" fill="${cardFill}" />

    <!-- Border -->
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="13" ry="13" fill="none" stroke="${palette.cardBorder}" stroke-width="2" />

    <!-- 2. Product logo header -->
    ${logoHeader}

    <!-- Product name -->
    <text x="${w / 2}" y="86" fill="${palette.textPrimary}" font-size="13" font-weight="bold" text-anchor="middle">${shortProduct}</text>

    <!-- 3. High-Contrast QR Code Plaque -->
    <rect x="74" y="90" width="132" height="132" rx="8" fill="${palette.qrPlaqueBg}" stroke="${palette.qrPlaqueBorder}" stroke-width="2.5" />
    <image href="${qrDataUrl}" x="80" y="96" width="120" height="120" />

    <!-- 4. Verification code panel -->
    <rect x="19" y="228" width="242" height="66" rx="6" fill="${palette.footerBg}" stroke="${palette.footerBorder}" stroke-width="1.2" />
    <text x="${w / 2}" y="247" fill="${palette.footerText}" font-size="11" font-weight="bold" text-anchor="middle">Beware of counterfeits</text>

    <text x="${w / 2}" y="267" fill="${palette.footerText}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" text-anchor="middle">${safeCode}</text>
    <text x="${w / 2}" y="284" fill="${palette.footerSubtext}" font-size="8.5" font-weight="500" text-anchor="middle">Scan QR or visit verification portal</text>
  </g>
</svg>`;
  }
}

export function downloadSingleTagSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}
