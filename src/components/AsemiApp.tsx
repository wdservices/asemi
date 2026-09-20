import React, { useState, useEffect } from "react";
import { asemiStore, UserRole, Company } from "@/lib/asemiStore";
import { TopRoleBar } from "./asemi/TopRoleBar";
import { MarketingSite } from "./asemi/MarketingSite";
import { CompanyDashboard } from "./asemi/CompanyDashboard";
import { AdminDashboard } from "./asemi/AdminDashboard";
import { ConsumerVerification } from "./asemi/ConsumerVerification";
import { AuthModal } from "./asemi/AuthModal";

export function AsemiApp() {
  const [storeState, setStoreState] = useState(asemiStore.getState());
  const [isVerifierOpen, setIsVerifierOpen] = useState(false);
  const [verifierInitialCode, setVerifierInitialCode] = useState("ASM-9K4T-7X2P");
  const [inDashboard, setInDashboard] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("register");

  // Subscribe to store updates
  useEffect(() => {
    return asemiStore.subscribe(() => {
      setStoreState({ ...asemiStore.getState() });
    });
  }, []);

  const activeCompany =
    storeState.companies.find((c) => c.id === storeState.activeCompanyId) ||
    storeState.companies[0];

  const handleRoleSelect = (role: UserRole) => {
    asemiStore.setRole(role);
    setIsVerifierOpen(false);
    if (role === "COMPANY_USER") {
      setInDashboard(true);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    asemiStore.setActiveCompany(companyId);
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

      {/* Top Universal Platform Bar */}
      <TopRoleBar
        currentRole={storeState.currentUserRole}
        onSelectRole={handleRoleSelect}
        activeCompany={activeCompany}
        companies={storeState.companies}
        onSelectCompany={handleSelectCompany}
        onOpenVerifier={() => {
          setIsVerifierOpen(true);
        }}
        isVerifierOpen={isVerifierOpen}
      />

      {/* Main View Router */}
      {isVerifierOpen ? (
        <ConsumerVerification
          initialCode={verifierInitialCode}
          onBackToApp={() => setIsVerifierOpen(false)}
        />
      ) : inDashboard && storeState.currentUserRole === "ADMIN" ? (
        <AdminDashboard
          onSignOut={() => {
            asemiStore.setRole("COMPANY_USER");
            setInDashboard(false);
          }}
        />
      ) : inDashboard ? (
        <CompanyDashboard
          company={activeCompany}
          onOpenVerifierWithCode={(code) => {
            setVerifierInitialCode(code);
            setIsVerifierOpen(true);
          }}
          onSignOut={() => {
            setInDashboard(false);
          }}
        />
      ) : (
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
            setIsVerifierOpen(true);
          }}
          onEnterDashboard={() => {
            setInDashboard(true);
          }}
        />
      )}

      {/* Authentication / Onboarding Modal */}
      <AuthModal
        mode={authModalMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setInDashboard(true);
        }}
      />
    </div>
  );
}

export default AsemiApp;
