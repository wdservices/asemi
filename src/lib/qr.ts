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
  style: "rectangle" | "circle";
  scale?: number; // default 2 for crisp print/export
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
    style,
    scale = 2,
  } = options;

  const verifyUrl = getVerificationUrl(codeString);
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

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  if (style === "rectangle") {
    // Holographic Gold Rectangle Tag (Matches the tea/product sticker)
    const w = 280 * scale;
    const h = 380 * scale;
    canvas.width = w;
    canvas.height = h;

    // Outer rounded corner clip
    const radius = 16 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.clip();

    // 1. Holographic Gold Sunburst background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#e8c352");
    bgGrad.addColorStop(0.25, "#fff2a8");
    bgGrad.addColorStop(0.5, "#d4a737");
    bgGrad.addColorStop(0.75, "#fff8cb");
    bgGrad.addColorStop(1, "#c19225");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Radial ray burst effect
    const centerX = w / 2;
    const centerY = h * 0.4;
    const numRays = 36;
    ctx.save();
    ctx.translate(centerX, centerY);
    for (let i = 0; i < numRays; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const angle1 = (i * 2 * Math.PI) / numRays;
      const angle2 = ((i + 0.5) * 2 * Math.PI) / numRays;
      ctx.arc(0, 0, Math.max(w, h), angle1, angle2);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.28)" : "rgba(180, 130, 20, 0.18)";
      ctx.fill();
    }
    ctx.restore();

    // Metallic fine guilloche border
    ctx.strokeStyle = "#8b6a18";
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(4 * scale, 4 * scale, w - 8 * scale, h - 8 * scale);

    // 2. Brand Header (Top)
    // Brand emblem
    const logoY = 24 * scale;
    ctx.fillStyle = "#1e3a1e"; // Forest green emblem like Wins Town
    ctx.beginPath();
    ctx.roundRect(w / 2 - 18 * scale, logoY, 36 * scale, 24 * scale, 4 * scale);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${14 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("AS", w / 2, logoY + 17 * scale);

    // Brand Name cursive/script style
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `italic bold ${16 * scale}px Georgia, serif`;
    ctx.fillText(brandName, w / 2, logoY + 44 * scale);

    // Registered trademark symbol
    ctx.font = `bold ${8 * scale}px sans-serif`;
    ctx.fillText("®", w / 2 + (brandName.length * 4.5 + 8) * scale, logoY + 36 * scale);

    // 3. High-Contrast QR Code box
    const qrSize = 136 * scale;
    const qrX = (w - qrSize) / 2;
    const qrY = 92 * scale;

    // Gold/white plate behind QR
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#caa33a";
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

    // Verification Domain / URL below QR
    ctx.fillStyle = "#222222";
    ctx.font = `600 ${11 * scale}px "JetBrains Mono", monospace`;
    ctx.fillText("asemi.io/verify", w / 2, qrY + qrSize + 18 * scale);

    // 4. Verification code panel — printed openly
    const panelY = qrY + qrSize + 28 * scale;
    const panelW = w - 40 * scale;
    const panelH = 46 * scale;
    const panelX = (w - panelW) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 4 * scale);
    ctx.fill();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Panel label
    ctx.fillStyle = "#52525b";
    ctx.font = `bold ${9 * scale}px sans-serif`;
    ctx.fillText("SCAN TO VERIFY AUTHENTICITY", w / 2, panelY + 16 * scale);

    // The unique code, displayed openly
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${12 * scale}px "JetBrains Mono", monospace`;
    ctx.fillText(codeString, w / 2, panelY + 34 * scale);

    // 5. Bottom Anti-Counterfeit Notice
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${11 * scale}px sans-serif`;
    ctx.fillText("Beware of counterfeits", w / 2, h - 26 * scale);

    ctx.fillStyle = "#4b5563";
    ctx.font = `500 ${8.5 * scale}px sans-serif`;
    ctx.fillText("Genuine Authentic Seal • Scan to Verify", w / 2, h - 12 * scale);

    ctx.restore();
  } else {
    // Circular Tamper-Evident Badge (Circle Tag)
    const size = 360 * scale;
    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    const radius = size / 2 - 6 * scale;

    ctx.save();

    // Clip circular
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Radial gold medallion background
    const bgGrad = ctx.createRadialGradient(center, center, 10 * scale, center, center, radius);
    bgGrad.addColorStop(0, "#fff5be");
    bgGrad.addColorStop(0.4, "#e0b53c");
    bgGrad.addColorStop(0.8, "#b98c21");
    bgGrad.addColorStop(1, "#835f10");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Serrated security teeth on perimeter
    ctx.fillStyle = "#634708";
    const teeth = 72;
    for (let i = 0; i < teeth; i++) {
      const angle = (i * 2 * Math.PI) / teeth;
      const tx = center + Math.cos(angle) * (radius - 5 * scale);
      const ty = center + Math.sin(angle) * (radius - 5 * scale);
      ctx.beginPath();
      ctx.arc(tx, ty, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner gold concentric security borders
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(center, center, radius - 12 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#634708";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(center, center, radius - 16 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Arced Text along circular path (Top)
    ctx.save();
    ctx.translate(center, center);
    const topText = "★ OFFICIAL VERIFICATION SEAL ★";
    const textRadius = radius - 28 * scale;
    ctx.fillStyle = "#1e1604";
    ctx.font = `bold ${11 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const arcStep = (Math.PI * 0.75) / (topText.length - 1);
    const startArc = -Math.PI / 2 - (topText.length / 2) * arcStep;
    for (let i = 0; i < topText.length; i++) {
      const angle = startArc + i * arcStep;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -textRadius);
      ctx.fillText(topText[i]!, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // 3. Center White Plaque for QR
    const qrBoxSize = 130 * scale;
    const qrCenterY = center - 8 * scale;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#835f10";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect(
      center - qrBoxSize / 2,
      qrCenterY - qrBoxSize / 2,
      qrBoxSize,
      qrBoxSize,
      8 * scale,
    );
    ctx.fill();
    ctx.stroke();

    // Draw QR Code
    const innerQr = 114 * scale;
    ctx.drawImage(qrImage, center - innerQr / 2, qrCenterY - innerQr / 2, innerQr, innerQr);

    // 4. Code & Tagline below QR
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#5a410b";
    ctx.lineWidth = 2 * scale;
    const codeBoxY = qrCenterY + qrBoxSize / 2 + 10 * scale;
    ctx.beginPath();
    ctx.roundRect(center - 76 * scale, codeBoxY, 152 * scale, 24 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = `bold ${10.5 * scale}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(codeString, center, codeBoxY + 16 * scale);

    // 5. Lower arc text
    ctx.save();
    ctx.translate(center, center);
    const bottomText = "• SCAN TO VERIFY GENUINE PRODUCT •";
    const bTextRadius = radius - 26 * scale;
    ctx.fillStyle = "#1e1604";
    ctx.font = `bold ${9.5 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const bArcStep = (Math.PI * 0.7) / (bottomText.length - 1);
    const bStartArc = Math.PI / 2 + (bottomText.length / 2) * bArcStep;
    for (let i = 0; i < bottomText.length; i++) {
      const angle = bStartArc - i * bArcStep;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, bTextRadius);
      ctx.rotate(Math.PI);
      ctx.fillText(bottomText[i]!, 0, 0);
      ctx.restore();
    }
    ctx.restore();

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
    style,
  } = options;

  const verifyUrl = getVerificationUrl(codeString);
  const qrDataUrl = await generateQrDataUrl(verifyUrl, {
    width: 320,
    margin: 1,
    darkColor: "#111111",
    lightColor: "#ffffff",
  });

  const uid = `tag-${codeString.replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 7)}`;

  if (style === "rectangle") {
    // 280 x 380 standard packaging sticker aspect ratio
    const w = 280;
    const h = 380;
    const centerX = w / 2;
    const centerY = h * 0.4;
    const maxR = 400;

    let raysSvg = "";
    const numRays = 36;
    for (let i = 0; i < numRays; i++) {
      const a1 = (i * 2 * Math.PI) / numRays;
      const a2 = ((i + 0.5) * 2 * Math.PI) / numRays;
      const x1 = centerX + Math.cos(a1) * maxR;
      const y1 = centerY + Math.sin(a1) * maxR;
      const x2 = centerX + Math.cos(a2) * maxR;
      const y2 = centerY + Math.sin(a2) * maxR;
      const fill = i % 2 === 0 ? "rgba(255, 255, 255, 0.28)" : "rgba(180, 130, 20, 0.18)";
      raysSvg += `      <polygon points="${centerX},${centerY} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${fill}" />\n`;
    }

    const safeBrand = escapeXml(brandName);
    const safeProduct = escapeXml(productName);
    const safeCode = escapeXml(codeString);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="bg-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8c352" />
      <stop offset="25%" stop-color="#fff2a8" />
      <stop offset="50%" stop-color="#d4a737" />
      <stop offset="75%" stop-color="#fff8cb" />
      <stop offset="100%" stop-color="#c19225" />
    </linearGradient>
    <clipPath id="rect-clip-${uid}">
      <rect x="0" y="0" width="${w}" height="${h}" rx="16" ry="16" />
    </clipPath>
  </defs>

  <!-- Tag Body -->
  <g clip-path="url(#rect-clip-${uid})">
    <!-- 1. Holographic Gold Gradient Background -->
    <rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg-grad-${uid})" />

    <!-- Sunburst ray burst -->
    <g>
${raysSvg}    </g>

    <!-- Metallic fine guilloche border -->
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="14" ry="14" fill="none" stroke="#8b6a18" stroke-width="2" />
    <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="11" ry="11" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1" />

    <!-- 2. Brand Header -->
    <rect x="${w / 2 - 18}" y="24" width="36" height="24" rx="4" fill="#1e3a1e" />
    <text x="${w / 2}" y="41" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle">AS</text>

    <!-- Brand Name (Georgia italic) -->
    <text x="${w / 2}" y="68" fill="#1a1a1a" font-family="Georgia, serif" font-style="italic" font-weight="bold" font-size="16" text-anchor="middle">${safeBrand}</text>
    <text x="${w / 2 + safeBrand.length * 4.5 + 8}" y="60" fill="#1a1a1a" font-size="8" font-weight="bold">®</text>

    ${safeProduct ? `<text x="${w / 2}" y="84" fill="#3f3f46" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1">${safeProduct.toUpperCase()}</text>` : ""}

    <!-- 3. High-Contrast QR Code Plaque -->
    <rect x="68" y="90" width="144" height="144" rx="8" fill="#ffffff" stroke="#caa33a" stroke-width="3" />
    <image href="${qrDataUrl}" x="72" y="94" width="136" height="136" />

    <!-- Verification URL -->
    <text x="${w / 2}" y="250" fill="#222222" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" text-anchor="middle">asemi.io/verify</text>

    <!-- 4. Verification code panel — printed openly -->
    <rect x="20" y="260" width="240" height="46" rx="4" fill="#ffffff" stroke="#3f3f46" stroke-width="1" />
    <text x="${w / 2}" y="276" fill="#52525b" font-size="9" font-weight="bold" text-anchor="middle">SCAN TO VERIFY AUTHENTICITY</text>

    <text x="${w / 2}" y="296" fill="#0f172a" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" text-anchor="middle">${safeCode}</text>

    <!-- 5. Anti-Counterfeit Notice -->
    <text x="${w / 2}" y="336" fill="#111827" font-size="11" font-weight="bold" text-anchor="middle">Beware of counterfeits</text>
    <text x="${w / 2}" y="352" fill="#4b5563" font-size="8.5" font-weight="500" text-anchor="middle">Genuine Authentic Seal • Scan to Verify</text>
  </g>
</svg>`;
  } else {
    // Circular Tamper-Evident Badge (360 x 360)
    const size = 360;
    const center = size / 2;
    const radius = size / 2 - 6;

    let teethSvg = "";
    const teeth = 72;
    for (let i = 0; i < teeth; i++) {
      const angle = (i * 2 * Math.PI) / teeth;
      const tx = center + Math.cos(angle) * (radius - 5);
      const ty = center + Math.sin(angle) * (radius - 5);
      teethSvg += `      <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="3" fill="#634708" />\n`;
    }

    const safeCode = escapeXml(codeString);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}mm" height="${size}mm" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <radialGradient id="circ-bg-${uid}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#fff5be" />
      <stop offset="40%" stop-color="#e0b53c" />
      <stop offset="80%" stop-color="#b98c21" />
      <stop offset="100%" stop-color="#835f10" />
    </radialGradient>
    <clipPath id="circ-clip-${uid}">
      <circle cx="${center}" cy="${center}" r="${radius}" />
    </clipPath>
    <path id="top-arc-${uid}" d="M 46 180 A 134 134 0 0 1 314 180" fill="none" />
    <path id="bottom-arc-${uid}" d="M 314 180 A 134 134 0 0 1 46 180" fill="none" />
  </defs>

  <g clip-path="url(#circ-clip-${uid})">
    <!-- Medallion radial gold body -->
    <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#circ-bg-${uid})" />

    <!-- 72 Serrated Security Teeth on perimeter -->
    <g>
${teethSvg}    </g>

    <!-- Inner Concentric Rings -->
    <circle cx="${center}" cy="${center}" r="${radius - 12}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,3" />
    <circle cx="${center}" cy="${center}" r="${radius - 16}" fill="none" stroke="#634708" stroke-width="2" />

    <!-- Upper Arced Typography -->
    <text fill="#1e1604" font-size="11" font-weight="bold" letter-spacing="2">
      <textPath href="#top-arc-${uid}" startOffset="50%" text-anchor="middle">★ OFFICIAL VERIFICATION SEAL ★</textPath>
    </text>

    <!-- Center QR Plaque -->
    <rect x="${center - 65}" y="${center - 73}" width="130" height="130" rx="8" fill="#ffffff" stroke="#835f10" stroke-width="3" />
    <image href="${qrDataUrl}" x="${center - 57}" y="${center - 65}" width="114" height="114" />

    <!-- Serial plaque -->
    <rect x="${center - 76}" y="${center + 66}" width="152" height="24" rx="4" fill="#ffffff" stroke="#5a410b" stroke-width="1.5" />
    <text x="${center}" y="${center + 82}" fill="#111827" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="bold" text-anchor="middle">${safeCode}</text>

    <!-- Lower Arced Typography -->
    <text fill="#1e1604" font-size="9.5" font-weight="bold" letter-spacing="1.5">
      <textPath href="#bottom-arc-${uid}" startOffset="50%" text-anchor="middle">• SCAN TO VERIFY GENUINE PRODUCT •</textPath>
    </text>
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
