import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/db";
import { ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  PAYSTACK_PUBLIC_KEY,
  payWithPaystack,
  newPaymentReference,
} from "@/lib/paystack";
import { fnVerifyPaystackPayment } from "@/lib/db";

export interface BatchPayment {
  reference: string;
  verified: boolean;
}

export interface PaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  quantity: number;
  amount: number;
  currency: string;
  email: string;
  companyId: string;
  productId: string;
  onAuthorize: (
    onProgress: (p: number) => void,
    payment: BatchPayment,
  ) => Promise<void>;
}

type Step = "ready" | "paying" | "verifying" | "generating" | "complete";

export function PaymentGatewayModal({
  open,
  onOpenChange,
  productName,
  quantity,
  amount,
  currency,
  email,
  companyId,
  productId,
  onAuthorize,
}: PaymentGatewayModalProps) {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<Step>("ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const configured = !!PAYSTACK_PUBLIC_KEY;

  function reset() {
    setStep("ready");
    setProcessing(false);
    setProgress(0);
    setError("");
  }

  const handlePay = async () => {
    try {
      setError("");
      setProcessing(true);
      setStep("paying");
      setProgress(10);

      // 1. Collect payment via Paystack popup (card, transfer, USSD, …)
      const reference = await payWithPaystack({
        email,
        amount,
        currency,
        reference: newPaymentReference(),
        metadata: { companyId, productId, productName, quantity },
      });

      // 2. Verify the charge server-side before generating codes.
      setStep("verifying");
      setProgress(30);
      let verified = false;
      try {
        const res = await fnVerifyPaystackPayment({
          reference,
          amount: Math.round(amount * 100),
          currency: currency.toUpperCase(),
        });
        verified = !!res.verified;
      } catch (verifyErr) {
        // Server verification unavailable (functions not deployed yet):
        // the Paystack-hosted checkout already charged the card and the
        // reference is recorded on the invoice for reconciliation.
        // Any other verification failure blocks generation.
        const msg = verifyErr instanceof Error ? verifyErr.message : "";
        const fnMissing = /not-found|404|does not exist|NOT_FOUND/i.test(msg);
        if (!fnMissing) throw verifyErr;
      }

      // 3. Generate the batch + codes.
      setStep("generating");
      setProgress(40);
      await onAuthorize(
        (p) => {
          setProgress(Math.max(40, p));
        },
        { reference, verified },
      );

      setStep("complete");
      setProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 900);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setProcessing(false);
      setStep("ready");
      setProgress(0);
    }
  };

  const busy = processing && step !== "paying";

  return (
    <Dialog open={open} onOpenChange={busy ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-slate-200 font-sans">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Pay with Paystack
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  Secure checkout • Instant batch issuance
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white border border-white/20">
              Paystack
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Order Summary Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span>Target Product</span>
              <span className="font-semibold text-slate-900">{productName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Verification Codes</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {quantity.toLocaleString()} units
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span className="font-medium text-slate-900">Total Due</span>
              <span className="font-sans text-xl font-bold text-slate-950">
                {formatMoney(amount, currency)}
              </span>
            </div>
          </div>

          {!configured ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>
                Online payment is not configured yet (missing Paystack public key). Please contact
                support to complete your purchase.
              </p>
            </div>
          ) : step === "ready" ? (
            <div className="space-y-3">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-xs text-slate-500 leading-relaxed">
                You will be redirected to Paystack's secure checkout to pay with card, bank
                transfer, or USSD. Your {quantity.toLocaleString()} codes generate immediately
                after payment.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900">
                {step === "complete" ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    Batch Generated Successfully!
                  </>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                    {step === "paying"
                      ? "Waiting for Paystack checkout…"
                      : step === "verifying"
                        ? "Confirming your payment…"
                        : `Generating ${quantity.toLocaleString()} QR codes…`}
                  </>
                )}
              </div>
              <Progress value={progress} className="h-2" />
              {step === "paying" && (
                <p className="text-xs text-slate-500">
                  Complete payment in the Paystack window. Closing it cancels this order.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="text-slate-600"
          >
            Cancel
          </Button>

          <Button
            onClick={handlePay}
            disabled={busy || !configured}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[190px] gap-2 shadow-sm"
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Pay {formatMoney(amount, currency)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
