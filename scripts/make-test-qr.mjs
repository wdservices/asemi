/**
 * Render printable QR images for the seeded TEST codes.
 * Encodes the deployed hosting URL so the codes keep working after `firebase deploy`.
 *
 *   node scripts/make-test-qr.mjs
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const HOST = process.env.ASEMI_HOST || "https://asemi-c14ac.web.app";
const seed = JSON.parse(await readFile("test-artifacts/test-codes.json", "utf8"));

await mkdir("test-artifacts/qr", { recursive: true });

const rows = [];
for (const c of seed.codes) {
  const url = `${HOST}/v/${encodeURIComponent(c.codeString)}`;
  const file = `test-artifacts/qr/${c.codeString}.png`;
  await QRCode.toFile(file, url, { width: 720, margin: 2, errorCorrectionLevel: "H" });
  rows.push({ ...c, url, file });
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Asemi test codes — ${seed.batchNumber}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { color: #64748b; margin: 0 0 24px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 4px 14px rgba(15,23,42,.05); }
  .card img { width: 100%; max-width: 220px; aspect-ratio: 1; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; letter-spacing: .06em; margin-top: 10px; }
  .url { font-size: 10px; color: #64748b; word-break: break-all; margin-top: 6px; }
  .meta { font-size: 12px; color: #475569; margin-top: 4px; }
</style>
</head>
<body>
  <h1>${seed.productName} — ${seed.batchNumber}</h1>
  <p>${seed.companyName} · 5 test codes · scans open ${HOST}/v/&lt;code&gt;</p>
  <div class="grid">
    ${rows
      .map(
        (r) => `<div class="card">
      <img src="qr/${r.codeString}.png" alt="QR ${r.codeString}" />
      <div class="code">${r.codeString}</div>
      <div class="meta">${seed.productName}</div>
      <div class="url">${r.url}</div>
    </div>`,
      )
      .join("\n    ")}
  </div>
</body>
</html>`;

await writeFile("test-artifacts/test-codes.html", html);
console.log(JSON.stringify({ host: HOST, codes: rows }, null, 2));
