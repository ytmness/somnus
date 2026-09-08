"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";

export type AvatarMood = "idle" | "talk" | "think" | "happy";

const PARTY = [
  "#5B8DEF",
  "#22D3EE",
  "#F472B6",
  "#C084FC",
  "#FACC15",
  "#FB7185",
];

const MOTION: Record<
  AvatarMood,
  {
    hop: number;
    sway: number;
    tilt: number;
    squash: number;
    arm: number;
    shake: number;
    tempo: number;
  }
> = {
  idle: { hop: 4.2, sway: 2.4, tilt: 3.6, squash: 0.035, arm: 12, shake: 8, tempo: 0.52 },
  talk: { hop: 5.4, sway: 2.8, tilt: 4.4, squash: 0.045, arm: 18, shake: 14, tempo: 0.72 },
  happy: { hop: 6.2, sway: 3.2, tilt: 5.2, squash: 0.055, arm: 22, shake: 16, tempo: 0.84 },
  think: { hop: 1.1, sway: 0.6, tilt: 2.4, squash: 0.012, arm: 4, shake: 2, tempo: 0.28 },
};

function mixHex(from: string, to: string, amount: number) {
  const a = Number.parseInt(from.slice(1), 16);
  const b = Number.parseInt(to.slice(1), 16);
  const mix = (shift: number) => {
    const start = (a >> shift) & 255;
    const end = (b >> shift) & 255;
    return Math.round(start + (end - start) * amount);
  };
  const r = mix(16);
  const g = mix(8);
  const bl = mix(0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function partyColor(time: number, speed: number) {
  const n = PARTY.length;
  const x = ((time * speed) % n + n) % n;
  const i = Math.floor(x);
  return mixHex(PARTY[i], PARTY[(i + 1) % n], x - i);
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

export function SomnusAvatar({
  mood = "idle",
  size = 120,
  className,
}: {
  mood?: AvatarMood;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bodyFill = `${uid}-body`;
  const straw = `${uid}-straw`;
  const mexico = `${uid}-mx`;
  const blur = `${uid}-blur`;
  const poolBlur = `${uid}-pool`;

  const puppetRef = useRef<SVGGElement>(null);
  const hatRef = useRef<SVGGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const openEyesRef = useRef<SVGGElement>(null);
  const happyEyesRef = useRef<SVGGElement>(null);
  const glowLRef = useRef<SVGEllipseElement>(null);
  const glowRRef = useRef<SVGEllipseElement>(null);
  const fillLRef = useRef<SVGRectElement>(null);
  const fillRRef = useRef<SVGRectElement>(null);
  const poolRef = useRef<SVGEllipseElement>(null);
  const armLRef = useRef<SVGGElement>(null);
  const armRRef = useRef<SVGGElement>(null);
  const maracaLRef = useRef<SVGGElement>(null);
  const maracaRRef = useRef<SVGGElement>(null);
  const droppedRef = useRef<SVGGElement>(null);
  const marksRef = useRef<SVGGElement>(null);
  const bangsRef = useRef<SVGGElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const puppet = puppetRef.current;
    const hat = hatRef.current;
    const eyes = eyesRef.current;
    const openEyes = openEyesRef.current;
    const happyEyes = happyEyesRef.current;
    const glowL = glowLRef.current;
    const glowR = glowRRef.current;
    const fillL = fillLRef.current;
    const fillR = fillRRef.current;
    const pool = poolRef.current;
    const armL = armLRef.current;
    const armR = armRRef.current;
    const maracaL = maracaLRef.current;
    const maracaR = maracaRRef.current;
    const dropped = droppedRef.current;
    const marks = marksRef.current;
    const bangs = bangsRef.current;
    if (
      !puppet ||
      !hat ||
      !eyes ||
      !openEyes ||
      !happyEyes ||
      !glowL ||
      !glowR ||
      !fillL ||
      !fillR ||
      !pool ||
      !armL ||
      !armR ||
      !maracaL ||
      !maracaR ||
      !dropped ||
      !marks ||
      !bangs
    ) {
      return;
    }

    const paint = (color: string, halo = 0.38, lift = 0.5) => {
      fillL.setAttribute("fill", color);
      fillR.setAttribute("fill", color);
      glowL.setAttribute("fill", color);
      glowR.setAttribute("fill", color);
      pool.setAttribute("fill", color);
      glowL.setAttribute("opacity", String(halo));
      glowR.setAttribute("opacity", String(halo));
      pool.setAttribute("opacity", String((0.34 + lift * 0.22) * halo * 1.8));
      const sx = 0.86 + lift * 0.2;
      const sy = 0.78 + lift * 0.28;
      pool.setAttribute(
        "transform",
        `translate(130 224) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-130 -224)`
      );
    };

    if (reduce) {
      paint(PARTY[0], 0.32, 0.5);
      return;
    }

    let frame = 0;
    let last = performance.now();
    let blink = 1;
    let blinking = false;
    let blinkStart = 0;
    let nextBlink = performance.now() + 1400 + Math.random() * 2200;
    const pose = { ...MOTION.idle };
    let thinkAmt = 0;
    let happyAmt = 0;
    let talkAmt = 0;
    let heldAmt = 1;

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const current = moodRef.current;
      const mix = 1 - Math.pow(0.0008, dt);
      const target = MOTION[current];
      pose.hop = lerp(pose.hop, target.hop, mix);
      pose.sway = lerp(pose.sway, target.sway, mix);
      pose.tilt = lerp(pose.tilt, target.tilt, mix);
      pose.squash = lerp(pose.squash, target.squash, mix);
      pose.arm = lerp(pose.arm, target.arm, mix);
      pose.shake = lerp(pose.shake, target.shake, mix);
      pose.tempo = lerp(pose.tempo, target.tempo, mix);

      thinkAmt = lerp(thinkAmt, current === "think" ? 1 : 0, mix);
      happyAmt = lerp(happyAmt, current === "happy" ? 1 : 0, mix);
      talkAmt = lerp(talkAmt, current === "talk" || current === "happy" ? 1 : 0, mix);
      heldAmt = lerp(heldAmt, current === "think" ? 0 : 1, mix);

      const beat = t * 2.05 * pose.tempo;
      const air = Math.abs(Math.sin(beat * Math.PI));
      const land = 1 - air;
      const hop =
        thinkAmt > 0.5
          ? Math.sin(t * 1.05) * pose.hop
          : -pose.hop * air;
      const sway = Math.sin(beat * Math.PI * (thinkAmt > 0.5 ? 0.22 : 0.5)) * pose.sway;
      const tilt =
        thinkAmt > 0.5
          ? 8 + Math.sin(t * 0.85) * pose.tilt
          : Math.sin(beat * Math.PI) * pose.tilt;
      const squash = pose.squash * land;
      const sx = 1 + squash * 0.75;
      const sy = 1 - squash;
      const energy = 0.7 + talkAmt * 0.5 + happyAmt * 0.25 - thinkAmt * 0.25;

      if (!blinking && now >= nextBlink) {
        blinking = true;
        blinkStart = now;
      }
      if (blinking) {
        const p = (now - blinkStart) / (thinkAmt > 0.5 ? 240 : 140);
        if (p >= 1) {
          blinking = false;
          blink = 1;
          nextBlink = now + 1600 + Math.random() * 2800;
        } else if (p < 0.42) {
          blink = 1 - (p / 0.42) * 0.94;
        } else {
          blink = 0.06 + ((p - 0.42) / 0.58) * 0.94;
        }
      }

      puppet.setAttribute(
        "transform",
        `translate(${sway.toFixed(2)} ${hop.toFixed(2)}) rotate(${tilt.toFixed(2)} 130 168) translate(130 212) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-130 -212)`
      );
      hat.setAttribute(
        "transform",
        `rotate(${(tilt * 0.35 + Math.sin(t * 1.4 * pose.tempo + 0.6) * (2.2 + thinkAmt * 3) - 2 - thinkAmt * 6).toFixed(2)} 130 92)`
      );

      const glance = 8 * thinkAmt;
      const eyeX = Math.sin(t * (0.4 + (1 - thinkAmt) * 0.3)) * 2.6 + glance;
      const eyeY = lerp(Math.cos(t * 0.5) * 1.6, -6 + Math.sin(t * 0.7) * 1.2, thinkAmt);
      const eyeSquint = lerp(1, 0.58, thinkAmt);
      eyes.setAttribute(
        "transform",
        `translate(${eyeX.toFixed(2)} ${eyeY.toFixed(2)}) translate(130 154) scale(1 ${(blink * eyeSquint).toFixed(3)}) translate(-130 -154)`
      );
      openEyes.setAttribute("opacity", (1 - happyAmt).toFixed(3));
      happyEyes.setAttribute("opacity", happyAmt.toFixed(3));

      const pump = Math.sin(beat * Math.PI * 2) * pose.arm;
      const thinkFidget = Math.sin(t * 2.2) * 5;
      const leftRot = lerp(-16 + pump, 50 + thinkFidget, thinkAmt);
      const rightRot = lerp(16 - pump, 62 + Math.sin(t * 1.3) * 7, thinkAmt);
      armL.setAttribute("transform", `rotate(${leftRot.toFixed(2)} 54 178)`);
      armR.setAttribute("transform", `rotate(${rightRot.toFixed(2)} 206 178)`);

      const shake = Math.sin(t * 9.4 * pose.tempo) * pose.shake * heldAmt;
      maracaL.setAttribute("transform", `rotate(${shake.toFixed(2)} 0 -6)`);
      maracaR.setAttribute("transform", `rotate(${(-shake * 0.9).toFixed(2)} 0 -6)`);
      maracaL.setAttribute("opacity", heldAmt.toFixed(3));
      maracaR.setAttribute("opacity", heldAmt.toFixed(3));
      dropped.setAttribute("opacity", (1 - heldAmt).toFixed(3));

      const markFloat = Math.sin(t * 2.4) * 4;
      marks.setAttribute("opacity", thinkAmt.toFixed(3));
      marks.setAttribute("transform", `translate(0 ${markFloat.toFixed(2)})`);
      bangs.setAttribute("opacity", (talkAmt * (1 - thinkAmt)).toFixed(3));
      bangs.setAttribute(
        "transform",
        `translate(0 ${(-4 - Math.sin(t * 4.2) * 3).toFixed(2)})`
      );

      const color = partyColor(t, 0.28 * energy);
      const halo = (0.28 + (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.16) * energy;
      paint(color, halo, thinkAmt > 0.5 ? 0.5 : land);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      aria-hidden="true"
      className={cn("somnus-vaiven", `somnus-vaiven--${mood}`, className)}
      height={size}
      overflow="visible"
      viewBox="0 0 260 250"
      width={size}
    >
      <defs>
        <radialGradient cx="34%" cy="28%" id={bodyFill} r="74%">
          <stop offset="0%" stopColor="#2A2A2A" />
          <stop offset="55%" stopColor="#121212" />
          <stop offset="100%" stopColor="#070707" />
        </radialGradient>
        <linearGradient id={straw} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#E2B75A" />
          <stop offset="100%" stopColor="#B07A28" />
        </linearGradient>
        <linearGradient id={mexico} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#006847" />
          <stop offset="33%" stopColor="#006847" />
          <stop offset="33%" stopColor="#F4F7FF" />
          <stop offset="67%" stopColor="#F4F7FF" />
          <stop offset="67%" stopColor="#CE1126" />
          <stop offset="100%" stopColor="#CE1126" />
        </linearGradient>
        <filter id={blur} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={poolBlur} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <ellipse
        cx="130"
        cy="224"
        fill="#5B8DEF"
        filter={`url(#${poolBlur})`}
        opacity="0.42"
        ref={poolRef}
        rx="54"
        ry="14"
      />

      <g opacity="0" ref={droppedRef}>
        <g transform="translate(78 214) rotate(-58)">
          <rect fill={`url(#${straw})`} height="16" rx="3" width="5" x="-2.5" y="0" />
          <ellipse cx="0" cy="-12" fill={`url(#${mexico})`} rx="9" ry="12" />
        </g>
        <g transform="translate(184 214) rotate(62)">
          <rect fill={`url(#${straw})`} height="16" rx="3" width="5" x="-2.5" y="0" />
          <ellipse cx="0" cy="-12" fill={`url(#${mexico})`} rx="9" ry="12" />
        </g>
      </g>

      <g className="somnus-vaiven__puppet" ref={puppetRef}>
        <circle
          cx="130"
          cy="158"
          fill="none"
          r="55.5"
          stroke="#F4F7FF"
          strokeOpacity="0.45"
          strokeWidth="3"
        />
        <circle cx="130" cy="158" fill={`url(#${bodyFill})`} r="54" />
        <ellipse
          cx="112"
          cy="138"
          fill="#F4F7FF"
          opacity="0.1"
          rx="16"
          ry="11"
        />

        <g className="somnus-vaiven__eyes" ref={eyesRef}>
          <g ref={openEyesRef}>
            <Eye
              blurId={blur}
              fillRef={fillLRef}
              glowRef={glowLRef}
              x={103}
            />
            <Eye
              blurId={blur}
              fillRef={fillRRef}
              glowRef={glowRRef}
              x={138}
            />
          </g>
          <g opacity="0" ref={happyEyesRef}>
            <path
              d="M106 150q8 14 18 0"
              fill="none"
              stroke="#F4F7FF"
              strokeLinecap="round"
              strokeWidth="5.5"
            />
            <path
              d="M141 150q8 14 18 0"
              fill="none"
              stroke="#F4F7FF"
              strokeLinecap="round"
              strokeWidth="5.5"
            />
          </g>
        </g>

        <g opacity="0" ref={marksRef}>
          <text fill="#F4F7FF" fontSize="22" fontWeight="700" x="168" y="78">
            ?
          </text>
          <text fill="#FACC15" fontSize="16" fontWeight="700" x="188" y="58">
            ?
          </text>
          <text fill="#F472B6" fontSize="14" fontWeight="700" x="158" y="52">
            ?
          </text>
        </g>
        <g opacity="0" ref={bangsRef}>
          <text fill="#FACC15" fontSize="20" fontWeight="700" x="168" y="72">
            !
          </text>
          <text fill="#22D3EE" fontSize="15" fontWeight="700" x="186" y="56">
            !
          </text>
        </g>

        <g className="somnus-vaiven__hat" ref={hatRef}>
          <ellipse cx="130" cy="114" fill="#8A5A18" rx="88" ry="16" />
          <ellipse cx="130" cy="108" fill={`url(#${straw})`} rx="88" ry="15" />
          <path
            d="M98 108 Q104 52 130 46 Q156 52 162 108 Z"
            fill={`url(#${straw})`}
          />
          <rect fill={`url(#${mexico})`} height="10" rx="3" width="58" x="101" y="94" />
        </g>

        <Arm
          armRef={armLRef}
          bodyFill={bodyFill}
          cx={54}
          cy={178}
          maracaRef={maracaLRef}
          mexico={mexico}
          straw={straw}
        />
        <Arm
          armRef={armRRef}
          bodyFill={bodyFill}
          cx={206}
          cy={178}
          flip
          maracaRef={maracaRRef}
          mexico={mexico}
          straw={straw}
        />
      </g>
    </svg>
  );
}

function Arm({
  armRef,
  maracaRef,
  bodyFill,
  cx,
  cy,
  flip = false,
  mexico,
  straw,
}: {
  armRef: RefObject<SVGGElement | null>;
  maracaRef: RefObject<SVGGElement | null>;
  bodyFill: string;
  cx: number;
  cy: number;
  flip?: boolean;
  mexico: string;
  straw: string;
}) {
  return (
    <g ref={armRef}>
      <g transform={`translate(${cx} ${cy}) scale(${flip ? -1 : 1} 1)`}>
        <circle
          cx="7"
          cy="5"
          fill={`url(#${bodyFill})`}
          r="6"
          stroke="#F4F7FF"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        <circle
          fill={`url(#${bodyFill})`}
          r="13"
          stroke="#F4F7FF"
          strokeOpacity="0.5"
          strokeWidth="2.6"
        />
        <ellipse
          cx="-4"
          cy="-4"
          fill="#F4F7FF"
          opacity="0.18"
          rx="5"
          ry="4"
        />
        <g ref={maracaRef}>
          <rect fill={`url(#${straw})`} height="20" rx="3" width="6" x="-3" y="-26" />
          <ellipse cx="0" cy="-38" fill={`url(#${mexico})`} rx="12" ry="16" />
          <ellipse cx="-3" cy="-43" fill="#F4F7FF" opacity="0.32" rx="5" ry="4" />
        </g>
      </g>
    </g>
  );
}

function Eye({
  x,
  blurId,
  glowRef,
  fillRef,
}: {
  x: number;
  blurId: string;
  glowRef: RefObject<SVGEllipseElement | null>;
  fillRef: RefObject<SVGRectElement | null>;
}) {
  const cx = x + 9.5;
  return (
    <g>
      <ellipse
        cx={cx}
        cy={154}
        fill="#5B8DEF"
        filter={`url(#${blurId})`}
        opacity="0.35"
        ref={glowRef}
        rx="16"
        ry="24"
      />
      <rect
        fill="#5B8DEF"
        height="40"
        ref={fillRef}
        rx="11"
        width="19"
        x={x}
        y={134}
      />
      <ellipse cx={cx} cy={142} fill="#FFFFFF" opacity="0.72" rx="5" ry="4" />
    </g>
  );
}
