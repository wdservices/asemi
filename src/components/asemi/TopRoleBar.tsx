import React from "react";
import { UserRole, Company } from "@/lib/asemiStore";
import { ShieldCheck, Building2, Globe2, Sparkles } from "lucide-react";

interface TopRoleBarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  activeCompany: Company;
  companies: Company[];
  onSelectCompany: (companyId: string) => void;
  onOpenVerifier: () => void;
  isVerifierOpen: boolean;
}

export const TopRoleBar: React.FC<TopRoleBarProps> = ({
  currentRole,
  onSelectRole,
  activeCompany,
  companies,
  onSelectCompany,
  onOpenVerifier,
  isVerifierOpen,
}) => {
  return (
    <aside
      aria-label="Role and workspace switcher"
      className="bg-[#141311] text-[#e8e2d9] border-b border-[#2b2723] px-4 py-2.5 text-xs font-mono select-none sticky top-0 z-[100]"
    >
      <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: App Identity & Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#c9a84c] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asemi Platform</span>
          </div>

          <span className="text-[#45423c]">|</span>

          <div
            className="flex items-center bg-[#1e1c18] border border-[#332f29] p-0.5"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={currentRole === "COMPANY_USER" && !isVerifierOpen}
              onClick={() => {
                onSelectRole("COMPANY_USER");
              }}
              className={`px-3 py-1 flex items-center gap-1.5 transition-colors ${
                currentRole === "COMPANY_USER" && !isVerifierOpen
                  ? "bg-[#c9a84c] text-[#0c0b09] font-bold"
                  : "text-[#9e978d] hover:text-white"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Manufacturer</span>
            </button>

            <button
              role="tab"
              aria-selected={currentRole === "ADMIN"}
              onClick={() => {
                onSelectRole("ADMIN");
              }}
              className={`px-3 py-1 flex items-center gap-1.5 transition-colors ${
                currentRole === "ADMIN"
                  ? "bg-[#c9a84c] text-[#0c0b09] font-bold"
                  : "text-[#9e978d] hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Admin Operations</span>
            </button>

            <button
              role="tab"
              aria-selected={isVerifierOpen}
              onClick={onOpenVerifier}
              className={`px-3 py-1 flex items-center gap-1.5 transition-colors ${
                isVerifierOpen
                  ? "bg-[#c9a84c] text-[#0c0b09] font-bold"
                  : "text-[#9e978d] hover:text-white"
              }`}
            >
              <Globe2 className="w-3 h-3" />
              <span>Consumer Scanner</span>
            </button>
          </div>
        </div>

        {/* Right: Active Company Selector when in Company User mode */}
        {currentRole === "COMPANY_USER" && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8c8477]">Active Brand:</span>
            <select
              aria-label="Active Brand"
              value={activeCompany.id}
              onChange={(e) => onSelectCompany(e.target.value)}
              className="bg-[#1e1c18] border border-[#38332c] text-[#f4f0ea] px-2 py-1 text-[11px] focus:outline-none focus:border-[#c9a84c] cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.countryCode} • {c.status})
                </option>
              ))}
            </select>
            <span
              className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                activeCompany.status === "APPROVED"
                  ? "bg-[#18392b] text-[#55e09f] border border-[#275c45]"
                  : activeCompany.status === "PENDING"
                    ? "bg-[#3d2b0e] text-[#f5b84c] border border-[#6b4c19]"
                    : "bg-[#381a1a] text-[#f27474] border border-[#662828]"
              }`}
            >
              {activeCompany.status}
            </span>
          </div>
        )}

        {currentRole === "ADMIN" && (
          <div className="flex items-center gap-2 text-[11px] text-[#9e978d]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#55e09f] animate-pulse" />
            <span>Admin Console: All Companies & Fraud Monitor</span>
          </div>
        )}
      </div>
    </aside>
  );
};
