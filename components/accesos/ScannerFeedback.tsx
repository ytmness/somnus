"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (
        window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      )();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (isOpen && result && audioContextRef.current) {
      playSound(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, result]);

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

    switch (scanResult) {
      case "SUCCESS":
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case "ALREADY_USED":
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;

      case "INVALID":
      case "CANCELLED":
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + i * 0.15 + 0.1
          );
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
          accent: "text-emerald-400",
          ring: "ring-emerald-500/40",
          title: "Acceso concedido",
        };
      case "ALREADY_USED":
        return {
          icon: XCircle,
          accent: "text-red-400",
          ring: "ring-red-500/40",
          title: "Boleto ya usado",
        };
      case "CANCELLED":
        return {
          icon: Ban,
          accent: "text-red-400",
          ring: "ring-red-500/40",
          title: "Boleto cancelado",
        };
      case "INVALID":
        return {
          icon: AlertTriangle,
          accent: "text-amber-400",
          ring: "ring-amber-500/40",
          title: "QR inválido",
        };
      default:
        return {
          icon: AlertTriangle,
          accent: "text-white/50",
          ring: "ring-white/20",
          title: "Escaneando…",
        };
    }
  };

  const config = getResultConfig();
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-md bg-[#0c0c0c] border border-white/12 text-white ring-2",
          config.ring
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
            <Icon className={cn("h-7 w-7 shrink-0", config.accent)} aria-hidden />
            <span className={config.accent}>{config.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-base text-white/85 leading-relaxed">{message}</p>

          {ticketInfo && (
            <div className="space-y-2.5 border-t border-white/10 pt-4 text-sm">
              {ticketInfo.ticketNumber && (
                <Row label="Folio" value={ticketInfo.ticketNumber} bold />
              )}
              {ticketInfo.event && <Row label="Evento" value={ticketInfo.event} />}
              {ticketInfo.artist && <Row label="Artista" value={ticketInfo.artist} />}
              {ticketInfo.ticketType && (
                <Row label="Zona" value={ticketInfo.ticketType} />
              )}
              {ticketInfo.buyer && <Row label="Comprador" value={ticketInfo.buyer} />}
              {ticketInfo.scannedAt && result === "ALREADY_USED" && (
                <Row
                  label="Escaneado"
                  value={new Date(ticketInfo.scannedAt).toLocaleString("es-MX")}
                />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-colors",
              result === "SUCCESS"
                ? "bg-white text-black hover:bg-white/90"
                : "border border-white/20 text-white hover:bg-white/10"
            )}
          >
            {result === "SUCCESS" ? "Continuar" : "Cerrar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/45 shrink-0">{label}</span>
      <span
        className={cn(
          "text-right text-white/90",
          bold && "font-semibold tabular-nums"
        )}
      >
        {value}
      </span>
    </div>
  );
}
