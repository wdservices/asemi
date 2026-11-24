import { Palette } from "lucide-react";
import {
  LABEL_COLOR_PRESETS,
  normalizeHex,
  type LabelColorTarget,
  type LabelStyleConfig,
} from "@/lib/label-themes";
import { cn } from "@/lib/utils";

interface LabelFinishSelectorProps {
  value: LabelStyleConfig;
  onChange: (next: LabelStyleConfig) => void;
  compact?: boolean;
  className?: string;
}

export function LabelFinishSelector({
  value,
  onChange,
  compact = false,
  className,
}: LabelFinishSelectorProps) {
  const activePreset = LABEL_COLOR_PRESETS.find((p) => p.id === value.presetId);
  const activeLabel =
    value.presetId === "custom"
      ? `Custom (${value.customHex.toUpperCase()})`
      : activePreset?.name || "Classic White";

  const activeSwatchBg =
    value.presetId === "custom"
      ? value.customHex
      : activePreset?.metallicGradient
        ? `linear-gradient(135deg, ${activePreset.metallicGradient[0]} 0%, ${activePreset.metallicGradient[2]} 50%, ${activePreset.metallicGradient[3]} 100%)`
        : activePreset?.swatchHex || "#ffffff";

  function handlePresetClick(presetId: string) {
    const preset = LABEL_COLOR_PRESETS.find((p) => p.id === presetId);
    onChange({
      ...value,
      presetId,
      ...(preset?.defaultApplyTo ? { applyTo: preset.defaultApplyTo } : {}),
    });
  }

  function handleTargetChange(applyTo: LabelColorTarget) {
    onChange({ ...value, applyTo });
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-zinc-200 bg-white p-3.5 text-left",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-700">
            Finish &amp; Color Palette
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full border border-zinc-300"
              style={{ background: activeSwatchBg }}
            />
            <p className="truncate text-[11px] font-medium text-zinc-600">{activeLabel}</p>
          </div>
        </div>

        {/* Apply target segmented control */}
        <div
          role="group"
          aria-label="Apply color target"
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"
        >
          <button
            type="button"
            onClick={() => handleTargetChange("background")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
              value.applyTo === "background"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            Background
          </button>
          <button
            type="button"
            onClick={() => handleTargetChange("qr")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
              value.applyTo === "qr"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            QR code
          </button>
        </div>
      </div>

      {/* Swatch Palette + Custom Color Picker */}
      <div className="flex flex-wrap items-center gap-2">
        {LABEL_COLOR_PRESETS.map((preset) => {
          const isSelected = value.presetId === preset.id;
          const swatchBg = preset.metallicGradient
            ? `linear-gradient(135deg, ${preset.metallicGradient[0]} 0%, ${preset.metallicGradient[1]} 32%, ${preset.metallicGradient[2]} 55%, ${preset.metallicGradient[3]} 80%, ${preset.metallicGradient[4]} 100%)`
            : preset.swatchHex;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset.id)}
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={isSelected}
              className={cn(
                "relative shrink-0 rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                compact ? "size-6" : "size-7",
                isSelected
                  ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-2"
                  : "border-zinc-300",
              )}
              style={{ background: swatchBg }}
            />
          );
        })}

        {/* Custom Color Palette Picker */}
        <label
          title="Choose any custom color from palette"
          className={cn(
            "relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors",
            compact ? "h-6" : "h-7",
            value.presetId === "custom"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100",
          )}
        >
          <span
            className="size-3.5 shrink-0 rounded-full border border-white/60 shadow-xs"
            style={{ backgroundColor: value.customHex }}
          />
          <Palette className="size-3 shrink-0" />
          <span>Custom</span>
          <input
            type="color"
            aria-label="Pick custom QR label color"
            value={value.customHex}
            onChange={(e) =>
              onChange({
                ...value,
                presetId: "custom",
                customHex: normalizeHex(e.target.value, value.customHex),
              })
            }
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
