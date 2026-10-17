// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // NOTE: prerender is disabled for the Node-server (cPanel subdomain) build.
    // The node-server preset's preview shim is incompatible with the prerender
    // crawler (`server.fetch is not a function`), so a prerender-enabled build
    // hangs and never exits. SSR still works at runtime — pages render on demand.
    // When you go back to Cloudflare for the real domain, re-enable:
    //   prerender: { enabled: true, crawlLinks: true },
    //   pages: [{ path: "/" ... }, { path: "/auth" ... }, { path: "/verify" ... }]
    prerender: {
      enabled: false,
      crawlLinks: false,
    },
  },
});
