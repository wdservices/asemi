/**
 * Serve a static build the way cPanel/Apache does with our .htaccess:
 * real files win, everything else falls back to index.html.
 *
 *   node scripts/serve-deploy.mjs [dir] [port]
 *
 * Defaults: deploy-dist on 4174.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || "deploy-dist");
const PORT = Number(process.argv[3] || process.env.PORT || 4174);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

async function tryFile(file) {
  try {
    const info = await stat(file);
    if (!info.isFile()) return null;
    return { file, info };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);

  const direct = await tryFile(path.join(ROOT, pathname));
  if (direct) {
    res.writeHead(200, {
      "content-type": MIME[path.extname(direct.file).toLowerCase()] || "application/octet-stream",
      "content-length": direct.info.size,
    });
    res.end(await readFile(direct.file));
    return;
  }

  // Directory index (Apache does this before the rewrite).
  if (!pathname.endsWith("/")) {
    const indexed = await tryFile(path.join(ROOT, pathname, "index.html"));
    if (indexed) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(await readFile(indexed.file));
      return;
    }
  }

  // SPA fallback.
  const shell = await tryFile(path.join(ROOT, "index.html"));
  if (!shell) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("index.html not found");
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(await readFile(shell.file));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving ${ROOT} on http://127.0.0.1:${PORT}/ (SPA fallback)`);
});
