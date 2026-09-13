import React, { useState, useEffect, useRef } from "react";
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

  // Custom cursor refs for luxury feel from prototype
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Subscribe to store updates
  useEffect(() => {
    return asemiStore.subscribe(() => {
      setStoreState({ ...asemiStore.getState() });
    });
  }, []);

  // Cursor following logic from prototype
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }
      if (ringRef.current) {
        ringRef.current.style.left = `${e.clientX}px`;
        ringRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
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
      {/* Global CSS variables & subtle styling matching authoritative reference */}
      <style>{`
        .asemi-app-root {
          --gold: #c9a84c;
          --gold-deep: #b8962e;
          --charcoal: #1a1a1e;
          --linen: #f5f0e8;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #cursor-dot {
          position: fixed;
          width: 5px;
          height: 5px;
          background: #1a1a1e;
          border-radius: 50%;
          pointer-events: none;
          z-index: 99999;
          transform: translate(-50%, -50%);
        }
        #cursor-ring {
          position: fixed;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(26,26,30,0.25);
          pointer-events: none;
          z-index: 99999;
          transform: translate(-50%, -50%);
          transition: width 0.15s ease, height 0.15s ease;
        }
        @media (hover: none) {
          #cursor-dot, #cursor-ring { display: none; }
        }
      `}</style>

      {/* Luxury cursor */}
      <div ref={dotRef} id="cursor-dot" />
      <div ref={ringRef} id="cursor-ring" />

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
      ) : storeState.currentUserRole === "ADMIN" ? (
        <AdminDashboard />
      ) : inDashboard ? (
        <CompanyDashboard
          company={activeCompany}
          onOpenVerifierWithCode={(code) => {
            setVerifierInitialCode(code);
            setIsVerifierOpen(true);
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
