import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/db";
import { CreditCard, ShieldCheck, CheckCircle2, Loader2, Sparkles, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface PaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  quantity: number;
  amount: number;
  currency: string;
  onAuthorize: (onProgress: (p: number) => void) => Promise<void>;
}

export function PaymentGatewayModal({
  open,
  onOpenChange,
  productName,
  quantity,
  amount,
  currency,
  onAuthorize,
}: PaymentGatewayModalProps) {
  const [cardNumber, setCardNumber] = useState("4084 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("892");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"ready" | "authorizing" | "generating" | "complete">("ready");
  const [progress, setProgress] = useState(0);

  const handlePay = async () => {
    try {
      setProcessing(true);
      setStep("authorizing");
      setProgress(15);

      // Simulate payment network roundtrip (1s)
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStep("generating");
      setProgress(35);

      await onAuthorize((p) => {
        setProgress(Math.max(35, p));
      });

      setStep("complete");
      setProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        setStep("ready");
        setProcessing(false);
        setProgress(0);
      }, 900);
    } catch (err) {
      setProcessing(false);
      setStep("ready");
    }
  };

  return (
    <Dialog open={open} onOpenChange={processing ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-zinc-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-black px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Payment Authorization
                </DialogTitle>
                <p className="text-xs text-zinc-300">
                  Secure Payment Gateway • Instant Batch Issuance
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
              Simulation Mode
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Order Summary Box */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-zinc-600">
              <span>Target Product</span>
              <span className="font-semibold text-zinc-900">{productName}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>Verification Codes</span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {quantity.toLocaleString()} units
              </span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between">
              <span className="font-medium text-zinc-900">Total Authorized Amount</span>
              <span className="font-display text-xl font-bold text-zinc-950">
                {formatMoney(amount, currency)}
              </span>
            </div>
          </div>

          {/* Test Card Form */}
          {step === "ready" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-zinc-500" /> Card Details (Simulated Test
                  Card)
                </Label>
                <span className="text-[11px] text-zinc-500">Auto-approved</span>
              </div>

              <div className="space-y-3">
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="font-mono text-sm bg-white"
                  placeholder="Card Number"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="font-mono text-sm bg-white"
                    placeholder="MM/YY"
                  />
                  <Input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="font-mono text-sm bg-white"
                    placeholder="CVV"
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                By clicking authorize, test payment will be simulated, and your batch with unique
                cryptographic QR codes will be generated immediately into your Code Bank.
              </p>
            </div>
          )}

          {/* Processing / Progress State */}
          {step !== "ready" && (
            <div className="space-y-3 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-900">
                {step === "complete" ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    Batch Generated Successfully!
                  </>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin text-primary" />
                    {step === "authorizing"
                      ? "Authorizing simulated payment…"
                      : `Generating ${quantity.toLocaleString()} QR codes & security tags…`}
                  </>
                )}
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-zinc-500">
                Creating unique cryptographic verification signatures…
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={processing}
            className="text-zinc-600"
          >
            Cancel
          </Button>

          <Button
            onClick={handlePay}
            disabled={processing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[190px] gap-2 shadow-sm"
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Authorize & Generate ({formatMoney(amount, currency)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
