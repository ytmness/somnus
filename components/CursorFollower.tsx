"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const TRAIL_LENGTH = 28;
const MAX_PARTICLES = 60;

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};

export function CursorFollower() {
  const [pos, setPos] = useState({ x: -50, y: -50 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef(0);
  const rafRef = useRef<number>(0);

  const lastSpawnRef = useRef(0);
  const spawnParticles = useCallback((x: number, y: number) => {
    const now = performance.now();
    if (now - lastSpawnRef.current < 25) return;
    lastSpawnRef.current = now;

    const newParticles: Particle[] = [];
    const count = Math.random() > 0.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.6;
      newParticles.push({
        id: nextIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1 + Math.random() * 0.8,
        size: 1.5 + Math.random() * 2.5,
        hue: 195 + Math.random() * 50,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles].slice(-MAX_PARTICLES);
    setParticles([...particlesRef.current]);
  }, []);

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
      spawnParticles(e.clientX, e.clientY);
    };

    const handleLeave = () => {
      setVisible(false);
      trailRef.current = [];
      setTrail([]);
      particlesRef.current = [];
      setParticles([]);
    };

    window.addEventListener("mousemove", handleMove);
    document.documentElement.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
    };
  }, [spawnParticles]);

  useEffect(() => {
    if (!visible) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.95,
            vy: p.vy * 0.95,
            life: p.life - 0.018,
          }))
          .filter((p) => p.life > 0);
        setParticles([...particlesRef.current]);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

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
      {/* Partículas tipo bengala - estela luminosa */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-[9997] hidden md:block rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            transform: "translate(-50%, -50%)",
            opacity: p.life / p.maxLife,
            background: `radial-gradient(circle, hsla(${p.hue}, 80%, 75%, 0.9) 0%, hsla(${p.hue}, 70%, 60%, 0.4) 50%, transparent 70%)`,
            boxShadow: `0 0 ${p.size * 3}px hsla(${p.hue}, 100%, 80%, 0.6), 0 0 ${p.size * 6}px hsla(${p.hue}, 80%, 70%, 0.3)`,
          }}
        />
      ))}
      {/* Trail - rastro más largo que desaparece gradualmente */}
      {trail.slice(1).map((p, i) => {
        const progress = i / (trail.length - 1);
        const opacity = Math.max(0.08, 0.6 - progress * 0.55);
        const size = Math.max(2, 5 - progress * 2.5);
        return (
          <div
            key={i}
            className="pointer-events-none fixed z-[9998] hidden md:block rounded-full bg-white/80"
            style={{
              left: p.x,
              top: p.y,
              width: size,
              height: size,
              transform: "translate(-50%, -50%)",
              opacity,
              boxShadow: "0 0 8px rgba(255,255,255,0.4), 0 0 16px rgba(147,197,253,0.2)",
            }}
          />
        );
      })}
      {/* Cursor principal */}
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
