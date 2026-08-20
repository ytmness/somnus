"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScannerFeedback, type ScanResult } from "./ScannerFeedback";
import { Loader2, Camera, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanResponse {
  success: boolean;
  result: ScanResult;
  message: string;
  ticket?: {
    ticketNumber: string;
    event: string;
    artist?: string;
    venue?: string;
    eventDate?: string;
    ticketType: string;
    category?: string;
    buyer: string;
    buyerEmail?: string;
    tableNumber?: string;
    seatNumber?: number;
    scannedAt?: Date | string;
  };
}

export function QRScanner({ eventId }: { eventId?: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanner = async () => {
    try {
      setCameraError(null);

      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecure && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setCameraError(
          "La cámara requiere HTTPS en dispositivos móviles. Accede desde https://somnus.live"
        );
        setIsScanning(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const size = Math.min(260, window.innerWidth - 80);
      const qrBoxSize = isMobile
        ? { width: size, height: size }
        : { width: 250, height: 250 };

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: qrBoxSize,
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error("Error al iniciar escáner:", err);
      const e = err as { name?: string; message?: string };

      let errorMessage = "No se pudo acceder a la cámara.";

      if (e.name === "NotAllowedError" || e.message?.includes("Permission")) {
        errorMessage =
          "Permiso de cámara denegado. Actívalo en la configuración del navegador.";
      } else if (e.name === "NotFoundError") {
        errorMessage = "No se encontró ninguna cámara en este dispositivo.";
      } else if (e.name === "NotReadableError") {
        errorMessage =
          "La cámara está en uso por otra app. Ciérrala e intenta de nuevo.";
      } else if (e.message) {
        errorMessage = e.message;
      }

      setCameraError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error al detener escáner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) return;
    lastScanTimeRef.current = now;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      await stopScanner();

      const response = await fetch("/api/tickets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: decodedText, eventId }),
      });

      const data: ScanResponse = await response.json();

      setScanResult(data);
      setShowFeedback(true);

      const win = window as Window & { refreshScanStats?: () => void };
      if (typeof win.refreshScanStats === "function") {
        win.refreshScanStats();
      }

      const delay = data.result === "SUCCESS" ? 3000 : 5000;
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
        startScanner();
      }, delay);
    } catch (error) {
      console.error("Error al procesar escaneo:", error);
      setScanResult({
        success: false,
        result: "INVALID",
        message: "Error al procesar el código QR",
      });
      setShowFeedback(true);
      isProcessingRef.current = false;
      setIsProcessing(false);

      setTimeout(() => {
        startScanner();
      }, 3000);
    }
  };

  const onScanFailure = (error: string) => {
    if (!error.includes("NotFoundException")) {
      console.warn("Error de escaneo:", error);
    }
  };

  const handleCloseFeedback = () => {
    setShowFeedback(false);
    if (!isScanning && !isProcessingRef.current) {
      startScanner();
    }
  };

  const handleRetry = async () => {
    setCameraError(null);
    await startScanner();
  };

  const statusLabel = isProcessing
    ? "Validando boleto…"
    : isScanning
      ? "Apunta al código QR"
      : "Cámara detenida";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="liquid-glass overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              Escáner QR
            </h2>
            <p className="text-xs text-white/50 truncate">{statusLabel}</p>
          </div>
          {isScanning ? (
            <Camera className="h-5 w-5 text-emerald-400 shrink-0 animate-pulse" aria-hidden />
          ) : (
            <CameraOff className="h-5 w-5 text-white/40 shrink-0" aria-hidden />
          )}
        </div>

        <div className="relative bg-black somnus-qr-reader">
          <div id={qrCodeRegionId} className="w-full min-h-[260px] sm:min-h-[300px]" />

          {isProcessing && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-white">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2 text-white/80" />
                <p className="text-sm font-medium text-white/80">Validando…</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-[#0A0A0A]/95 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <CameraOff className="h-12 w-12 mx-auto mb-3 text-red-400/80" aria-hidden />
                <p className="font-semibold text-white mb-2">Error de cámara</p>
                <p className="text-sm text-white/60 mb-5 leading-relaxed">
                  {cameraError}
                </p>
                <button type="button" onClick={handleRetry} className="somnus-btn text-sm !py-2.5 !px-6">
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isScanning && !isProcessing && "bg-emerald-400 animate-pulse",
                isProcessing && "bg-amber-400 animate-pulse",
                !isScanning && !isProcessing && "bg-red-400/80"
              )}
              aria-hidden
            />
            <span className="text-white/55">
              {isScanning && !isProcessing && "Escáner activo"}
              {isProcessing && "Procesando"}
              {!isScanning && !isProcessing && "Inactivo"}
            </span>
          </div>
        </div>
      </div>

      <ScannerFeedback
        isOpen={showFeedback}
        onClose={handleCloseFeedback}
        result={scanResult?.result || null}
        message={scanResult?.message || ""}
        ticketInfo={scanResult?.ticket}
      />
    </div>
  );
}
