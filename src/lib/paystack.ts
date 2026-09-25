// Paystack inline payments (client side).
//
// Only the PUBLIC key lives here — set VITE_PAYSTACK_PUBLIC_KEY (use a test
// key like pk_test_... while integrating). Charge verification happens
// server-side via the `verifypaystack` callable (PAYSTACK_SECRET_KEY).

function readEnv(key: string): string | undefined {
  try {
    return (import.meta as unknown as { env: Record<string, string | undefined> }).env?.[key];
  } catch {
    return undefined;
  }
}

export const PAYSTACK_PUBLIC_KEY = readEnv("VITE_PAYSTACK_PUBLIC_KEY") || "";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        callback?: (response: { reference: string }) => void;
        onClose?: () => void;
      }) => { openIframe: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (typeof window !== "undefined" && window.PaystackPop) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Paystack. Check your internet connection and retry."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface PaystackCharge {
  email: string;
  /** Major-unit amount, e.g. 899500.00. Converted to kobo/cents internally. */
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

/** Open the Paystack checkout popup. Resolves with the transaction reference. */
export async function payWithPaystack(charge: PaystackCharge): Promise<string> {
  if (!PAYSTACK_PUBLIC_KEY) {
    throw new Error(
      "Paystack is not configured (missing VITE_PAYSTACK_PUBLIC_KEY). Contact support.",
    );
  }
  if (!charge.email || !charge.email.includes("@")) {
    throw new Error("A valid email address is required for payment.");
  }
  if (!(charge.amount > 0)) {
    throw new Error("Invalid payment amount.");
  }
  await loadPaystackScript();
  if (!window.PaystackPop) {
    throw new Error("Paystack failed to initialise. Please retry.");
  }

  return new Promise((resolve, reject) => {
    const opts: {
      key: string;
      email: string;
      amount: number;
      currency: string;
      ref?: string;
      metadata?: Record<string, unknown>;
      callback?: (response: { reference: string }) => void;
      onClose?: () => void;
    } = {
      key: PAYSTACK_PUBLIC_KEY,
      email: charge.email,
      amount: Math.round(charge.amount * 100), // lowest denomination
      currency: charge.currency.toUpperCase(),
      ref: charge.reference,
      callback: (response) => resolve(response.reference),
      onClose: () => reject(new Error("Payment window closed before completion.")),
    };
    if (charge.metadata) opts.metadata = charge.metadata;
    const handler = window.PaystackPop!.setup(opts);
    handler.openIframe();
  });
}

/** Client-side reference for a batch payment (Paystack may replace it). */
export function newPaymentReference(prefix = "ASM"): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}
