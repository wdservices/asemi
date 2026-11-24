import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useSession } from "@/lib/auth";

export function BlogLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#2b2b32] font-sans flex flex-col selection:bg-[#c9a84c] selection:text-white">
      {/* Three-zone single-line header matching Asemi's public editorial look */}
      <header className="sticky top-0 z-40 border-b border-[#e2ded5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-3.5">
          {/* Zone 1: Brand wordmark */}
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap font-bold text-[#1a1a1e]"
          >
            <img
              src="/asemi_logo.png"
              alt="Asemi logo"
              className="size-8 shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200"
            />
            <span className="text-lg tracking-tight">Asemi</span>
          </Link>

          {/* Zone 2: Concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52525b]"
          >
            <Link
              to="/"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1a1a1e] hover:underline underline-offset-4"
            >
              Home
            </Link>
            <Link
              to="/blog"
              className="whitespace-nowrap shrink-0 font-semibold text-[#1a1a1e] underline underline-offset-4"
            >
              Blog
            </Link>
            <Link
              to="/faq"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1a1a1e] hover:underline underline-offset-4"
            >
              FAQ
            </Link>
            <Link
              to="/docs"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1a1a1e] hover:underline underline-offset-4"
            >
              Docs
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-semibold text-[#8f7530] transition-colors hover:text-[#1a1a1e]"
            >
              <QrCode className="size-3.5" />
              <span>Verify Product</span>
            </Link>
          </nav>

          {/* Zone 3: Single primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/verify"
              className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-[#8f7530] whitespace-nowrap shrink-0"
            >
              <QrCode className="size-3.5" />
              <span>Verify</span>
            </Link>
            <Link
              to={session ? "/dashboard" : "/auth"}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-blue-700"
            >
              {session ? "Brand Console" : "Get 20 Free Codes"}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[#e2ded5] bg-white px-6 py-10 text-xs text-[#6e6e7a]">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img
              src="/asemi_logo.png"
              alt="Asemi logo"
              className="size-6 rounded-md bg-white object-contain ring-1 ring-slate-200"
            />
            <span className="font-semibold text-[#1a1a1e]">Asemi Product Authentication</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              Home
            </Link>
            <Link to="/blog" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              Blog
            </Link>
            <Link to="/verify" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              Consumer Scanner
            </Link>
            <Link to="/faq" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              FAQ
            </Link>
            <Link to="/docs" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              User guide
            </Link>
            <Link to="/terms" className="hover:text-[#1a1a1e] hover:underline underline-offset-4">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
