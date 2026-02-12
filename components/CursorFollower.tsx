"use client";

import { useEffect, useState, useRef } from "react";

const TRAIL_LENGTH = 5;

export function CursorFollower() {
  const [pos, setPos] = useState({ x: -50, y: -50 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [visible, setVisible] = useState(false);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      trailRef.current = [
        { x: e.clientX, y: e.clientY },
        ...trailRef.current.slice(0, TRAIL_LENGTH - 1),
      ];
      setTrail([...trailRef.current]);
    };

    const handleLeave = () => {
      setVisible(false);
      trailRef.current = [];
      setTrail([]);
    };

    window.addEventListener("mousemove", handleMove);
    document.documentElement.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (visible) {
      document.documentElement.classList.add("custom-cursor-active");
    } else {
      document.documentElement.classList.remove("custom-cursor-active");
    }
    return () => document.documentElement.classList.remove("custom-cursor-active");
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Trail - trazado de puntos detrás del cursor */}
      {trail.slice(1).map((p, i) => (
        <div
          key={i}
          className="pointer-events-none fixed z-[9998] hidden md:block rounded-full bg-white/70"
          style={{
            left: p.x,
            top: p.y,
            width: 4,
            height: 4,
            transform: "translate(-50%, -50%)",
            opacity: Math.max(0.15, 0.5 - i * 0.1),
            boxShadow: "0 0 6px rgba(255,255,255,0.3)",
          }}
        />
      ))}
      {/* Cursor principal - instantáneo + pulso sutil */}
      <div
        className="pointer-events-none fixed z-[9999] hidden md:block"
        style={{
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="relative h-6 w-6 rounded-full border-2 border-white/60 bg-transparent"
          style={{
            boxShadow: "0 0 12px rgba(255,255,255,0.25), 0 0 24px rgba(255,255,255,0.1)",
          }}
        >
          <div className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>
    </>
  );
}
