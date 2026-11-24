import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  Flashlight,
  ImageUp,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand";
import { normalizeCode } from "@/lib/auth";
import { prefetchAndVerifyCode } from "@/lib/verify-cache";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify authenticity — Asemi" },
      {
        name: "description",
        content:
          "Scan your packaging QR code with your camera or enter the serial code to verify authenticity.",
      },
      { property: "og:title", content: "Verify authenticity — Asemi" },
      { property: "og:description", content: "Authenticate genuine products in seconds." },
    ],
  }),
  component: VerifyEntry,
});

function isReadyCode(code: string): boolean {
  const stripped = code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (stripped.startsWith("ASM")) return stripped.length === 13;
  return stripped.length === 12 || stripped.length === 10;
}

function extractCodeFromQrPayload(rawText: string): string | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. Direct URL or path containing /v/<CODE>
  const pathMatch = trimmed.match(/\/v\/([A-Za-z0-9\-_%]+)/i);
  if (pathMatch?.[1]) {
    const decoded = decodeURIComponent(pathMatch[1]);
    const normalized = normalizeCode(decoded);
    if (isReadyCode(normalized)) return normalized;
  }

  // 2. Query param ?code=<CODE>
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get("code");
    if (param) {
      const normalized = normalizeCode(param);
      if (isReadyCode(normalized)) return normalized;
    }
  } catch {
    // Not an absolute URL — check raw string below
  }

  // 3. Raw serial code text
  const normalized = normalizeCode(trimmed);
  if (isReadyCode(normalized)) return normalized;
  return null;
}

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function createNativeQrDetector(): BarcodeDetectorInstance | null {
  try {
    const NativeDetector = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorInstance;
      }
    ).BarcodeDetector;
    return NativeDetector ? new NativeDetector({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

type FacingMode = "environment" | "user";

function VerifyEntry() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [decodingImage, setDecodingImage] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sessionIdRef = useRef(0);
  const verifyingRef = useRef(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const ready = isReadyCode(code);

  const stopCamera = useCallback(() => {
    sessionIdRef.current += 1;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setStartingCamera(false);
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  useEffect(() => {
    router.preloadRoute({ to: "/v/$code", params: { code: "ASM-0000-000000" } }).catch(() => {});
    return () => {
      stopCamera();
    };
  }, [router, stopCamera]);

  const verifyAndNavigate = useCallback(
    async (parsedCode: string) => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      setScanHint(null);
      setDetectedCode(parsedCode);
      setVerifying(true);
      stopCamera();

      try {
        await Promise.all([
          router.preloadRoute({ to: "/v/$code", params: { code: parsedCode } }).catch(() => {}),
          prefetchAndVerifyCode(queryClient, parsedCode).catch(() => null),
        ]);
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
        navigate({ to: "/v/$code", params: { code: parsedCode } });
      }
    },
    [navigate, queryClient, router, stopCamera],
  );

  const handleDetected = useCallback(
    (payload: string) => {
      if (verifyingRef.current) return true;
      const parsed = extractCodeFromQrPayload(payload);
      if (!parsed) {
        setScanHint(
          "A QR code was detected, but it does not contain a valid Asemi verification code.",
        );
        return false;
      }
      void verifyAndNavigate(parsed);
      return true;
    },
    [verifyAndNavigate],
  );

  // Attach active MediaStream once <video> renders and run continuous QR detection loop
  useEffect(() => {
    if (!scanning || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video) return;

    let cancelled = false;
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.play().catch(() => {});

    const [videoTrack] = stream.getVideoTracks();
    try {
      const caps = videoTrack?.getCapabilities?.() as { torch?: boolean } | undefined;
      setHasTorch(Boolean(caps?.torch));
    } catch {
      setHasTorch(false);
    }

    const detector = createNativeQrDetector();

    const scanFrame = async () => {
      if (cancelled || !streamRef.current || !videoRef.current) return;
      const el = videoRef.current;

      if (el.readyState >= el.HAVE_ENOUGH_DATA && el.videoWidth > 0 && el.videoHeight > 0) {
        if (detector) {
          try {
            const codes = await detector.detect(el);
            for (const item of codes) {
              if (item.rawValue && handleDetected(item.rawValue)) {
                return;
              }
            }
          } catch {
            // Continue smoothly with canvas jsQR decoding
          }
        }

        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        const targetW = Math.min(720, el.videoWidth);
        const scale = targetW / el.videoWidth;
        const targetH = Math.round(el.videoHeight * scale);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(el, 0, 0, targetW, targetH);
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const decoded = jsQR(imgData.data, targetW, targetH, {
            inversionAttempts: "attemptBoth",
          });
          if (decoded?.data && handleDetected(decoded.data)) {
            return;
          }
        }
      }

      if (!cancelled) {
        timerRef.current = window.setTimeout(scanFrame, 150);
      }
    };

    timerRef.current = window.setTimeout(scanFrame, 200);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scanning, handleDetected]);

  const startScanner = useCallback(
    async (mode: FacingMode) => {
      setCameraError(null);
      setScanHint(null);
      setDetectedCode(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Live camera access is unavailable in this browser context. You can upload a photo of the QR tag or enter the printed serial code below.",
        );
        return;
      }

      stopCamera();
      const requestId = ++sessionIdRef.current;
      setStartingCamera(true);

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (firstErr) {
          const errName = (firstErr as { name?: string })?.name || "";
          if (errName === "OverconstrainedError" || errName === "ConstraintNotSatisfiedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw firstErr;
          }
        }

        if (sessionIdRef.current !== requestId) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        streamRef.current = stream;
        setStartingCamera(false);
        setScanning(true);

        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const videoInputs = devices.filter((d) => d.kind === "videoinput");
            setHasMultipleCameras(videoInputs.length > 1);
          })
          .catch(() => {});
      } catch (err) {
        stopCamera();
        const name = (err as { name?: string })?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was denied. Allow camera access in your browser settings, upload a QR image, or enter the serial code below.",
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCameraError(
            "No camera was detected on this device. Upload a QR photo or enter the serial code printed beneath the label below.",
          );
        } else {
          setCameraError(
            "Could not start the camera scanner. Upload a QR photo or enter the serial code manually below.",
          );
        }
      }
    },
    [stopCamera],
  );

  function toggleFacing() {
    const next: FacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (scanning) {
      startScanner(next);
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setHasTorch(false);
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCameraError(null);
    setScanHint(null);
    setDecodingImage(true);

    try {
      const bitmap = await createImageBitmap(file);
      try {
        const detector = createNativeQrDetector();
        if (detector) {
          const codes = await detector.detect(bitmap).catch(() => []);
          for (const item of codes) {
            if (item.rawValue && handleDetected(item.rawValue)) return;
          }
        }

        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const decoded = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
          if (decoded?.data) {
            handleDetected(decoded.data);
            return;
          }
        }
        setCameraError(
          "No Asemi QR code was found in that image. Try a clearer photo or enter the serial code below.",
        );
      } finally {
        bitmap.close();
      }
    } catch {
      setCameraError(
        "Could not read that image file. Try another photo or enter the serial code manually.",
      );
    } finally {
      setDecodingImage(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Logo />

        <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-700">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Authenticity Verification</span>
          </div>
          <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Verify your product
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Point your camera at the serialized QR seal or enter the code printed beneath it.
          </p>

          {/* Live Camera Scanner */}
          <div className="mt-5 space-y-3">
            {scanning ? (
              <div className="space-y-3">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                  <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                  {/* Viewfinder Reticle */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
                    <div className="relative h-full w-full max-h-56 max-w-56">
                      <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 border-white" />
                      <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 border-white" />
                      <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 border-white" />
                      <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-2 border-r-2 border-white" />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 px-4 text-center">
                    <span className="inline-block rounded-md bg-slate-950/75 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      Align QR seal inside frame
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 whitespace-nowrap"
                    onClick={stopCamera}
                  >
                    <CameraOff className="mr-1.5 size-4" /> Stop camera
                  </Button>
                  {hasTorch && (
                    <Button
                      type="button"
                      variant={torchOn ? "default" : "outline"}
                      className={torchOn ? "bg-blue-600 hover:bg-blue-700" : ""}
                      onClick={toggleTorch}
                      aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                      title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                    >
                      <Flashlight className="size-4" />
                    </Button>
                  )}
                  {hasMultipleCameras && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleFacing}
                      aria-label="Switch camera"
                      title="Switch camera"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  disabled={startingCamera}
                  onClick={() => startScanner(facingMode)}
                  className="h-12 w-full bg-blue-600 text-sm font-semibold whitespace-nowrap hover:bg-blue-700"
                >
                  {startingCamera ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Starting camera…
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 size-4" /> Scan QR with camera
                    </>
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload QR tag photo"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={decodingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 w-full text-xs font-medium text-slate-600 whitespace-nowrap hover:bg-slate-100 hover:text-slate-900"
                >
                  {decodingImage ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Reading QR image…
                    </>
                  ) : (
                    <>
                      <ImageUp className="mr-1.5 size-3.5" /> Or upload a photo of the QR tag
                    </>
                  )}
                </Button>
              </div>
            )}

            {detectedCode && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-xs font-medium text-emerald-900">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-700" />
                <span>
                  Detected <span className="font-mono font-semibold">{detectedCode}</span> —{" "}
                  {verifying ? "verifying product authenticity…" : "opening certificate…"}
                </span>
              </div>
            )}

            {scanHint && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
                {scanHint}
              </p>
            )}

            {cameraError && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                {cameraError}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or enter serial code</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Manual entry */}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && !verifying) void verifyAndNavigate(code);
            }}
          >
            <Input
              inputMode="text"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="ASM-XXXX-XXXXXX"
              className="h-13 text-center font-mono text-lg tracking-[0.2em]"
              aria-label="Serial verification code"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full border-slate-300 font-semibold text-slate-900 whitespace-nowrap hover:bg-slate-50"
              disabled={!ready || verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Checking authenticity…
                </>
              ) : (
                <>
                  <Search className="mr-1.5 size-4" /> Check serial code
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <QrCode className="size-3.5 text-slate-400" />
          <Link to="/" className="underline underline-offset-2 hover:text-slate-900">
            Back to Asemi home
          </Link>
        </p>
      </div>
    </main>
  );
}
