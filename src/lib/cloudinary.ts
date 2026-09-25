// Cloudinary image uploads (browser-safe).
//
// Uses an UNSIGNED upload preset, so no API secret is needed — or allowed —
// here. The secret must only ever live on a server. Configure via
// VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET if needed.

function readEnv(key: string): string | undefined {
  try {
    return (import.meta as unknown as { env: Record<string, string | undefined> }).env?.[key];
  } catch {
    return undefined;
  }
}

export const CLOUDINARY_CLOUD_NAME =
  readEnv("VITE_CLOUDINARY_CLOUD_NAME") || "dvlgvtqn";
export const CLOUDINARY_UPLOAD_PRESET =
  readEnv("VITE_CLOUDINARY_UPLOAD_PRESET") || "asemi_presets";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface CloudinaryUploadResult {
  /** Optimized delivery URL (f_auto, q_auto). */
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload an image file to Cloudinary via the unsigned preset.
 * Make sure "asemi_presets" exists in the Cloudinary dashboard under
 * Settings → Upload → Upload presets with Signing Mode = Unsigned.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder = "asemi/products",
): Promise<CloudinaryUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 10MB.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      body?.error?.message ||
        `Image upload failed (${res.status}). Check that the "${CLOUDINARY_UPLOAD_PRESET}" unsigned preset exists.`,
    );
  }

  const data = await res.json();
  const url = optimizeCloudinaryUrl(String(data.secure_url));
  return {
    url,
    publicId: String(data.public_id),
    width: Number(data.width || 0),
    height: Number(data.height || 0),
    format: String(data.format || ""),
  };
}

/**
 * Insert an optimization transform (auto format + auto quality, optional
 * resize) into a Cloudinary delivery URL. Non-Cloudinary URLs pass through.
 */
export function optimizeCloudinaryUrl(
  url: string,
  opts: { width?: number; height?: number; crop?: string } = {},
): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const parts = ["f_auto", "q_auto"];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

/** Square auto-cropped thumbnail (e.g. product cards, logos). */
export function cloudinaryThumb(url: string, size = 512): string {
  return optimizeCloudinaryUrl(url, { width: size, height: size, crop: "auto" });
}
