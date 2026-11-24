import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductTagPreview } from "@/components/asemi/ProductTagPreview";
import { LabelFinishSelector } from "@/components/asemi/LabelFinishSelector";
import { DEFAULT_LABEL_STYLE, type LabelStyleConfig } from "@/lib/label-themes";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "lucide-react";

export interface TagPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codeString: string;
  productName?: string;
  brandName?: string;
  batchNumber?: string;
  logoUrl?: string;
  labelStyle?: LabelStyleConfig | undefined;
  onLabelStyleChange?: ((style: LabelStyleConfig) => void) | undefined;
}

export function TagPreviewModal({
  open,
  onOpenChange,
  codeString,
  productName,
  brandName = "Asemi",
  batchNumber,
  logoUrl,
  labelStyle,
  onLabelStyleChange,
}: TagPreviewModalProps) {
  const [internalStyle, setInternalStyle] = useState<LabelStyleConfig>(
    labelStyle ?? DEFAULT_LABEL_STYLE,
  );

  useEffect(() => {
    if (labelStyle) setInternalStyle(labelStyle);
  }, [labelStyle]);

  const activeStyle = labelStyle ?? internalStyle;

  function handleStyleChange(next: LabelStyleConfig) {
    setInternalStyle(next);
    onLabelStyleChange?.(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-6 font-sans">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <QrCode className="size-4 text-blue-600" /> Security Tag Preview
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {codeString}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Customize label finish and print-ready colors at 28×32mm.
          </p>
        </DialogHeader>

        <LabelFinishSelector compact value={activeStyle} onChange={handleStyleChange} />

        {/* Visual Sticker Preview */}
        <div className="flex justify-center py-2">
          <ProductTagPreview
            codeString={codeString}
            {...(productName ? { productName } : {})}
            {...(brandName ? { brandName } : {})}
            {...(batchNumber ? { batchNumber } : {})}
            {...(logoUrl ? { logoUrl } : {})}
            labelStyle={activeStyle}
            size="lg"
            showActions={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
