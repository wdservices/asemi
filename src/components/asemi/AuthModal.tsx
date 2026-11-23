import React, { useEffect } from "react";
import { AuthCard } from "./AuthCard";

interface AuthModalProps {
  mode: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role?: "ADMIN" | "COMPANY_USER") => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, isOpen, onClose, onSuccess }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111114]/75 p-2 font-sans backdrop-blur-sm sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-auto flex w-full max-w-5xl justify-center animate-[rise_220ms_ease-out_both]">
        <AuthCard
          initialMode={mode}
          onSuccess={(role) => {
            onSuccess(role);
            onClose();
          }}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
