import React, { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  payload: string;
  expiresAt: string;
  onRefresh: () => void;
  isPaired?: boolean;
  pairedDeviceName?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  payload,
  expiresAt,
  onRefresh,
  isPaired = false,
  pairedDeviceName,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1c2419",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR Data URL:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [payload]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
      } else {
        setTimeLeft(diff);
        setIsExpired(false);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (isPaired) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center font-sans">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="m-0 text-[15px] font-semibold text-emerald-900">Companion Device Connected!</h4>
          <p className="m-0 mt-1 text-[13px] text-emerald-700">
            {pairedDeviceName ? `Linked to ${pairedDeviceName}` : "Device linked successfully via QR code."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 font-sans">
      {/* QR Code Image Frame */}
      <div className="relative p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center">
        {isExpired ? (
          <div className="w-48 h-48 flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-lg text-center space-y-3">
            <p className="m-0 text-sm font-medium text-white">QR Code Expired</p>
            <p className="m-0 text-xs text-slate-300">Generate a new short-lived QR code to link your companion device.</p>
            <button
              type="button"
              onClick={onRefresh}
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh QR Code
            </button>
          </div>
        ) : (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Companion Device Pairing QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-slate-100/50 rounded-lg flex flex-col items-center justify-center space-y-2 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-xs font-medium">Generating QR...</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 bg-white border border-slate-300 rounded-lg flex items-center justify-center shadow-xs p-1">
                <Smartphone className="w-5 h-5 text-slate-900" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Status & Timer */}
      <div className="text-center space-y-1">
        {!isExpired && (
          <div className="flex items-center justify-center gap-2 text-[13px] text-slate-700 font-medium">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            <span>Waiting for companion device to scan...</span>
          </div>
        )}

        <div className="text-xs text-slate-500">
          {isExpired ? (
            <span className="text-red-600 font-medium">Expired</span>
          ) : (
            <span>
              Expires in <strong className="text-slate-900 font-semibold">{formatSeconds(timeLeft)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
