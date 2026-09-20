import React from "react";
import { UserRole, Company } from "@/lib/asemiStore";

export interface TopRoleBarProps {
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  activeCompany?: Company;
  companies?: Company[];
  onSelectCompany?: (companyId: string) => void;
  onOpenVerifier?: () => void;
  isVerifierOpen?: boolean;
}

/**
 * Top platform bar displaying only the black navbar without internal content,
 * per sovereign styling requirements.
 */
export const TopRoleBar: React.FC<TopRoleBarProps> = () => {
  return (
    <aside
      id="top-platform-navbar"
      aria-label="Platform bar"
      className="bg-[#141311] border-b border-[#2b2723] h-8 sm:h-9 w-full select-none sticky top-0 z-[100]"
    >
      <div className="max-w-[1240px] mx-auto h-full" />
    </aside>
  );
};
