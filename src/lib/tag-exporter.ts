import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { renderTagToCanvas, generateTagSvg, downloadDataUrl } from "@/lib/qr";

export interface BatchExportOptions {
  batchNumber: string;
  productName: string;
  brandName?: string;
  codes: string[];
  style: "rectangle" | "circle";
  pageSize?: "a4" | "letter";
  onProgress?: (current: number, total: number) => void;
}

/**
 * Downloads a high-resolution PDF print sheet (300+ DPI equivalent)
 * formatted specifically for professional adhesive sticker die-cut printing,
 * accurately preserving the 'Circular Tag' or 'Rectangular Label' layout.
 */
export async function downloadBatchPdf(options: BatchExportOptions): Promise<void> {
  const {
    batchNumber,
    productName,
    brandName = "Asemi",
    codes,
    style,
    pageSize = "a4",
    onProgress,
  } = options;

  if (!codes.length) {
    throw new Error("No codes provided for PDF export");
  }

  // Create jsPDF instance (dimensions in millimeters)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm for A4
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm for A4

  // Max codes to process in a single batch PDF (up to 120 codes)
  const maxExportCodes = codes.slice(0, 120);

  // Layout parameters based on selected design
  const isCircle = style === "circle";

  // Grid configuration:
  // Rectangle: 3 cols x 3 rows = 9 tags/page (48mm x 65mm each)
  // Circle: 3 cols x 4 rows = 12 tags/page (46mm x 46mm each)
  const cols = 3;
  const rows = isCircle ? 4 : 3;
  const tagsPerPage = cols * rows;
  const totalPages = Math.ceil(maxExportCodes.length / tagsPerPage);

  const tagWidth = isCircle ? 46 : 48;
  const tagHeight = isCircle ? 46 : 65;

  const totalGridWidth = cols * tagWidth;
  const totalGridHeight = rows * tagHeight;

  // Center the grid horizontally and vertically below the header
  const headerHeight = 28;
  const footerHeight = 16;
  const availableHeight = pageHeight - headerHeight - footerHeight;

  const spacingX = Math.max(6, (pageWidth - 24 - totalGridWidth) / (cols - 1));
  const spacingY = Math.max(6, (availableHeight - totalGridHeight) / (rows - 1));

  const startX = (pageWidth - (cols * tagWidth + (cols - 1) * (spacingX - tagWidth))) / 2;
  const startY = headerHeight + 6;

  // Helper to draw the header on each page
  const drawPageHeader = (pageNumber: number) => {
    // Header background bar
    doc.setFillColor(248, 246, 240);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Gold accent top bar
    doc.setFillColor(202, 163, 58);
    doc.rect(0, 0, pageWidth, 2.5, "F");

    // Title and Batch info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(`Asemi Security Verification Tags — Batch ${batchNumber}`, 14, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(
      `Product: ${productName}   |   Brand: ${brandName}   |   Design: ${isCircle ? "Circular Tamper-Evident Badge (46mm Ø)" : "Holographic Rectangular Seal (48×65mm)"}`,
      14,
      16,
    );
    doc.text(
      `Date: ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}   |   Print Resolution: High-Res 300+ DPI Vector Plate   |   Verification: asemi.io/verify`,
      14,
      21,
    );

    // Page indicator
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(161, 131, 42);
    doc.text(`Sheet ${pageNumber} of ${totalPages}`, pageWidth - 14, 10, { align: "right" });

    // Header divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Asemi Anti-Counterfeiting Ledger Protocol   •   Professional Adhesive Sticker Sheet   •   Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );

    // Footer divider line
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);
  };

  // Helper to draw crop marks (crosshair / registration ticks) around a tag
  const drawCropMarks = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(180, 150, 60);
    doc.setLineWidth(0.2);
    const tick = 2.5;
    const offset = 1.2;

    // Top-left
    doc.line(x - offset - tick, y, x - offset, y);
    doc.line(x, y - offset - tick, x, y - offset);

    // Top-right
    doc.line(x + w + offset, y, x + w + offset + tick, y);
    doc.line(x + w, y - offset - tick, x + w, y - offset);

    // Bottom-left
    doc.line(x - offset - tick, y + h, x - offset, y + h);
    doc.line(x, y + h + offset, x, y + h + offset + tick);

    // Bottom-right
    doc.line(x + w + offset, y + h, x + w + offset + tick, y + h);
    doc.line(x + w, y + h + offset, x + w, y + h + offset + tick);

    // If circular, draw faint circular die-line guide
    if (isCircle) {
      doc.setDrawColor(220, 185, 90);
      doc.setLineWidth(0.15);
      doc.circle(x + w / 2, y + h / 2, w / 2, "S");
    } else {
      // Faint rounded rectangle die-line
      doc.setDrawColor(220, 185, 90);
      doc.setLineWidth(0.15);
      doc.roundedRect(x, y, w, h, 2, 2, "S");
    }
  };

  // Process all codes page by page
  let currentCodeIdx = 0;
  for (let page = 1; page <= totalPages; page++) {
    if (page > 1) {
      doc.addPage(pageSize, "portrait");
    }
    drawPageHeader(page);

    const pageCodes = maxExportCodes.slice(
      (page - 1) * tagsPerPage,
      Math.min(page * tagsPerPage, maxExportCodes.length),
    );

    for (let i = 0; i < pageCodes.length; i++) {
      const code = pageCodes[i]!;
      const colIdx = i % cols;
      const rowIdx = Math.floor(i / cols);

      const x = startX + colIdx * spacingX;
      const y = startY + rowIdx * spacingY;

      // Render high-res 300+ DPI tag canvas (scale 3)
      const dataUrl = await renderTagToCanvas({
        codeString: code,
        productName,
        brandName,
        batchNumber,
        style,
        scale: 3, // 300+ DPI crispness
      });

      // Draw registration crop marks and die-lines
      drawCropMarks(x, y, tagWidth, tagHeight);

      // Embed high-res image into PDF
      doc.addImage(dataUrl, "PNG", x, y, tagWidth, tagHeight, undefined, "FAST");

      currentCodeIdx++;
      onProgress?.(currentCodeIdx, maxExportCodes.length);
    }
  }

  // Save the generated PDF document
  doc.save(`asemi-batch-${batchNumber}-${style}-print-sheet.pdf`);
}

