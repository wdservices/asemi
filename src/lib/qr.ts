import QRCode from "qrcode";

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
  const { width = 300, margin = 1 } = options;
  return QRCode.toString(text, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel: "H",
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

export interface BatchProductInfo {
  productName: string;
  productId?: string;
  batchNumber?: string;
  brandName?: string;
  tagFormat?: "circle" | "rectangle";
  lotNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  quantity?: number;
}

export interface BatchQrResult {
  batchId: string;
  verificationUrl: string;
  qrDataUrl: string;
  svgString: string;
  productInfo: BatchProductInfo;
}

/**
 * Dynamically generates a high-resolution QR code for a specific product batch,
 * encoding verification URL and metadata, ready for display and downloading.
 */
export async function generateBatchQrCode(
  batchId: string,
  productInfo: BatchProductInfo,
  options: QrOptions & { layout?: "circle" | "rectangle" } = {},
): Promise<BatchQrResult> {
  const { width = 360, margin = 1, darkColor = "#000000", lightColor = "#ffffff" } = options;
  const layout = options.layout || productInfo.tagFormat || "rectangle";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://asemi.io";
  const params = new URLSearchParams();
  params.set("batch", batchId);
  if (productInfo.batchNumber) params.set("batchNo", productInfo.batchNumber);
  if (productInfo.productId) params.set("product", productInfo.productId);
  if (productInfo.productName) params.set("productName", productInfo.productName);
  if (layout) params.set("format", layout);

  const verificationUrl = `${baseUrl}/verify?${params.toString()}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width,
    margin,
    errorCorrectionLevel: "H",
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });

  const svgString = await QRCode.toString(verificationUrl, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel: "H",
  });

  return {
    batchId,
    verificationUrl,
    qrDataUrl,
    svgString,
    productInfo,
  };
}

export function downloadBatchQr(batchQr: BatchQrResult, format: "png" | "svg" = "png"): void {
  const name = (batchQr.productInfo.batchNumber || batchQr.batchId).replace(/[^a-zA-Z0-9_-]/g, "");
  if (format === "png") {
    downloadDataUrl(batchQr.qrDataUrl, `asemi-batch-${name}-qr.png`);
  } else {
    const blob = new Blob([batchQr.svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `asemi-batch-${name}-qr.svg`);
    URL.revokeObjectURL(url);
  }
}

export interface TagRenderOptions {
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  logoUrl?: string;
  style: "rectangle" | "circle";
  scale?: number; // default 2 for crisp print/export
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
    style,
    scale = 2,
  } = options;

  const verifyUrl = getVerificationUrl(codeString);
  // Render the QR large, then draw it down — downscaling keeps edges sharp.
  const qrDataUrl = await generateQrDataUrl(verifyUrl, {
    width: 200 * scale,
    margin: 1,
    darkColor: "#111111",
    lightColor: "#ffffff",
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
    // Plain printable verification label — flat white, no holographic
    // patterns (they conflict with real holographic sticker stock).
    // Pops with a soft drop shadow behind it.
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

    // 1. Flat white body + slate hairline border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Thin slate border (screen pop comes from CSS/SVG shadows; print stays clean)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(4 * scale, 4 * scale, w - 8 * scale, h - 8 * scale);

    // 2. Product logo header on a white plate (fallback: brand monogram)
    const plateW = 132 * scale;
    const plateH = 52 * scale;
    const plateX = (w - plateW) / 2;
    const plateY = 14 * scale;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, plateH, 6 * scale);
    ctx.fill();

    if (logoImage) {
      drawImageContain(
        ctx,
        logoImage,
        plateX + 6 * scale,
        plateY + 5 * scale,
        plateW - 12 * scale,
        plateH - 10 * scale,
      );
    } else {
      ctx.fillStyle = "#1e3a1e";
      ctx.beginPath();
      ctx.roundRect(w / 2 - 26 * scale, plateY + 8 * scale, 52 * scale, 36 * scale, 5 * scale);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(brandInitials(brandName), w / 2, plateY + 33 * scale);
    }

    // Product name right under the logo
    const shortName = productName.length > 26 ? `${productName.slice(0, 25)}…` : productName;
    ctx.fillStyle = "#18181b";
    ctx.font = `bold ${13 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(shortName, w / 2, 86 * scale);

    // 3. High-Contrast QR Code box — drawn smaller, stays sharp via downscale
    const qrSize = 120 * scale;
    const qrX = (w - qrSize) / 2;
    const qrY = 96 * scale;

    // White plate behind QR
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect(
      qrX - 4 * scale,
      qrY - 4 * scale,
      qrSize + 8 * scale,
      qrSize + 8 * scale,
      6 * scale,
    );
    ctx.fill();
    ctx.stroke();

    // Draw QR code
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // 4. Verification code panel — printed openly as plain text
    const panelY = 226 * scale;
    const panelW = w - 40 * scale;
    const panelH = 64 * scale;
    const panelX = (w - panelW) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 4 * scale);
    ctx.fill();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // "Beware of counterfeits" moved inside the card
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${11 * scale}px sans-serif`;
    ctx.fillText("Beware of counterfeits", w / 2, panelY + 18 * scale);

    // The unique code, displayed openly
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${12 * scale}px "JetBrains Mono", monospace`;
    ctx.fillText(codeString, w / 2, panelY + 38 * scale);

    ctx.fillStyle = "#4b5563";
    ctx.font = `500 ${8.5 * scale}px sans-serif`;
    ctx.fillText("Scan QR or visit verification portal", w / 2, panelY + 55 * scale);

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
    style,
  } = options;

  const verifyUrl = getVerificationUrl(codeString);
  const qrDataUrl = await generateQrDataUrl(verifyUrl, {
    width: 480,
    margin: 1,
    darkColor: "#111111",
    lightColor: "#ffffff",
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
      ? `<image href="${logoDataUrl}" x="80" y="19" width="120" height="42" preserveAspectRatio="xMidYMid meet" />`
      : `<rect x="114" y="22" width="52" height="36" rx="5" fill="#1e3a1e" />
    <text x="${w / 2}" y="47" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle">${escapeXml(brandInitials(brandName))}</text>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="28mm" height="32mm" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="tag-shadow-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.28" />
    </filter>
    <clipPath id="rect-clip-${uid}">
      <rect x="0" y="0" width="${w}" height="${h}" rx="16" ry="16" />
    </clipPath>
  </defs>

  <!-- Tag Body: flat white so it prints cleanly on holographic stock -->
  <g clip-path="url(#rect-clip-${uid})" filter="url(#tag-shadow-${uid})">
    <!-- 1. Flat white body -->
    <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" />

    <!-- Thin slate border -->
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="14" ry="14" fill="none" stroke="#cbd5e1" stroke-width="2" />

    <!-- 2. Product logo header -->
    <rect x="74" y="14" width="132" height="52" rx="6" fill="#ffffff" />
    ${logoHeader}

    <!-- Product name -->
    <text x="${w / 2}" y="86" fill="#18181b" font-size="13" font-weight="bold" text-anchor="middle">${shortProduct}</text>

    <!-- 3. High-Contrast QR Code Plaque (smaller, high-res source) -->
    <rect x="76" y="92" width="128" height="128" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="3" />
    <image href="${qrDataUrl}" x="80" y="96" width="120" height="120" />

    <!-- 4. Verification code panel — printed openly as plain text -->
    <rect x="20" y="226" width="240" height="64" rx="4" fill="#ffffff" stroke="#3f3f46" stroke-width="1" />
    <text x="${w / 2}" y="244" fill="#111827" font-size="11" font-weight="bold" text-anchor="middle">Beware of counterfeits</text>

    <text x="${w / 2}" y="264" fill="#0f172a" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" text-anchor="middle">${safeCode}</text>
    <text x="${w / 2}" y="281" fill="#4b5563" font-size="8.5" font-weight="500" text-anchor="middle">Scan QR or visit verification portal</text>
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
