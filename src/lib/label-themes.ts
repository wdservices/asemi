export type LabelColorTarget = "background" | "qr";

export interface LabelStyleConfig {
  presetId: string;
  customHex: string;
  applyTo: LabelColorTarget;
}

export interface LabelPreset {
  id: string;
  name: string;
  swatchHex: string;
  metallicGradient?: [string, string, string, string, string];
  defaultApplyTo?: LabelColorTarget;
}

export interface ResolvedLabelPalette {
  presetId: string;
  cardBg: string;
  cardGradientStops?: string[];
  cardBorder: string;
  textPrimary: string;
  textMuted: string;
  qrDark: string;
  qrLight: string;
  qrPlaqueBg: string;
  qrPlaqueBorder: string;
  footerBg: string;
  footerBorder: string;
  footerText: string;
  footerSubtext: string;
  accentColor: string;
  isMetallic: boolean;
}

export const DEFAULT_LABEL_STYLE: LabelStyleConfig = {
  presetId: "white",
  customHex: "#1d4ed8",
  applyTo: "background",
};

export const LABEL_COLOR_PRESETS: LabelPreset[] = [
  {
    id: "white",
    name: "Classic White",
    swatchHex: "#ffffff",
  },
  {
    id: "aluminium",
    name: "Brushed Aluminium",
    swatchHex: "#dce2ea",
    metallicGradient: ["#f8fafc", "#d8e0e8", "#eef2f6", "#c6d0dc", "#f1f5f9"],
    defaultApplyTo: "background",
  },
  {
    id: "champagne-gold",
    name: "Champagne Foil",
    swatchHex: "#eadbb7",
    metallicGradient: ["#fcfaf3", "#e7d7ad", "#f6eed8", "#d7c08a", "#fbf6e9"],
    defaultApplyTo: "background",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    swatchHex: "#b91c1c",
  },
  {
    id: "rose-tint",
    name: "Blush Red",
    swatchHex: "#ffe4e6",
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    swatchHex: "#1d4ed8",
  },
  {
    id: "ice-blue",
    name: "Ice Blue",
    swatchHex: "#dbeafe",
  },
  {
    id: "emerald",
    name: "Emerald",
    swatchHex: "#047857",
  },
  {
    id: "obsidian",
    name: "Obsidian Dark",
    swatchHex: "#18181b",
  },
];

