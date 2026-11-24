/**
 * Build the static deployment bundle.
 *
 * The app normally builds as a Node SSR server (vite.config.ts). For static
 * hosting (cPanel + .htaccess) we need real HTML files. TanStack's own
 * prerenderer hangs on the node-server preset, so instead:
 *
 *   1. build the Node server bundle (this also emits the client assets),
 *   2. boot it on a throwaway port,
 *   3. request the public routes and save the rendered HTML,
 *   4. shut it down.
 *
 * Dynamic routes (/v/<code>, /batches, /admin/*) are intentionally NOT
 * prerendered - .htaccess serves index.html and the client router resolves
 * them at runtime.
 *
 *   npm run build:deploy
 */
import { spawn, execSync } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".output");
const PUBLIC = path.join(OUT, "public");
const PORT = process.env.DEPLOY_PORT || "4173";
const BASE = `http://127.0.0.1:${PORT}`;

const STATIC_ROUTES = ["/", "/verify", "/faq", "/docs", "/terms", "/blog"];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// ---------------------------------------------------------------------------
// 1. Build (node-server preset, which is known to work here)
// ---------------------------------------------------------------------------
log("› Building client + server bundles…");
execSync("npx vite build", { cwd: ROOT, stdio: "inherit" });

// ---------------------------------------------------------------------------
// 2. Boot the SSR server so it can render HTML for us
// ---------------------------------------------------------------------------
log("› Starting server for prerender…");
const server = spawn(process.execPath, [path.join(OUT, "server", "index.mjs")], {
  cwd: ROOT,
  env: { ...process.env, PORT, HOST: "127.0.0.1", NITRO_PORT: PORT, NITRO_HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => process.stdout.write(d));
server.stderr.on("data", (d) => process.stderr.write(d));

async function waitForServer(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Server did not start within 30s");
}

function outputPathFor(route) {
  if (route === "/") return path.join(PUBLIC, "index.html");
  return path.join(PUBLIC, route.replace(/^\//, ""), "index.html");
}

async function render(route) {
  const res = await fetch(`${BASE}${route}`, {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
  if (!res.ok) {
    log(`  · skip ${route} (${res.status})`);
    return null;
  }
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) {
    log(`  · skip ${route} (${type})`);
    return null;
  }
  const html = await res.text();
  const file = outputPathFor(route);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
  log(`  ✓ ${route} → ${path.relative(ROOT, file)} (${(html.length / 1024).toFixed(1)} KB)`);
  return html;
}

try {
  await waitForServer();

  for (const route of STATIC_ROUTES) {
    await render(route);
  }

  // Discover blog posts from the rendered index and prerender each one.
  const blogIndex = await readFile(path.join(PUBLIC, "blog", "index.html"), "utf8").catch(() => "");
  const slugs = [
    ...new Set(
      [...blogIndex.matchAll(/href="(\/blog\/[^"#?]+)"/g)]
        .map((m) => m[1])
        .filter((href) => href && href !== "/blog" && href !== "/blog/"),
    ),
  ];
  if (slugs.length) {
    log(`› Prerendering ${slugs.length} blog posts…`);
    for (const slug of slugs) await render(slug);
  }

  // The legacy static landing page is not part of the deploy bundle.
  await rm(path.join(PUBLIC, "legacy-index.html"), { force: true });

  log("✓ Static HTML generated in .output/public");
} finally {
  server.kill();
}