/**
 * Downloads a high-resolution Vector SVG package (ZIP archive containing
 * individual vector .svg files for each tag and a master sheet)
 * preserving the exact 'Circular Tag' or 'Rectangular Label' design for Adobe Illustrator,
 * CorelDRAW, or industrial laser/die plotters.
 */
export async function downloadBatchSvg(options: BatchExportOptions): Promise<void> {
  const { batchNumber, productName, brandName = "Asemi", codes, style, onProgress } = options;

  if (!codes.length) {
    throw new Error("No codes provided for SVG export");
  }

  const zip = new JSZip();
  const folder = zip.folder(`asemi-batch-${batchNumber}-${style}-svg-vectors`);

  const maxExportCodes = codes.slice(0, 150);

  // 1. Generate individual vector SVGs for each tag
  for (let i = 0; i < maxExportCodes.length; i++) {
    const code = maxExportCodes[i]!;
    const svgString = await generateTagSvg({
      codeString: code,
      productName,
      brandName,
      batchNumber,
      style,
    });

    folder?.file(`${code}-${style}.svg`, svgString);
    onProgress?.(i + 1, maxExportCodes.length);
  }

  // 2. Generate a combined Master Vector Sheet SVG (tiled layout for professional plotter)
  const isCircle = style === "circle";
  const cols = 3;
  const tagW = isCircle ? 360 : 280;
  const tagH = isCircle ? 360 : 380;
  const gap = 30;
  const sheetRows = Math.ceil(maxExportCodes.length / cols);
  const sheetW = cols * tagW + (cols + 1) * gap;
  const sheetH = sheetRows * tagH + (sheetRows + 1) * gap + 120; // top header offset

  let masterSheetTags = "";
  for (let i = 0; i < maxExportCodes.length; i++) {
    const code = maxExportCodes[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const posX = gap + col * (tagW + gap);
    const posY = 100 + gap + row * (tagH + gap);

    const singleSvg = await generateTagSvg({
      codeString: code,
      productName,
      brandName,
      batchNumber,
      style,
    });

    // Strip <?xml ...?> and root <svg> tags to nest inside sheet
    const innerContent = singleSvg
      .replace(/<\?xml[^>]*\?>/g, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "");

    masterSheetTags += `
    <g transform="translate(${posX}, ${posY})">
      <!-- Cut Line Die Layer -->
      ${
        isCircle
          ? `<circle cx="${tagW / 2}" cy="${tagH / 2}" r="${tagW / 2 - 6}" fill="none" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="8,4" />`
          : `<rect x="0" y="0" width="${tagW}" height="${tagH}" rx="16" ry="16" fill="none" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="8,4" />`
      }
      ${innerContent}
    </g>`;
  }

  const masterSheetSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}px" height="${sheetH}px" style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Print House Header & Plotter Calibration -->
  <rect x="0" y="0" width="${sheetW}" height="90" fill="#18181b" />
  <text x="30" y="40" fill="#f4f4f5" font-size="24" font-weight="bold">Asemi Security Tags — Master Vector Sheet (Batch ${batchNumber})</text>
  <text x="30" y="70" fill="#a1a1aa" font-size="14">Product: ${productName}   |   Format: ${isCircle ? "Circular Tag (30mm Ø)" : "Rectangular Label (50×25mm)"}   |   Total: ${maxExportCodes.length} Tags   |   Red Dashed Line: Die-Cut Layer</text>

  <!-- Tags Grid -->
  ${masterSheetTags}
</svg>`;

  folder?.file(`master-sheet-${batchNumber}-${style}.svg`, masterSheetSvg);

  // 3. Add Professional Print Specification README
  const printSpecs = `===================================================================
ASEMI PROFESSIONAL SECURITY PRINT SPECIFICATIONS & DIE-CUT GUIDE
===================================================================
Batch ID: ${batchNumber}
Product: ${productName}
Brand: ${brandName}
Design Style: ${isCircle ? "Circular Tamper-Evident Badge (30mm Medallion)" : "Holographic Rectangular Seal (50x25mm Packaging Sticker)"}
Tag Volume: ${maxExportCodes.length} units
Generation Timestamp: ${new Date().toISOString()}

FILE CONTENTS:
- Individual .svg files: Precision vector files for each code string.
- master-sheet-${batchNumber}-${style}.svg: Tiled press layout ready for large-format plotters and digital label presses.

PRINTING INSTRUCTIONS:
1. Colors: CMYK + Metallic Spot Gold simulation or cold-foil holographic backing.
2. Die-Cut Layer: Denoted by stroke="#e11d48" (Red Dashed Line). Ensure cutter blade aligns with this boundary.
3. Substrate:
   - For Rectangular: Silver or gold holographic tamper-evident polyester adhesive film (verification code printed openly below the QR).
   - For Circular: Destructible vinyl / tamper-evident security decal stock.
4. Resolution: 100% Vector (Infinite scalability without pixelation).
5. Dynamic Verification Gateway: https://asemi.io/verify

(C) Asemi Security Identification Protocol.
`;
  folder?.file("PRINT-SPECIFICATIONS.txt", printSpecs);

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  downloadDataUrl(url, `asemi-batch-${batchNumber}-${style}-vector-svg.zip`);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a ZIP file containing rendered high-resolution PNG tags for the given codes.
 */
export async function downloadTagsZip(options: BatchExportOptions): Promise<void> {
  const { batchNumber, productName, brandName = "Asemi", codes, style, onProgress } = options;
  const zip = new JSZip();
  const folder = zip.folder(`asemi-${batchNumber}-${style}-tags`);

  const total = codes.length;
  // Limit max images in memory per batch if large (export up to 200 high-res tags per zip)
  const exportCodes = codes.slice(0, 200);

  for (let i = 0; i < exportCodes.length; i++) {
    const code = exportCodes[i]!;
    const dataUrl = await renderTagToCanvas({
      codeString: code,
      productName,
      brandName,
      batchNumber,
      style,
      scale: 3, // 300+ DPI
    });

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    folder?.file(`${code}-${style}.png`, base64Data, { base64: true });
    onProgress?.(i + 1, exportCodes.length);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  downloadDataUrl(url, `asemi-${batchNumber}-${style}-tags.zip`);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single code's high-resolution PDF proof.
 */
export async function downloadSingleTagPdf(options: {
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  style: "rectangle" | "circle";
}): Promise<void> {
  const {
    codeString,
    productName = "Product Authentication",
    brandName = "Asemi",
    batchNumber = "SINGLE",
    style,
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a6", // Compact label proof sheet
  });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(248, 246, 240);
  doc.rect(0, 0, pw, 18, "F");
  doc.setFillColor(202, 163, 58);
  doc.rect(0, 0, pw, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(`Asemi Security Tag Proof — ${codeString}`, 8, 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(`Design: ${style === "circle" ? "Circular Tag (30mm Ø)" : "Rectangular Label (50×25mm)"}`, 8, 14);

  // Render high-res tag image
  const dataUrl = await renderTagToCanvas({
    codeString,
    productName,
    brandName,
    batchNumber,
    style,
    scale: 3,
  });

  const tagW = style === "circle" ? 64 : 64;
  const tagH = style === "circle" ? 64 : 86;
  const x = (pw - tagW) / 2;
  const y = (ph - tagH) / 2 + 4;

  // Crop marks & die lines
  doc.setDrawColor(180, 150, 60);
  doc.setLineWidth(0.2);
  const tick = 3;
  doc.line(x - tick, y, x, y);
  doc.line(x, y - tick, x, y);
  doc.line(x + tagW, y, x + tagW + tick, y);
  doc.line(x + tagW, y - tick, x + tagW, y);
  doc.line(x - tick, y + tagH, x, y + tagH);
  doc.line(x, y + tagH, x, y + tagH + tick);
  doc.line(x + tagW, y + tagH, x + tagW + tick, y + tagH);
  doc.line(x + tagW, y + tagH, x + tagW, y + tagH + tick);

  doc.addImage(dataUrl, "PNG", x, y, tagW, tagH);

  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text("Scan to verify genuine product   •   asemi.io/verify", pw / 2, ph - 6, {
    align: "center",
  });

  doc.save(`asemi-tag-proof-${codeString}-${style}.pdf`);
}

/**
 * Opens a print-ready window with neatly arranged tags formatted for adhesive label sheets.
 */
export async function printTagSheet(options: {
  batchNumber: string;
  productName: string;
  brandName?: string;
  codes: string[];
  style: "rectangle" | "circle";
}): Promise<void> {
  const { batchNumber, productName, brandName = "Asemi", codes, style } = options;
  const printCodes = codes.slice(0, 48); // 1-2 standard sticker sheet pages

  // Render all tags to data URLs
  const tagImages: string[] = [];
  for (const c of printCodes) {
    const imgUrl = await renderTagToCanvas({
      codeString: c,
      productName,
      brandName,
      batchNumber,
      style,
      scale: 2,
    });
    tagImages.push(imgUrl);
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Pop-up window blocked. Please allow popups to print tag sheets.");
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Asemi Security Tags — Batch ${batchNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 10px;
      color: #111;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 16px;
      margin: 0;
    }
    .header p {
      font-size: 11px;
      color: #6b7280;
      margin: 2px 0 0 0;
    }
    .tag-grid {
      display: grid;
      grid-template-columns: repeat(${style === "rectangle" ? 3 : 3}, 1fr);
      gap: 12px;
    }
    .tag-cell {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4px;
      page-break-inside: avoid;
    }
    .tag-cell img {
      max-width: 100%;
      height: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: ${style === "circle" ? "50%" : "8px"};
    }
    @media print {
      .header button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Asemi Security Tags — Batch ${batchNumber} (${style === "rectangle" ? "Holographic Rectangular Seal" : "Circular Tamper-Evident Badge"})</h1>
      <p>Product: ${productName} · Total: ${tagImages.length} tags · Ready for adhesive label die-cut printing</p>
    </div>
    <button onclick="window.print()" style="padding: 6px 16px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
      Print Sheet
    </button>
  </div>
  <div class="tag-grid">
    ${tagImages
      .map(
        (src) => `
      <div class="tag-cell">
        <img src="${src}" alt="Security Tag" />
      </div>
    `,
      )
      .join("")}
  </div>
  <script>
    window.onload = function() {
      // small delay to let images paint
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
