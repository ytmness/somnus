"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode";
import { ScannerFeedback, type ScanResult } from "./ScannerFeedback";
import { Loader2, Camera, CameraOff } from "lucide-react";

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

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setCameraError(null);
      
      // Verificar si estamos en HTTPS o localhost
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setCameraError(
          "⚠️ La cámara requiere HTTPS en dispositivos móviles. Por favor, accede desde https:// o configura SSL en el servidor."
        );
        setIsScanning(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      // Detectar si es móvil para ajustar el tamaño del QR box
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const qrBoxSize = isMobile ? 
        { width: Math.min(250, window.innerWidth - 60), height: Math.min(250, window.innerWidth - 60) } : 
        { width: 250, height: 250 };

      await html5QrCode.start(
        { facingMode: "environment" }, // Cámara trasera en móviles
        {
          fps: 10,
          qrbox: qrBoxSize,
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error al iniciar escáner:", err);
      
      let errorMessage = "No se pudo acceder a la cámara.";
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMessage = "📷 Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "📷 No se encontró ninguna cámara en este dispositivo.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "📷 La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.";
      } else if (err.message) {
        errorMessage = err.message;
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
    // Prevenir escaneos múltiples (rate limiting)
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) {
      return; // Ignorar si pasó menos de 1 segundo
    }
    lastScanTimeRef.current = now;

    // Si ya está procesando, ignorar
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Detener el escáner temporalmente
      await stopScanner();

      // Enviar QR al backend para validación
      const response = await fetch("/api/tickets/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrData: decodedText }),
      });

      const data: ScanResponse = await response.json();

      // Mostrar feedback
      setScanResult(data);
      setShowFeedback(true);

      // Refrescar estadísticas
      if (typeof (window as any).refreshScanStats === "function") {
        (window as any).refreshScanStats();
      }

      // Reiniciar escáner después de 3 segundos (para éxito) o 5 segundos (para error)
      const delay = data.result === "SUCCESS" ? 3000 : 5000;
      setTimeout(() => {
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
      setIsProcessing(false);
      
      // Reiniciar escáner
      setTimeout(() => {
        startScanner();
      }, 3000);
    }
  };

  const onScanFailure = (error: string) => {
    // Ignorar errores de "no QR found" (son normales)
    // Solo loguear errores importantes
    if (!error.includes("NotFoundException")) {
      console.warn("Error de escaneo:", error);
    }
  };

  const handleCloseFeedback = () => {
    setShowFeedback(false);
    if (!isScanning && !isProcessing) {
      startScanner();
    }
  };

  const handleRetry = async () => {
    setCameraError(null);
    await startScanner();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 sm:border-4 border-gray-800">
        {/* Header */}
        <div className="bg-red-600 text-white p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">Escáner de Boletos</h2>
            {isScanning ? (
              <Camera className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            ) : (
              <CameraOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </div>
          <p className="text-xs sm:text-sm opacity-90 mt-1">
            {isProcessing
              ? "Validando boleto..."
              : isScanning
              ? "Apunta la cámara al código QR"
              : "Cámara detenida"}
          </p>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black">
          <div id={qrCodeRegionId} className="w-full min-h-[250px] sm:min-h-[300px]" />

          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2" />
                <p className="font-medium">Validando...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-red-900 bg-opacity-95 flex items-center justify-center p-4 sm:p-6">
              <div className="text-center text-white max-w-sm">
                <CameraOff className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" />
                <p className="font-bold text-base sm:text-lg mb-2">Error de Cámara</p>
                <p className="text-xs sm:text-sm mb-4 leading-relaxed whitespace-pre-line">{cameraError}</p>
                <button
                  onClick={handleRetry}
                  className="bg-white text-red-900 px-4 py-2 sm:px-6 sm:py-2 rounded-lg text-sm sm:text-base font-bold hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 p-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            {isScanning && !isProcessing && (
              <>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-medium">Escáner activo</span>
              </>
            )}
            {isProcessing && (
              <>
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-medium">Procesando...</span>
              </>
            )}
            {!isScanning && !isProcessing && (
              <>
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-700 font-medium">Inactivo</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
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

