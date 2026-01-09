"use client";

import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertTriangle, Ban } from "lucide-react";

export type ScanResult = "SUCCESS" | "ALREADY_USED" | "INVALID" | "CANCELLED";

interface ScanFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScanResult | null;
  message: string;
  ticketInfo?: {
    ticketNumber?: string;
    event?: string;
    buyer?: string;
    scannedAt?: Date | string;
    artist?: string;
    ticketType?: string;
  };
}

export function ScannerFeedback({
  isOpen,
  onClose,
  result,
  message,
  ticketInfo,
}: ScanFeedbackProps) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicializar AudioContext
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Reproducir sonido cuando cambia el resultado
  useEffect(() => {
    if (isOpen && result && audioContextRef.current) {
      playSound(result);
    }
  }, [isOpen, result]);

  // Auto-cerrar después de 3 segundos
  useEffect(() => {
    if (isOpen && result === "SUCCESS") {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, result, onClose]);

  const playSound = (scanResult: ScanResult) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configurar sonido según resultado
    switch (scanResult) {
      case "SUCCESS":
        // Sonido agradable - dos tonos ascendentes
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case "ALREADY_USED":
        // Sonido de error - tono grave prolongado
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;

      case "INVALID":
      case "CANCELLED":
        // Sonido de advertencia - tres tonos cortos
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.1);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.1);
        }
        break;
    }
  };

  const getResultConfig = () => {
    switch (result) {
      case "SUCCESS":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-500",
          title: "✓ Acceso Concedido",
        };
      case "ALREADY_USED":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-500",
          title: "✗ Boleto Ya Usado",
        };
      case "CANCELLED":
        return {
          icon: Ban,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-500",
          title: "✗ Boleto Cancelado",
        };
      case "INVALID":
        return {
          icon: AlertTriangle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-500",
          title: "⚠ QR Inválido",
        };
      default:
        return {
          icon: AlertTriangle,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-500",
          title: "Escaneando...",
        };
    }
  };

  const config = getResultConfig();
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md ${config.bgColor} border-4 ${config.borderColor}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Icon className={`h-8 w-8 ${config.color}`} />
            <span className={config.color}>{config.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-lg font-medium text-gray-900">{message}</p>

          {ticketInfo && (
            <div className="space-y-2 border-t pt-4">
              {ticketInfo.ticketNumber && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Folio:</span>
                  <span className="text-sm font-bold text-gray-900">{ticketInfo.ticketNumber}</span>
                </div>
              )}
              {ticketInfo.event && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Evento:</span>
                  <span className="text-sm font-semibold text-gray-900">{ticketInfo.event}</span>
                </div>
              )}
              {ticketInfo.artist && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Artista:</span>
                  <span className="text-sm font-semibold text-gray-900">{ticketInfo.artist}</span>
                </div>
              )}
              {ticketInfo.ticketType && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Zona:</span>
                  <span className="text-sm font-semibold text-gray-900">{ticketInfo.ticketType}</span>
                </div>
              )}
              {ticketInfo.buyer && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Comprador:</span>
                  <span className="text-sm text-gray-900">{ticketInfo.buyer}</span>
                </div>
              )}
              {ticketInfo.scannedAt && result === "ALREADY_USED" && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Escaneado:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(ticketInfo.scannedAt).toLocaleString("es-MX")}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white ${
              result === "SUCCESS"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {result === "SUCCESS" ? "Continuar" : "Cerrar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

