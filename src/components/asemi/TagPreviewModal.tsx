import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductTagPreview } from "@/components/asemi/ProductTagPreview";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, Sparkles, CircleDot, RectangleHorizontal } from "lucide-react";

export interface TagPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  defaultStyle?: "rectangle" | "circle";
}

export function TagPreviewModal({
  open,
  onOpenChange,
  codeString,
  productName,
  brandName = "Asemi",
  batchNumber,
  defaultStyle = "rectangle",
}: TagPreviewModalProps) {
  const [style, setStyle] = useState<"rectangle" | "circle">(defaultStyle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-4 text-[#caa33a]" /> Security Tag Preview
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {codeString}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Dynamic QR verification sticker ready for label printing & product packaging.
          </p>
        </DialogHeader>

        {/* Style Selector */}
        <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
          <Label className="text-xs font-semibold text-foreground">Select Sticker Format</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStyle("rectangle")}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-xs transition ${
                style === "rectangle"
                  ? "border-[#b8932c] bg-amber-500/10 font-semibold text-zinc-950 dark:text-amber-300"
                  : "border-border hover:bg-muted"
              }`}
            >
              <RectangleHorizontal className="size-4 text-[#caa33a]" />
              <div>
                <div>Holographic Rectangular Seal</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Like tea/packaged product sticker
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStyle("circle")}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-xs transition ${
                style === "circle"
                  ? "border-[#b8932c] bg-amber-500/10 font-semibold text-zinc-950 dark:text-amber-300"
                  : "border-border hover:bg-muted"
              }`}
            >
              <CircleDot className="size-4 text-[#caa33a]" />
              <div>
                <div>Circular Tamper Badge</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Medallion security seal
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Visual Sticker Preview */}
        <div className="flex justify-center py-2">
          <ProductTagPreview
            codeString={codeString}
            productName={productName}
            brandName={brandName}
            batchNumber={batchNumber}
            style={style}
            size="lg"
            showActions={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
