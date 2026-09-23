import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsAdmin, useSession } from "@/lib/auth";
import { MarketingSite } from "./asemi/MarketingSite";
import { AuthModal } from "./asemi/AuthModal";

export function AsemiApp() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: isAdmin } = useIsAdmin();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("register");

  const enterConsole = () => {
    if (!session) {
      setAuthModalMode("login");
      setAuthModalOpen(true);
      return;
    }
    navigate({ to: isAdmin ? "/admin" : "/dashboard" });
  };

  return (
    <div className="asemi-app-root bg-[#fafaf8] text-[#2b2b32] font-sans min-h-screen relative selection:bg-[#c9a84c] selection:text-white">
      {/* Grain texture overlay matching prototype */}
      <svg id="grain" width="100%" height="100%" aria-hidden="true">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      <MarketingSite
        onOpenRegisterModal={() => {
          setAuthModalMode("register");
          setAuthModalOpen(true);
        }}
        onOpenLoginModal={() => {
          setAuthModalMode("login");
          setAuthModalOpen(true);
        }}
        onOpenVerifier={() => {
          navigate({ to: "/verify" });
        }}
        onEnterDashboard={enterConsole}
      />

      {/* Authentication / Onboarding Modal */}
      <AuthModal
        mode={authModalMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(role) => {
          setAuthModalOpen(false);
          navigate({ to: role === "ADMIN" ? "/admin" : "/dashboard" });
        }}
      />
    </div>
  );
}

export default AsemiApp;
