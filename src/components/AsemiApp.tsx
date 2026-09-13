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

  // Smooth custom cursor physics loop & click tactile feedback from prototype
  useEffect(() => {
    let rx = -100;
    let ry = -100;
    let mx = -100;
    let my = -100;
    let animId: number;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = `${mx}px`;
        dotRef.current.style.top = `${my}px`;
        dotRef.current.style.opacity = "1";
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = "1";
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (ringRef.current) {
        ringRef.current.classList.add("cursor-clicking");
      }
      // Create expanding click ripple wave at cursor position
      const ripple = document.createElement("div");
      ripple.className = "cursor-click-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 520);
    };

    const onMouseUp = () => {
      if (ringRef.current) {
        ringRef.current.classList.remove("cursor-clicking");
      }
    };

    // Smooth hover detection for buttons, links and interactive items
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "button, a, input, select, textarea, [role='button'], .btn, .clickable, tr, [data-interactive='true']",
      );
      if (interactive && ringRef.current) {
        ringRef.current.classList.add("cursor-hover");
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "button, a, input, select, textarea, [role='button'], .btn, .clickable, tr, [data-interactive='true']",
      );
      if (interactive && ringRef.current) {
        ringRef.current.classList.remove("cursor-hover");
      }
    };

    // Tactile button click ripple on any button in the app
    const onButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest("button, .btn, [role='button']") as HTMLElement | null;
      if (btn && !btn.hasAttribute("disabled")) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "btn-click-ripple";
        const size = Math.max(rect.width, rect.height) * 1.5;
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left}px`;
        ripple.style.top = `${e.clientY - rect.top}px`;
        btn.appendChild(ripple);
        setTimeout(() => {
          ripple.remove();
        }, 600);
      }
    };

    // Continuous lerp loop from authoritative prototype: rx += (mx-rx)*0.18; ry += (my-ry)*0.18;
    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.left = `${rx}px`;
        ringRef.current.style.top = `${ry}px`;
      }
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseover", onMouseOver, { passive: true });
    window.addEventListener("mouseout", onMouseOut, { passive: true });
    window.addEventListener("click", onButtonClick, { capture: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("click", onButtonClick, { capture: true });
    };
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
