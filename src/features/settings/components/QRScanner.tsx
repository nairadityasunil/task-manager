import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Key, RefreshCw, ShieldAlert } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScanSuccess: (payload: { sessionId: string; token: string }) => void;
  onFallbackToKey: () => void;
  isLoading?: boolean;
}

export function parseQrPayload(rawValue: string): { sessionId: string; token: string } | null {
  const trimmed = rawValue.trim();

  // 1. URL format (e.g., http://localhost:5173/login?mode=companion&sessionId=...&token=...)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("sessionId=")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `http://dummy.com/${trimmed}`);
      const sessionId = url.searchParams.get("sessionId");
      const token = url.searchParams.get("token") || url.searchParams.get("qrToken");
      if (sessionId && token) {
        return { sessionId, token };
      }
    } catch {
      // Fall through to JSON
    }
  }

  // 2. JSON format (e.g., {"type":"companion_pairing","sessionId":"...","token":"..."})
  try {
    const data = JSON.parse(trimmed);
    const sessionId = data.sessionId;
    const token = data.token || data.qrToken;
    if (sessionId && token) {
      return { sessionId, token };
    }
  } catch {
    // Invalid format
  }

  return null;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onFallbackToKey,
  isLoading = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const hasProcessedRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<"initializing" | "active" | "connecting" | "denied" | "unavailable" | "error">("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleRawQrPayload = useCallback(
    (rawValue: string) => {
      if (hasProcessedRef.current) return;

      const parsed = parseQrPayload(rawValue);
      if (parsed) {
        hasProcessedRef.current = true;
        stopCameraStream();
        setCameraState("connecting");
        onScanSuccess(parsed);
      } else {
        hasProcessedRef.current = true;
        stopCameraStream();
        setCameraState("error");
        setErrorMessage("Invalid QR code. Please scan a valid companion-device QR code.");
      }
    },
    [onScanSuccess, stopCameraStream]
  );

  const startCamera = useCallback(async () => {
    try {
      hasProcessedRef.current = false;
      setCameraState("initializing");
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState("unavailable");
        setErrorMessage("Camera access is not supported on this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("active");
      }

      const scanFrame = () => {
        if (hasProcessedRef.current) return;

        if (
          videoRef.current &&
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
          canvasRef.current
        ) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data && !hasProcessedRef.current) {
              handleRawQrPayload(code.data);
              return;
            }
          }
        }
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrame();
    } catch (err) {
      const error = err as Error;
      console.error("Camera access error:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraState("denied");
        setErrorMessage("Camera permission was denied. Please allow camera access or enter pairing key manually.");
      } else {
        setCameraState("unavailable");
        setErrorMessage("Camera is unavailable or in use by another application.");
      }
    }
  }, [handleRawQrPayload]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  const handleScanAgain = () => {
    hasProcessedRef.current = false;
    startCamera();
  };

  const isConnecting = cameraState === "connecting" || isLoading;

  return (
    <div className="flex flex-col items-center gap-4 font-sans">
      {/* Hidden frame buffer canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm">
        {/* Camera Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${cameraState === "active" ? "block" : "hidden"}`}
        />

        {/* Viewfinder Overlay: four corner brackets */}
        {cameraState === "active" && (
          <div className="pointer-events-none absolute inset-8">
            <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white" />
            <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white" />
          </div>
        )}

        {/* Camera Initializing */}
        {cameraState === "initializing" && (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-slate-300">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            <p className="m-0 text-[13px]">Accessing camera...</p>
          </div>
        )}

        {/* Connecting / Authenticating Overlay (No Raw QR Payload displayed!) */}
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 p-6 text-center text-white">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
            <div>
              <p className="m-0 text-sm font-medium text-white">Connecting companion device...</p>
              <p className="m-0 mt-1 text-xs text-slate-400">Please wait while we securely link this device.</p>
            </div>
          </div>
        )}

        {/* Camera Denied / Unavailable */}
        {(cameraState === "denied" || cameraState === "unavailable") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 p-5 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </span>
            <p className="m-0 text-sm font-medium text-slate-900">Camera unavailable</p>
            <p className="m-0 text-xs leading-relaxed text-slate-500">{errorMessage}</p>
          </div>
        )}

        {/* Invalid QR Error */}
        {cameraState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 p-5 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="m-0 text-sm font-medium text-slate-900">Invalid QR code</p>
              <p className="m-0 mt-1 text-xs leading-relaxed text-slate-500">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={handleScanAgain}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Scan Again
            </button>
          </div>
        )}
      </div>

      <p className="m-0 text-center text-xs text-slate-500">
        Open Settings → Companion devices on your primary device and point this camera at the QR code.
      </p>

      {/* Fallback button to Enter Key */}
      <button
        type="button"
        onClick={onFallbackToKey}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Key className="h-3.5 w-3.5" />
        Can't scan? Enter Pairing Key Instead
      </button>
    </div>
  );
};