export function normalizeHex(hex: string | undefined, fallback = "#1d4ed8"): string {
  if (!hex) return fallback;
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return (
      "#" +
      clean
        .split("")
        .map((ch) => ch + ch)
        .join("")
        .toLowerCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex);
  const n = parseInt(norm.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function mixHex(hexA: string, hexB: string, ratioB: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioB));
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Ensures a color is dark enough for reliable QR module scanning against light quiet zones. */
function ensureScannableQrInk(hex: string): string {
  const lum = getRelativeLuminance(hex);
  if (lum <= 0.24) return normalizeHex(hex);
  if (lum <= 0.45) return mixHex(hex, "#0f172a", 0.4);
  return mixHex(hex, "#0f172a", 0.72);
}

export function resolveLabelPalette(
  style?: Partial<LabelStyleConfig> | null,
): ResolvedLabelPalette {
  const presetId = style?.presetId || DEFAULT_LABEL_STYLE.presetId;
  const applyTo = style?.applyTo || DEFAULT_LABEL_STYLE.applyTo;
  const customHex = normalizeHex(style?.customHex, DEFAULT_LABEL_STYLE.customHex);

  const preset = LABEL_COLOR_PRESETS.find((p) => p.id === presetId);
  const chosenHex = presetId === "custom" ? customHex : preset?.swatchHex || "#ffffff";

  // Brushed Aluminium finish
  if (presetId === "aluminium") {
    if (applyTo === "qr") {
      return {
        presetId,
        cardBg: "#ffffff",
        cardBorder: "#94a3b8",
        textPrimary: "#0f172a",
        textMuted: "#475569",
        qrDark: "#475569",
        qrLight: "#f1f5f9",
        qrPlaqueBg: "#f1f5f9",
        qrPlaqueBorder: "#94a3b8",
        footerBg: "#f8fafc",
        footerBorder: "#94a3b8",
        footerText: "#0f172a",
        footerSubtext: "#475569",
        accentColor: "#475569",
        isMetallic: true,
      };
    }
    return {
      presetId,
      cardBg: "#dfe5ed",
      cardGradientStops: ["#f8fafc", "#d7dfe8", "#eef2f6", "#c4cedb", "#f1f5f9"],
      cardBorder: "#94a3b8",
      textPrimary: "#0f172a",
      textMuted: "#334155",
      qrDark: "#0f172a",
      qrLight: "#edf1f6",
      qrPlaqueBg: "#edf1f6",
      qrPlaqueBorder: "#94a3b8",
      footerBg: "rgba(255, 255, 255, 0.72)",
      footerBorder: "#94a3b8",
      footerText: "#0f172a",
      footerSubtext: "#334155",
      accentColor: "#1e293b",
      isMetallic: true,
    };
  }

  // Champagne Metallic Foil finish
  if (presetId === "champagne-gold") {
    if (applyTo === "qr") {
      return {
        presetId,
        cardBg: "#ffffff",
        cardBorder: "#d4be8a",
        textPrimary: "#1c1917",
        textMuted: "#57534e",
        qrDark: "#5c4314",
        qrLight: "#fbf7ec",
        qrPlaqueBg: "#fbf7ec",
        qrPlaqueBorder: "#d4be8a",
        footerBg: "#faf6eb",
        footerBorder: "#d4be8a",
        footerText: "#1c1917",
        footerSubtext: "#57534e",
        accentColor: "#856221",
        isMetallic: true,
      };
    }
    return {
      presetId,
      cardBg: "#eadbb7",
      cardGradientStops: ["#fcfaf3", "#e7d7ad", "#f6eed8", "#d7c08a", "#fbf6e9"],
      cardBorder: "#c5ac72",
      textPrimary: "#1c1917",
      textMuted: "#44403c",
      qrDark: "#1c1917",
      qrLight: "#f7f0de",
      qrPlaqueBg: "#f7f0de",
      qrPlaqueBorder: "#c5ac72",
      footerBg: "rgba(255, 255, 255, 0.72)",
      footerBorder: "#c5ac72",
      footerText: "#1c1917",
      footerSubtext: "#57534e",
      accentColor: "#78571a",
      isMetallic: true,
    };
  }

  // Classic White baseline
  if (presetId === "white") {
    return {
      presetId,
      cardBg: "#ffffff",
      cardBorder: "#cbd5e1",
      textPrimary: "#18181b",
      textMuted: "#4b5563",
      qrDark: "#111827",
      qrLight: "#ffffff",
      qrPlaqueBg: "#ffffff",
      qrPlaqueBorder: "#cbd5e1",
      footerBg: "#f8fafc",
      footerBorder: "#cbd5e1",
      footerText: "#0f172a",
      footerSubtext: "#4b5563",
      accentColor: "#1e3a1e",
      isMetallic: false,
    };
  }

  // Solid / Custom colors — Mode 1: Reflect on QR code ink & accents
  if (applyTo === "qr") {
    const qrInk = ensureScannableQrInk(chosenHex);
    const softTint = mixHex(chosenHex, "#ffffff", 0.92);
    const borderTint = mixHex(chosenHex, "#ffffff", 0.65);
    return {
      presetId,
      cardBg: "#ffffff",
      cardBorder: borderTint,
      textPrimary: "#18181b",
      textMuted: "#52525b",
      qrDark: qrInk,
      qrLight: "#ffffff",
      qrPlaqueBg: "#ffffff",
      qrPlaqueBorder: borderTint,
      footerBg: softTint,
      footerBorder: borderTint,
      footerText: "#18181b",
      footerSubtext: "#52525b",
      accentColor: qrInk,
      isMetallic: false,
    };
  }

  // Solid / Custom colors — Mode 2: Reflect on Card & QR Background
  const lum = getRelativeLuminance(chosenHex);
  const isLightSurface = lum >= 0.48;

  if (isLightSurface) {
    const borderHex = mixHex(chosenHex, "#0f172a", 0.18);
    const qrBg = mixHex(chosenHex, "#ffffff", 0.25);
    return {
      presetId,
      cardBg: chosenHex,
      cardGradientStops: [
        mixHex(chosenHex, "#ffffff", 0.22),
        chosenHex,
        mixHex(chosenHex, "#0f172a", 0.05),
      ],
      cardBorder: borderHex,
      textPrimary: "#0f172a",
      textMuted: "#334155",
      qrDark: "#0f172a",
      qrLight: qrBg,
      qrPlaqueBg: qrBg,
      qrPlaqueBorder: borderHex,
      footerBg: "rgba(255, 255, 255, 0.78)",
      footerBorder: borderHex,
      footerText: "#0f172a",
      footerSubtext: "#475569",
      accentColor: mixHex(chosenHex, "#0f172a", 0.55),
      isMetallic: false,
    };
  }

  // Rich/dark surface (Crimson Red, Royal Blue, Emerald, Obsidian, or custom dark shade):
  // Card takes the rich saturated shade; QR quiet-zone keeps a high-contrast softly tinted plaque
  // so every phone camera locks focus cleanly while visually matching the palette.
  const qrTintBg = mixHex(chosenHex, "#ffffff", 0.9);
  const deeperShade = mixHex(chosenHex, "#000000", 0.24);
  const borderShade = mixHex(chosenHex, "#ffffff", 0.22);

  return {
    presetId,
    cardBg: chosenHex,
    cardGradientStops: [mixHex(chosenHex, "#ffffff", 0.08), chosenHex, deeperShade],
    cardBorder: borderShade,
    textPrimary: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.85)",
    qrDark: ensureScannableQrInk(chosenHex),
    qrLight: qrTintBg,
    qrPlaqueBg: qrTintBg,
    qrPlaqueBorder: "rgba(255, 255, 255, 0.85)",
    footerBg: "rgba(255, 255, 255, 0.94)",
    footerBorder: "rgba(255, 255, 255, 0.75)",
    footerText: "#0f172a",
    footerSubtext: "#475569",
    accentColor: deeperShade,
    isMetallic: false,
  };
}

const STORAGE_KEY_PREFIX = "asemi_label_style_v1_";

export function loadSavedLabelStyle(companyId?: string | null): LabelStyleConfig {
  if (typeof window === "undefined") return DEFAULT_LABEL_STYLE;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${companyId || "default"}`);
    if (!raw) return DEFAULT_LABEL_STYLE;
    const parsed = JSON.parse(raw) as Partial<LabelStyleConfig>;
    return {
      presetId: parsed.presetId || DEFAULT_LABEL_STYLE.presetId,
      customHex: normalizeHex(parsed.customHex, DEFAULT_LABEL_STYLE.customHex),
      applyTo: parsed.applyTo === "qr" ? "qr" : "background",
    };
  } catch {
    return DEFAULT_LABEL_STYLE;
  }
}

export function saveLabelStyle(style: LabelStyleConfig, companyId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${companyId || "default"}`,
      JSON.stringify(style),
    );
  } catch {
    // Ignore storage quota / private mode issues
  }
}
