"use client";

import { useEffect, useState } from "react";

export function CursorFollower() {
  const [pos, setPos] = useState({ x: -50, y: -50 });
  const [smoothPos, setSmoothPos] = useState({ x: -50, y: -50 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const handleLeave = () => setVisible(false);

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

  // Smooth follow con requestAnimationFrame
  useEffect(() => {
    if (!visible) return;

    let rafId: number;
    const smoothness = 0.15;

    const animate = () => {
      setSmoothPos((prev) => ({
        x: prev.x + (pos.x - prev.x) * smoothness,
        y: prev.y + (pos.y - prev.y) * smoothness,
      }));
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [pos, visible]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-[9999] hidden md:block"
      style={{
        left: smoothPos.x,
        top: smoothPos.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Anillo que sigue con suavidad */}
      <div
        className="relative h-8 w-8 rounded-full border-2 border-white/40 bg-white/[0.02]"
        style={{ boxShadow: "0 0 20px rgba(255,255,255,0.1)" }}
      >
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      </div>
    </div>
  );
}
