import React, { useEffect } from "react";
import { X } from "lucide-react";
import { AuthCard } from "./AuthCard";

interface AuthModalProps {
  mode: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-auto animate-fadeIn flex justify-center">
        <button
          id="btn-close-auth-modal"
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-2.5 z-20 p-1 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <AuthCard
          initialMode={mode}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
