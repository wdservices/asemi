import React from "react";
import { X } from "lucide-react";
import { AuthCard } from "./AuthCard";

interface AuthModalProps {
  mode: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-8">
        <button
          id="btn-close-auth-modal"
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
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
