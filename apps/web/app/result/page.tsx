"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigate } from "../TransitionProvider";
import { loadExperienceDraft, loadProfile } from "@/lib/experienceStorage";
import { saveSimulation } from "@/lib/simulationStorage";
import { saveSimulationToSupabase } from "@/lib/supabase";
import { SOUND_MAP, AMBIENT_FALLBACK } from "@/lib/soundMap";
import { CITATIONS } from "@/lib/researchCitations";

declare global {
  interface Window { backgroundMusic: HTMLAudioElement; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SensoryScores = {
  auditory: number;
  visual: number;
  tactile: number;
  social: number;
};

type SimulationResult = {
  sensory_scores: SensoryScores;
  overall_load: number;
  visual_effect: "glitch_heavy" | "glitch_medium" | "glitch_light" | "calm";
  scene_caption: string;
  unsplash_query?: string;
  video_prompt?: string;
  monologue: string[];
  sensory_channels: {
    auditory: string;
    visual: string;
    tactile: string;
    interoception: string;
  };
  emotions: string[];
  coping_actions: string[];
  masking_cost: string;
  research_tags: string[];
  ambient_sound?: string;
  imageBase64?: string;
  emotional_landscape?: string[];
  soundscape?: string;
  objective?: string;
};

// ─── Ambient Sound Map ────────────────────────────────────────────────────────
// Shared with the explore playback — see lib/soundMap.ts (single source of truth).

type AuditoryType = "scream" | "crowd" | "machine" | "default";

class AmbientSoundEngine {
  private ctx: AudioContext;
  private nodes: AudioNode[] = [];
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private breathTimeout: ReturnType<typeof setTimeout> | null = null;
  private ambientTimeout: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor() {
    this.ctx = new AudioContext();
  }

  private bpmForLoad(load: number) {
    if (load < 40) return 60;
    if (load <= 70) return 90;
    return 130;
  }

  private breathPeriodForLoad(load: number) {
    if (load < 40) return 4000;
    if (load <= 70) return 2500;
    return 1500;
  }

  private playHeartbeat(load: number) {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    this.beatPulse(now, 0.9);
    this.beatPulse(now + 0.12, 0.55);
    const bpm = this.bpmForLoad(load);
    const interval = (60 / bpm) * 1000;
    this.heartbeatTimeout = setTimeout(() => this.playHeartbeat(load), interval);
  }

  private beatPulse(when: number, gain: number) {
    gain = gain * 1.4;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 80;
    filter.Q.value = 8;
    osc.type = "sine";
    osc.frequency.setValueAtTime(55, when);
    osc.frequency.exponentialRampToValueAtTime(30, when + 0.08);
    gainNode.gain.setValueAtTime(0, when);
    gainNode.gain.linearRampToValueAtTime(gain, when + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + 0.2);
    this.nodes.push(osc, gainNode, filter);
  }

  private playBreath(load: number, inhale: boolean) {
    if (!this.running) return;
    const period = this.breathPeriodForLoad(load);
    const duration = (period / 2) / 1000;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = inhale ? 800 : 600;
    filter.Q.value = 0.8;
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + duration * 0.3);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(now);
    this.nodes.push(source, filter, gainNode);
    this.breathTimeout = setTimeout(() => this.playBreath(load, !inhale), period / 2);
  }

  private makeBrownNoiseSource(seconds: number): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private makePinkNoiseSource(seconds: number): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private ambientNodes: AudioNode[] = [];

  private startCrowdAmbient(load: number) {
    const vol = Math.min(0.25, 0.12 + (load / 100) * 0.13);
    const brownSrc = this.makeBrownNoiseSource(4);
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 2 + Math.random() * 6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.04;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = vol;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    brownSrc.connect(lowpass);
    lowpass.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    brownSrc.start();
    lfo.start();
    this.ambientNodes.push(brownSrc, lowpass, lfo, lfoGain, masterGain);
  }

  private startScreamAmbient(load: number) {
    const vol = Math.min(0.25, 0.12 + (load / 100) * 0.13);
    const pinkSrc = this.makePinkNoiseSource(3);
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 2500;
    highpass.Q.value = 1.5;
    const lfo = this.ctx.createOscillator();
    lfo.type = "sawtooth";
    lfo.frequency.value = load > 70 ? 1.8 : 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = vol * 0.6;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = vol * 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    pinkSrc.connect(highpass);
    highpass.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    pinkSrc.start();
    lfo.start();
    this.ambientNodes.push(pinkSrc, highpass, lfo, lfoGain, masterGain);
  }

  private startMachineAmbient(load: number) {
    const vol = Math.min(0.22, 0.10 + (load / 100) * 0.12);
    const brownSrc = this.makeBrownNoiseSource(4);
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 200;
    lowpass.Q.value = 2;
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = load > 70 ? 3 : 1.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = vol;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    brownSrc.connect(lowpass);
    lowpass.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    brownSrc.start();
    lfo.start();
    this.ambientNodes.push(brownSrc, lowpass, lfo, lfoGain, masterGain);
  }

  private startQuietAmbient(load: number) {
    const vol = Math.min(0.18, 0.08 + (load / 100) * 0.1);
    const pinkSrc = this.makePinkNoiseSource(5);
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 400;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = vol;
    pinkSrc.connect(lowpass);
    lowpass.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    pinkSrc.start();
    this.ambientNodes.push(pinkSrc, lowpass, masterGain);
  }

  private startAmbientSoundscape(auditoryType: AuditoryType, load: number) {
    if (auditoryType === "crowd") this.startCrowdAmbient(load);
    else if (auditoryType === "scream") this.startScreamAmbient(load);
    else if (auditoryType === "machine") this.startMachineAmbient(load);
    else this.startQuietAmbient(load);
  }

  private stopAmbientNodes() {
    for (const n of this.ambientNodes) {
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
    }
    this.ambientNodes = [];
  }

  start(load: number, auditoryType: AuditoryType = "default") {
    if (this.running) return;
    this.running = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.playHeartbeat(load);
    this.playBreath(load, true);
    this.startAmbientSoundscape(auditoryType, load);
  }

  // Heartbeat ONLY — used to start the heartbeat immediately, before the
  // breath/soundscape layers (which come in later via startAmbient).
  startHeartbeat(load: number) {
    if (this.running) return;
    this.running = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.playHeartbeat(load);
  }

  // Breath + soundscape layers — started after the heartbeat is already going.
  // Assumes the engine is already running (from startHeartbeat).
  startAmbient(load: number, auditoryType: AuditoryType = "default") {
    if (!this.running) {
      this.running = true;
      if (this.ctx.state === "suspended") this.ctx.resume();
    }
    this.playBreath(load, true);
    this.startAmbientSoundscape(auditoryType, load);
  }

  // Silence only the breath + soundscape layers, leaving the heartbeat running.
  // Used by the Environment Sound toggle so muting ambient doesn't kill the pulse.
  stopAmbientLayers() {
    if (this.breathTimeout) clearTimeout(this.breathTimeout);
    this.breathTimeout = null;
    if (this.ambientTimeout) clearTimeout(this.ambientTimeout);
    this.ambientTimeout = null;
    this.stopAmbientNodes();
  }

  stop() {
    this.running = false;
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    if (this.breathTimeout) clearTimeout(this.breathTimeout);
    if (this.ambientTimeout) clearTimeout(this.ambientTimeout);
    this.heartbeatTimeout = null;
    this.breathTimeout = null;
    this.ambientTimeout = null;
    this.stopAmbientNodes();
    try { this.ctx.suspend(); } catch {}
  }

  destroy() {
    this.stop();
    try { this.ctx.close(); } catch {}
  }
}

// ─── Loading Ritual (meditative loading screen) ──────────────────────────────
// One continuous, living animation — a planet slowly orbiting, breathing, glowing.
// The ring fills continuously (never in quarter-jumps); the colour morphs smoothly
// through the four brand tones; the halo breathes, a highlight orbits, particles
// drift, the pupil pulses — nothing ever freezes. The sequence runs on its OWN
// timeline (independent of the video): it completes, holds Ivory ~5s, then calls
// onComplete so the parent can fade it out even if the video isn't ready yet.

const LOADING_STAGES = [
  { label: ["COLLECTING", "MEMORIES"],        color: "#F4C79B", message: "Collecting memories..." },        // Peach
  { label: ["SENSORY", "INPUT"],              color: "#B7B8F6", message: "Filtering sensory input..." },     // Periwinkle
  { label: ["MAPPING", "SOCIAL SIGNALS"],     color: "#F7B6B6", message: "Mapping social signals..." },      // Blush
  { label: ["PREPARING", "SIMULATION"],       color: "#FAFAFA", message: "Preparing your simulation..." },   // Ivory
] as const;

const FILL_DURATION = 22000; // ms for the ring to fill fully across all 4 stages (continuous)
const FINAL_HOLD    = 5000;  // ms to hold the completed Ivory state before fading out

// linear-interpolate two hex colours
function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// colour at a continuous progress 0→1 across the 4 stage colours
function colorAt(p: number): string {
  const n = LOADING_STAGES.length - 1;      // 3 segments between 4 colours
  const x = Math.min(0.9999, Math.max(0, p)) * n;
  const i = Math.floor(x);
  return lerpHex(LOADING_STAGES[i].color, LOADING_STAGES[i + 1].color, x - i);
}

// The animated loading eye + living halo ring, extracted so it can be reused at
// different sizes. `size` scales the whole thing; `progress` (0→1) drives the
// ring arc and colour; when no progress is supplied the ring endlessly cycles
// on its own so the smaller instance (in GenerationBlob) still looks alive.
// Everything below is lifted verbatim from the ProcessingMetrics centrepiece,
// only parameterised by size.
function LoadingEye({ size, progress, color }: { size: number; progress: number; color: string }) {
  const CX = size / 2, CY = size / 2;
  const R = size * 0.393;               // ring radius (118/300 of the original)
  const C = 2 * Math.PI * R;            // circumference
  const filled = C * progress;
  const ringColor = color;
  const eyeW = size * 0.493, eyeH = size * 0.373;  // 148x112 at size 300

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes aura-bloom { 0%,100%{ transform: scale(0.94); opacity: 0.5; } 50%{ transform: scale(1.06); opacity: 0.78; } }
        @keyframes aura-pupil-breathe { 0%,100%{ transform: scale(0.97); } 50%{ transform: scale(1.02); } }
        @keyframes aura-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes aura-orbit { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes aura-drift { 0%,100%{ transform: translate(0,0); opacity: 0.15; } 50%{ transform: translate(var(--dx,4px), var(--dy,-6px)); opacity: 0.5; } }
      `}</style>

      {/* Layer 1 — soft breathing bloom */}
      <div aria-hidden style={{
        position: "absolute", width: size * 0.92, height: size * 0.92, borderRadius: "50%",
        background: `radial-gradient(circle, ${ringColor}40 0%, ${ringColor}18 35%, transparent 70%)`,
        filter: `blur(${size * 0.1}px)`,
        animation: "aura-bloom 10s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Layer 1 — drifting particles around the ring */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const rr = R + (i % 3 - 1) * (size * 0.033);
        const px = CX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr;
        return (
          <div key={i} aria-hidden style={{
            position: "absolute", left: px, top: py, width: 2.5, height: 2.5, borderRadius: "50%",
            background: ringColor,
            ["--dx" as string]: `${(i % 2 ? 5 : -5)}px`,
            ["--dy" as string]: `${(i % 3 ? -6 : 6)}px`,
            animation: `aura-drift ${7 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
            filter: `drop-shadow(0 0 3px ${ringColor})`,
            pointerEvents: "none",
          }} />
        );
      })}

      {/* Layer 2 — halo ring: faint spinning track + progress arc + orbiting highlight */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: "aura-ring-spin 60s linear infinite" }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} strokeDasharray="1 7" />
        </g>
        <circle
          cx={CX} cy={CY} r={R} fill="none"
          stroke={ringColor} strokeWidth={2} strokeLinecap="round"
          strokeDasharray={`${filled} ${C}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ filter: `drop-shadow(0 0 5px ${ringColor}) drop-shadow(0 0 13px ${ringColor}66)` }}
        />
        <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: "aura-orbit 14s linear infinite" }}>
          <circle cx={CX + R} cy={CY} r={3} fill={ringColor} style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }} />
        </g>
      </svg>

      {/* Layer 3 — the Aura eye. Outline white; pupil fills with the morphing colour. */}
      <svg width={eyeW} height={eyeH} viewBox="0 0 673 689" style={{ position: "relative", zIndex: 2, overflow: "visible" }}>
        <defs>
          <clipPath id={`pupil-clip-${size}`}>
            <path d="M331.442 281.553C364.296 279.016 393.138 303.908 396.222 337.576L396.29 338.373C398.977 372.457 374.274 402.223 341.185 405.142C307.849 408.083 278.404 382.71 275.691 348.379C272.977 314.04 298.07 284.132 331.442 281.553Z" />
          </clipPath>
          <radialGradient id={`pupil-fill-${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="1" />
            <stop offset="70%" stopColor={ringColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={ringColor} stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <g clipPath={`url(#pupil-clip-${size})`}>
          <circle cx={336} cy={343} r={70} fill={`url(#pupil-fill-${size})`}
            style={{ transformOrigin: "336px 343px", animation: "aura-pupil-breathe 4s ease-in-out infinite" }} />
        </g>
        <path d="M327.838 242.867C361.418 239.711 395.557 252.014 426.288 271.923C456.213 291.311 482.616 317.731 501.685 343.375C497.532 349.248 491.61 356.766 487.208 361.831L487.206 361.833C448.524 406.376 403.963 439.815 344.35 444.958C309.742 447.817 275.869 435.677 245.667 415.861C216.175 396.51 190.4 369.975 171.207 343.504C173.622 339.804 176.42 336.284 179.362 332.75L180.852 330.971C219.899 284.572 266.286 248.403 327.824 242.868L327.838 242.867Z" fill="none" stroke="#ffffff" strokeWidth={7} strokeOpacity={0.85} />
        <path d="M331.442 281.553C364.296 279.016 393.138 303.908 396.222 337.576L396.29 338.373C398.977 372.457 374.274 402.223 341.185 405.142C307.849 408.083 278.404 382.71 275.691 348.379C272.977 314.04 298.07 284.132 331.442 281.553Z" fill="none" stroke="#ffffff" strokeWidth={7} strokeOpacity={0.85} />
      </svg>
    </div>
  );
}

function ProcessingMetrics({ visible, onComplete }: { visible: boolean; onComplete: () => void }) {
  const [progress, setProgress] = useState(0); // 0 → 1, continuous ring fill
  const [finishing, setFinishing] = useState(false);
  const completedRef = useRef(false);

  // Drive the fill continuously with requestAnimationFrame (frame-by-frame, never jumps).
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / FILL_DURATION);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(loop);
      } else if (!completedRef.current) {
        // ring is full + eye reaches Ivory — hold, then signal completion
        setFinishing(true);
        completedRef.current = true;
        setTimeout(() => onComplete(), FINAL_HOLD);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived, continuously-changing values
  const stage = Math.min(LOADING_STAGES.length - 1, Math.round(progress * (LOADING_STAGES.length - 1)));
  const active = LOADING_STAGES[stage];
  const eyeColor = finishing ? "#FAFAFA" : colorAt(progress);

  return (
    <div style={{
      position: "fixed", inset: 0,
      opacity: visible ? 1 : 0,
      transition: "opacity 1.1s ease",
      pointerEvents: visible ? "auto" : "none",
      background: "#0d0a08",
      zIndex: 20,
    }}>
      <style>{`
        @keyframes aura-node-pulse { 0%,100%{ transform: scale(1); opacity: 0.9; } 50%{ transform: scale(1.5); opacity: 0.5; } }
        @keyframes aura-msg-fade { 0%{ opacity: 0; transform: translateY(3px); } 100%{ opacity: 0.7; transform: translateY(0); } }
        @keyframes aura-bloom { 0%,100%{ transform: scale(0.94); opacity: 0.5; } 50%{ transform: scale(1.06); opacity: 0.78; } }
        @keyframes aura-pupil-breathe { 0%,100%{ transform: scale(0.97); } 50%{ transform: scale(1.02); } }
        /* the halo ring slowly, endlessly rotates — never frozen */
        @keyframes aura-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* a highlight orbits the ring, the opposite way, for a living shimmer */
        @keyframes aura-orbit { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        /* soft drifting particles */
        @keyframes aura-drift { 0%,100%{ transform: translate(0,0); opacity: 0.15; } 50%{ transform: translate(var(--dx,4px), var(--dy,-6px)); opacity: 0.5; } }
      `}</style>

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 56,
      }}>

        {/* Eye + living halo ring — the ritual centerpiece (extracted component) */}
        <LoadingEye size={300} progress={progress} color={eyeColor} />

        {/* Progress line + 4 nodes */}
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: "100%", height: 10, display: "flex", alignItems: "center" }}>
            {/* base line */}
            <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.12)" }} />
            {/* progress fill line — continuous, driven frame-by-frame */}
            <div style={{
              position: "absolute", left: 0, height: 1,
              width: `${progress * 100}%`,
              background: eyeColor, opacity: 0.5,
            }} />
            {/* nodes — active glows + pulses, completed keep a faint glow, inactive muted */}
            <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "space-between" }}>
              {LOADING_STAGES.map((st, i) => {
                const isDone = i < stage || (finishing && i === stage);
                const isActive = i === stage && !finishing;
                return (
                  <div key={i} style={{ position: "relative", width: 10, height: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: (isDone || isActive) ? st.color : "rgba(255,255,255,0.2)",
                      boxShadow: isActive ? `0 0 8px ${st.color}` : isDone ? `0 0 4px ${st.color}66` : "none",
                      transition: "background-color 1.5s ease, box-shadow 1.5s ease",
                      animation: isActive ? "aura-node-pulse 3.6s ease-in-out infinite" : "none",
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* labels under each node */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            {LOADING_STAGES.map((st, i) => {
              const lit = i <= stage;
              return (
                <div key={i} style={{
                  flex: "0 0 auto", textAlign: "center", lineHeight: 1.5,
                  color: i === stage ? st.color : lit ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
                  transition: "color 1.5s ease",
                }}>
                  {st.label.map((line) => (
                    <div key={line} style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: i === stage ? 600 : 400 }}>{line}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status message — one subtle line beneath the progress line, fades per stage */}
        <div key={stage} style={{
          fontSize: 13, letterSpacing: "0.06em",
          color: active.color, opacity: 0.7,
          animation: "aura-msg-fade 1.35s ease forwards",
          textAlign: "center", minHeight: 18,
        }}>
          {active.message}
        </div>
      </div>
    </div>
  );
}

// ─── Generation preview (video "still generating" state) ─────────────────────
// A cinematic, Midjourney/Veo-style preview that fills the video slot until the
// real video arrives. NOT a spinner or placeholder — a living, unresolved image:
// heavily blurred cinematic colour fields (soft purples, blues, warm highlights)
// with bloom, drifting light, film grain, gentle chromatic aberration, breathing
// opacity and a slow blur that sharpens over time but plateaus while still soft
// (never fully clear — the real video resolves the rest). Edges fade to black
// via vignette + edge blur. Two lines of text only; no bars, %, or icons.
//
// Blurred colour blobs of the diffusion field. Purple/blue/warm, not grayscale.
const PREVIEW_BLOBS: React.CSSProperties[] = [
  { top: '2%',  left: '8%',  width: '46%', height: '78%',
    background: 'radial-gradient(ellipse at 50% 45%, rgba(150,110,220,0.55) 0%, rgba(110,80,190,0.22) 45%, transparent 72%)',
    animation: 'prev-driftA 13s ease-in-out infinite' },
  { top: '10%', right: '4%', width: '48%', height: '74%',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(90,140,230,0.5) 0%, rgba(60,100,200,0.2) 48%, transparent 74%)',
    animation: 'prev-driftB 17s ease-in-out infinite' },
  { top: '22%', left: '26%', width: '44%', height: '60%',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(255,180,120,0.42) 0%, rgba(230,150,90,0.16) 50%, transparent 72%)',
    animation: 'prev-driftC 15s ease-in-out infinite' },
  { bottom: '-6%', left: '18%', width: '40%', height: '58%',
    background: 'radial-gradient(ellipse at 50% 40%, rgba(120,90,200,0.4) 0%, transparent 70%)',
    animation: 'prev-driftB 19s ease-in-out infinite reverse' },
  { top: '14%', left: '38%', width: '30%', height: '40%',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(255,225,180,0.4) 0%, rgba(240,190,130,0.14) 55%, transparent 72%)',
    animation: 'prev-driftA 11s ease-in-out infinite reverse' },
  { bottom: '4%', right: '10%', width: '42%', height: '52%',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(160,120,235,0.34) 0%, transparent 70%)',
    animation: 'prev-driftC 16s ease-in-out infinite reverse' },
  { top: '-4%', right: '20%', width: '34%', height: '46%',
    background: 'radial-gradient(ellipse, rgba(110,160,240,0.3) 0%, transparent 68%)',
    animation: 'prev-driftA 14s ease-in-out infinite' },
];

// Bright bloom cores — small, hot points of light that glow through the blur.
const PREVIEW_CORES: React.CSSProperties[] = [
  { top: '40%', left: '30%', width: 90, height: 90,
    background: 'radial-gradient(circle, rgba(255,210,160,0.85) 0%, rgba(255,180,120,0.3) 40%, transparent 70%)' },
  { top: '34%', left: '54%', width: 70, height: 70,
    background: 'radial-gradient(circle, rgba(150,180,255,0.8) 0%, rgba(110,140,240,0.28) 42%, transparent 70%)' },
  { top: '52%', left: '46%', width: 60, height: 60,
    background: 'radial-gradient(circle, rgba(200,160,255,0.7) 0%, transparent 68%)' },
];

const GenerationBlob = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    background: '#000',
    overflow: 'hidden',
  }}>
    <style>{`
      @keyframes prev-driftA {
        0%,100% { transform: translate(0,0) scale(1);      opacity: 0.85; }
        33%     { transform: translate(4%,-3%) scale(1.1); opacity: 1;    }
        66%     { transform: translate(-3%,4%) scale(0.95);opacity: 0.7;  }
      }
      @keyframes prev-driftB {
        0%,100% { transform: translate(0,0) scale(1);       opacity: 0.8;  }
        40%     { transform: translate(-5%,3%) scale(1.12); opacity: 0.98; }
        70%     { transform: translate(3%,-4%) scale(0.92); opacity: 0.65; }
      }
      @keyframes prev-driftC {
        0%,100% { transform: translate(0,0) scale(1);      opacity: 0.7;  }
        45%     { transform: translate(4%,5%) scale(1.14); opacity: 0.95; }
        75%     { transform: translate(-3%,-3%) scale(0.97);opacity: 0.6; }
      }
      /* Slow zoom + breathing on the whole field — feels "alive". */
      @keyframes prev-breathe {
        0%,100% { transform: scale(1);    opacity: 0.92; }
        50%     { transform: scale(1.06); opacity: 1;    }
      }
      /* Blur sharpens over the first ~9s, then PLATEAUS while still soft —
         never fully clear. The real video resolves the rest on crossfade. */
      @keyframes prev-resolve {
        0%   { filter: blur(46px) saturate(1.25) brightness(1.05); }
        70%  { filter: blur(20px) saturate(1.2)  brightness(1.02); }
        100% { filter: blur(17px) saturate(1.2)  brightness(1.02); }
      }
      /* Chromatic-aberration ghosts drift oppositely for a subtle RGB split. */
      @keyframes prev-caberr-r { 0%,100%{ transform: translate(-2px,0);} 50%{ transform: translate(3px,-1px);} }
      @keyframes prev-caberr-b { 0%,100%{ transform: translate(2px,0);}  50%{ transform: translate(-3px,1px);} }
      @keyframes prev-grain    { 0%{transform:translate(0,0)} 20%{transform:translate(-4%,3%)} 40%{transform:translate(3%,-2%)} 60%{transform:translate(-2%,4%)} 80%{transform:translate(4%,-3%)} 100%{transform:translate(0,0)} }
      @keyframes prev-textbreathe { 0%,100%{ opacity:0.55 } 50%{ opacity:0.9 } }
    `}</style>

    {/* The diffusion field — blurred colour blobs that slowly resolve. */}
    <div style={{
      position: 'absolute', inset: 0,
      animation: 'prev-breathe 9s ease-in-out infinite',
    }}>
      <div style={{
        position: 'absolute', inset: '-8%',
        animation: 'prev-resolve 9s ease-out forwards',
      }}>
        {/* Chromatic aberration: same field, offset red & blue ghosts. */}
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', filter: 'hue-rotate(8deg)', opacity: 0.5, animation: 'prev-caberr-r 7s ease-in-out infinite' }}>
          {PREVIEW_BLOBS.map((b, i) => <div key={i} aria-hidden style={{ position: 'absolute', ...b }} />)}
        </div>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', filter: 'hue-rotate(-10deg)', opacity: 0.5, animation: 'prev-caberr-b 7s ease-in-out infinite' }}>
          {PREVIEW_BLOBS.map((b, i) => <div key={i} aria-hidden style={{ position: 'absolute', ...b }} />)}
        </div>
        {/* Main field */}
        {PREVIEW_BLOBS.map((b, i) => <div key={i} aria-hidden style={{ position: 'absolute', ...b }} />)}
        {/* Bright bloom cores */}
        {PREVIEW_CORES.map((c, i) => (
          <div key={i} aria-hidden style={{
            position: 'absolute', borderRadius: '50%', filter: 'blur(8px)',
            animation: `prev-driftA ${9 + i * 2}s ease-in-out ${i * 0.7}s infinite`,
            ...c,
          }} />
        ))}
      </div>
    </div>

    {/* Vignette + edge fade to black (Midjourney-style framed preview). */}
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.55) 72%, #000 100%)',
    }} />
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      boxShadow: 'inset 0 0 120px 60px #000',
    }} />

    {/* Film grain — a faint moving noise layer. */}
    <div aria-hidden style={{
      position: 'absolute', inset: '-20%', pointerEvents: 'none',
      opacity: 0.06, mixBlendMode: 'overlay',
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      animation: 'prev-grain 1.4s steps(4) infinite',
    }} />

    {/* Text — two lines only, no bars/%/icons. Sits above the preview. */}
    <div style={{
      position: 'absolute', bottom: '10%', left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      zIndex: 2, pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: 'Assistant, sans-serif',
        fontSize: 15, letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.82)',
        animation: 'prev-textbreathe 3.4s ease-in-out infinite',
      }}>
        Generating your simulation...
      </div>
      <div style={{
        fontFamily: 'Assistant, sans-serif',
        fontSize: 13, letterSpacing: '0.04em',
        color: 'rgba(255,255,255,0.42)',
      }}>
        Building your experience...
      </div>
    </div>
  </div>
);

// ─── Mobile detection ─────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// ─── Reflection screen ────────────────────────────────────────────────────────
// Shown when the viewer ends the simulation, in place of navigating to /summary.

function ReflectionScreen({ onBank, onNew }: { onBank: () => void; onNew: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, []);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
      `}</style>

      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", background: "#000", zIndex: 70,
        opacity: visible ? 1 : 0, transition: "opacity 1.5s ease-in-out",
      }}>
        {/* Radial gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }} />

        {/* Centered content */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 24px",
          gap: 0,
        }}>
          {/* Italic headline */}
          <h1 style={{
            fontFamily: "'Amiri', serif",
            fontStyle: "italic",
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            color: "#FFC99D",
            margin: "0 0 8px",
            textAlign: "center",
            fontWeight: 400,
            lineHeight: 1.2,
          }}>
            Every perception tells a different story.
          </h1>

          {/* Main statement */}
          <p style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(1.6rem, 3.2vw, 2.6rem)",
            color: "white",
            textAlign: "center",
            lineHeight: 1.35,
            fontWeight: 400,
            margin: "0 0 56px",
            maxWidth: 820,
          }}>
            What you experienced was only one possible<br />interpretation of the world.
          </p>

          {/* Subtitle */}
          <p style={{
            fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            margin: "0 0 64px",
            fontWeight: 400,
          }}>
            Would you like to explore another perspective?
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={onBank}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; }}
              style={{
                background: "#FFC99D",
                color: "#1a0f00",
                border: "none",
                borderRadius: 3,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: 0.8,
                transition: "all 0.2s ease",
              }}
            >
              Simulation Bank
            </button>

            <button
              type="button"
              className="aura-btn"
              onClick={onNew}
              style={{
                background: "transparent",
                color: "white",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 3,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              New Simulation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, padding: "6px 10px", whiteSpace: "nowrap",
          fontSize: 10, letterSpacing: "0.06em", color: "rgba(255,255,255,0.75)",
          pointerEvents: "none", zIndex: 50,
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Cycling monologue ────────────────────────────────────────────────────────

function CyclingMonologue({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (lines.length < 2) return;
    const cycle = () => {
      setOpacity(0);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % lines.length);
        setOpacity(1);
      }, 600);
    };
    const t = setInterval(cycle, 4000);
    return () => clearInterval(t);
  }, [lines.length]);

  if (!lines.length) return null;
  return (
    <p style={{
      fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.88)",
      fontStyle: "italic", margin: 0,
      // Never fade below 0.85 — the cycling cross-fade used to drop text to
      // near-invisible mid-transition, which testers found unreadable.
      opacity: 0.85 + opacity * 0.15,
      transition: "opacity 0.6s ease",
    }}>
      &ldquo;{lines[idx]}&rdquo;
    </p>
  );
}

// ─── Live metric bar ──────────────────────────────────────────────────────────

function LiveMetricBar({ label, value, color, tooltip }: { label: string; value: number; color: string; tooltip: string }) {
  return (
    <Tooltip text={tooltip}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", cursor: "default" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          <span style={{ fontSize: 8, fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.35)" }}>{value}%</span>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width 2s ease", borderRadius: 1 }} />
        </div>
      </div>
    </Tooltip>
  );
}

// ─── Waveform decoration ──────────────────────────────────────────────────────

function WaveformBars({ active }: { active: boolean }) {
  const [heights, setHeights] = useState(() => Array.from({ length: 32 }, () => 12));
  useEffect(() => {
    // Randomize after mount to avoid SSR hydration mismatch
    setHeights(Array.from({ length: 32 }, () => Math.random() * 20 + 4));
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setHeights(Array.from({ length: 32 }, () => Math.random() * 20 + 4));
    }, 150);
    return () => clearInterval(t);
  }, [active]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 28 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: 2, height: h, background: "rgba(255,255,255,0.25)", borderRadius: 1, transition: active ? "height 0.15s ease" : "none" }} />
      ))}
    </div>
  );
}

// ─── Sparkline (stats graph) ──────────────────────────────────────────────────

function Sparkline({ color, label }: { color: string; label: string }) {
  const [pts, setPts] = useState(() => Array.from({ length: 8 }, () => 60));
  useEffect(() => {
    // Randomize after mount to avoid SSR hydration mismatch
    setPts(Array.from({ length: 8 }, () => 30 + Math.random() * 60));
    const t = setInterval(() => {
      setPts(prev => [...prev.slice(1), 30 + Math.random() * 60]);
    }, 2500);
    return () => clearInterval(t);
  }, []);
  const w = 120, h = 36;
  const max = Math.max(...pts), min = Math.min(...pts);
  const range = max - min || 1;
  const toX = (i: number) => (i / (pts.length - 1)) * w;
  const toY = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [reflecting, setReflecting] = useState(false);

  const [snapshot] = useState(() => {
    if (typeof window === "undefined")
      return { name: "", age: 0, gender: "", situation: "", hasProfile: false, hasDraft: false };
    const p = loadProfile();
    const d = loadExperienceDraft();
    return {
      name: p?.name ?? "",
      age: p?.age ?? 0,
      gender: p?.gender ?? "",
      situation: d?.situation ?? "",
      hasProfile: Boolean(p),
      hasDraft: Boolean(d),
    };
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoPaused, setVideoPaused] = useState(false);

  const [panelsVisible, setPanelsVisible] = useState(false);
  const [processingVisible, setProcessingVisible] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false); // loading ritual finished its own timeline

  const [audioPlaying, setAudioPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [heartbeatPlaying, setHeartbeatPlaying] = useState(false);
  // Guards heartbeat+ambient to a single start, after inner thoughts finish.
  const ambientStartedRef = useRef(false);
  // The ambient sound-file effect registers its play() here so it can be
  // triggered on demand (once TTS ends) rather than on a fixed timer.
  const startAmbientFileRef = useRef<(() => void) | null>(null);

  const [stimmingPaused] = useState(false);
  const [stimmingActive, setStimmingActive] = useState(false);

  const [videoVisible, setVideoVisible] = useState(false);
  // Keeps the generation blob mounted through its 0.8s fade-out after the video arrives.
  const [blobMounted, setBlobMounted] = useState(true);
  const revealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const videoPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saved, setSaved] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  // Live animated metric values
  const [liveLoad, setLiveLoad] = useState(0);
  const [liveAnxiety, setLiveAnxiety] = useState(0);
  const [liveSocial, setLiveSocial] = useState(0);
  const [liveMasking, setLiveMasking] = useState(0);

  useEffect(() => {
    return () => {
      ambientEngineRef.current?.destroy();
      ttsAudioRef.current?.pause();
      if (ambientAudioRef.current) { ambientAudioRef.current.pause(); ambientAudioRef.current = null; }
      revealTimersRef.current.forEach(clearTimeout);
      if (videoPollRef.current) clearTimeout(videoPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!snapshot.hasProfile) router.replace("/");
    else if (!snapshot.hasDraft) router.replace("/chat");
  }, [router, snapshot]);

  useEffect(() => {
    if (snapshot.hasProfile && snapshot.hasDraft) {
      void runSimulation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timed reveal of the UI panels/stimming. Audio is NOT started here anymore:
  // the new order is inner-thoughts (TTS) FIRST, and only once it finishes do
  // heartbeat + ambient begin (see startAmbientAndHeartbeat + the narration
  // effect below).
  useEffect(() => {
    if (!result) return;
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];

    const tPanels = setTimeout(() => { setPanelsVisible(true); }, 10000);
    const tStim = setTimeout(() => { setStimmingActive(true); }, 30000);

    revealTimersRef.current = [tPanels, tStim];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result !== null]);

  // Starts heartbeat + synth ambient/breath layers + the ambient sound file,
  // together, AFTER the inner-thoughts narration has finished. Idempotent — the
  // ambientStartedRef guard means calling it more than once is a no-op.
  const startAmbientAndHeartbeat = useCallback(() => {
    if (!result || ambientStartedRef.current) return;
    ambientStartedRef.current = true;

    const load = result.overall_load ?? 0;
    const auditoryText = result.sensory_channels?.auditory?.toLowerCase() ?? "";
    const auditoryType: AuditoryType =
      auditoryText.includes("scream") || auditoryText.includes("shout") ? "scream"
      : auditoryText.includes("crowd") || auditoryText.includes("people") ? "crowd"
      : auditoryText.includes("machine") || auditoryText.includes("buzz") || auditoryText.includes("hum") ? "machine"
      : "default";

    if (!ambientEngineRef.current) {
      ambientEngineRef.current = new AmbientSoundEngine();
    }
    ambientEngineRef.current.startHeartbeat(load);
    setHeartbeatPlaying(true);
    ambientEngineRef.current.startAmbient(load, auditoryType);
    setAmbientPlaying(true);

    // Release the ambient sound-file effect, which waits on this flag.
    startAmbientFileRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Live metric animation — subtle fluctuation every 2.5s
  useEffect(() => {
    if (!result) return;
    const base = result.overall_load;
    const aBase = Math.round((result.sensory_scores.auditory + result.sensory_scores.social) / 2 * 33);
    const sBase = Math.round(result.sensory_scores.social * 33);
    const mBase = Math.min(100, base + 10);
    setLiveLoad(base); setLiveAnxiety(aBase); setLiveSocial(sBase); setLiveMasking(mBase);
    const t = setInterval(() => {
      const jitter = () => Math.round((Math.random() - 0.5) * 8);
      setLiveLoad(Math.max(0, Math.min(100, base + jitter())));
      setLiveAnxiety(Math.max(0, Math.min(100, aBase + jitter())));
      setLiveSocial(Math.max(0, Math.min(100, sBase + jitter())));
      setLiveMasking(Math.max(0, Math.min(100, mBase + jitter())));
    }, 2500);
    return () => clearInterval(t);
  }, [result]);

  // Ambient sound (file) — no longer time-delayed. It is armed here but only
  // actually plays when startAmbientAndHeartbeat calls startAmbientFileRef,
  // which happens after the inner-thoughts narration finishes.
  useEffect(() => {
    if (!result?.ambient_sound) return;
    const category = result.ambient_sound.toLowerCase().trim();
    const url = SOUND_MAP[category] ?? Object.entries(SOUND_MAP).find(([key]) => category.includes(key))?.[1] ?? AMBIENT_FALLBACK;
    const targetVolume = Math.min(0.75, 0.55 + (result.overall_load / 100) * 0.2);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    ambientAudioRef.current = audio;

    let fade: ReturnType<typeof setInterval> | null = null;
    const unblockEvents: Array<keyof DocumentEventMap> = ["click", "touchstart", "keydown", "pointerdown"];
    let unblock: (() => void) | null = null;

    // Reflect real playback state in the UI (the indicator reads ambientPlaying).
    audio.onplay = () => setAmbientPlaying(true);
    audio.onpause = () => setAmbientPlaying(false);

    const fadeIn = () => {
      if (fade) clearInterval(fade);
      fade = setInterval(() => {
        if (!ambientAudioRef.current) { if (fade) clearInterval(fade); return; }
        if (audio.volume < targetVolume - 0.03) {
          audio.volume = Math.min(targetVolume, audio.volume + 0.03);
        } else {
          audio.volume = targetVolume;
          if (fade) clearInterval(fade);
        }
      }, 60);
    };

    const startAmbientFile = () => {
      audio.play().then(fadeIn).catch(() => {
        // Autoplay blocked — retry on the first real user interaction of any kind.
        const retry = () => {
          audio.play().then(fadeIn).catch(() => {});
          unblock?.();
        };
        unblock = () => {
          unblockEvents.forEach((ev) => document.removeEventListener(ev, retry));
          unblock = null;
        };
        unblockEvents.forEach((ev) => document.addEventListener(ev, retry, { once: true }));
      });
    };

    // Arm it: startAmbientAndHeartbeat triggers this once TTS ends. If the
    // narration already finished before this effect ran, fire immediately.
    startAmbientFileRef.current = startAmbientFile;
    if (ambientStartedRef.current) startAmbientFile();

    return () => {
      startAmbientFileRef.current = null;
      if (fade) clearInterval(fade);
      unblock?.();
      audio.onplay = null;
      audio.onpause = null;
      ambientAudioRef.current?.pause();
      ambientAudioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.ambient_sound]);

  // Inner thoughts (narration) FIRST. It leads the audio; heartbeat + ambient
  // only begin once it finishes (via startAmbientAndHeartbeat, called from the
  // TTS onended handler). Short 3s lead-in lets the screen settle before the
  // voice begins — nothing else is audible until then.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      // Don't auto-start if the user already stopped inner thoughts manually.
      if (!narrationStartedRef.current && !userStoppedInnerThoughtsRef.current) {
        narrationStartedRef.current = true;
        void startNarration(result);
      } else if (userStoppedInnerThoughtsRef.current) {
        // User skipped inner thoughts before it began — don't leave the scene
        // silent forever; bring in heartbeat + ambient now.
        startAmbientAndHeartbeat();
      }
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Auto-save every successful simulation once the video is ready.
  // Veo links expire, so we first upload the video to Cloudinary for permanent
  // storage, then persist the PERMANENT url to Supabase (falling back to the
  // temporary proxy url if the upload fails). Playback switches to Cloudinary.
  // Fires without any user action; the `saved` guard prevents duplicates.
  useEffect(() => {
    if (!result || !videoUri || saved) return;
    setSaved(true); // guard immediately so this runs exactly once
    const proxyUrl = "/api/video-proxy?uri=" + encodeURIComponent(videoUri);
    try {
      saveSimulation({ situation: snapshot.situation, name: snapshot.name, age: snapshot.age, gender: snapshot.gender, result, videoUri });
    } catch {}

    (async () => {
      let permanentUrl = proxyUrl;
      try {
        const res = await fetch("/api/upload-to-cloudinary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUri }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          permanentUrl = data.url;
          setVideoUrl(data.url); // switch playback to the permanent Cloudinary url
        } else {
          console.warn("Cloudinary upload failed, keeping proxy url:", data?.error);
        }
      } catch (e) {
        console.warn("Cloudinary upload error, keeping proxy url:", e);
      }

      void saveSimulationToSupabase({
        situation: snapshot.situation,
        video_url: permanentUrl,
        internal_thoughts: Array.isArray(result.monologue) ? result.monologue.join(" | ") : "",
        sensory_load: result.overall_load ?? 0,
        emotional_landscape: Array.isArray(result.emotions) ? result.emotions.join(", ") : (Array.isArray(result.emotional_landscape) ? result.emotional_landscape.join(", ") : ""),
        soundscape: result.soundscape ?? "",
        objective: result.objective ?? "",
        visual_effect: result.visual_effect ?? "",
        ambient_sound: typeof result.ambient_sound === "string" ? result.ambient_sound : "",
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, videoUri, saved]);

  // The loading ritual runs on its OWN timeline (independent of the video).
  // When it finishes (its ~5s Ivory hold done), it dissolves out — even if the
  // video isn't ready yet. Behind it the screen is black; the simulation fades
  // in whenever the video becomes available (which may be before or after).
  useEffect(() => {
    if (loadingDone) setProcessingVisible(false);
  }, [loadingDone]);

  // Reveal the simulation as soon as the video is ready. It sits behind the
  // loading overlay, so if it's ready early it simply waits (unseen) behind the
  // black; if it's ready late, the screen stays black until it arrives.
  useEffect(() => {
    if (videoUrl) setVideoVisible(true);
    else { setVideoVisible(false); setProcessingVisible(true); setLoadingDone(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  // Unmount the generation blob once its fade-out has finished.
  useEffect(() => {
    if (!videoUrl) { setBlobMounted(true); return; }
    // Outlast the 800ms cross-fade before unmounting, so the fade fully plays.
    const t = setTimeout(() => setBlobMounted(false), 900);
    return () => clearTimeout(t);
  }, [videoUrl]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrationStartedRef = useRef(false);
  // Set when the user manually stops inner thoughts — blocks any auto-restart.
  const userStoppedInnerThoughtsRef = useRef(false);
  const [videoLoopOpacity, setVideoLoopOpacity] = useState(1);

  const handleVideoPlay = useCallback(() => {}, []);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const remaining = el.duration - el.currentTime;
    if (remaining <= 1.5) setVideoLoopOpacity(0.7);
    else if (el.currentTime < 0.5) setVideoLoopOpacity(1);
  }, []);

  async function startNarration(r: SimulationResult) {
    if (audioPlaying) return;
    const text = r.monologue.join(". ");
    // NOTE: audioPlaying flips true only when audio actually starts (onplay),
    // not when the request is fired — otherwise the indicator pulses while
    // the TTS fetch is still in flight and nothing is audible yet.
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gender: snapshot.gender }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const { audio, mimeType } = await res.json();
      const src = "data:" + mimeType + ";base64," + audio;
      const el = new Audio(src);
      ttsAudioRef.current = el;
      el.loop = false;
      el.onplay = () => setAudioPlaying(true);
      // When inner thoughts finish, THAT is the cue to bring in heartbeat +
      // ambient. onerror covers a playback failure so the scene never stays
      // silent.
      el.onended = () => { ttsAudioRef.current = null; setAudioPlaying(false); startAmbientAndHeartbeat(); };
      el.onerror = () => { ttsAudioRef.current = null; setAudioPlaying(false); startAmbientAndHeartbeat(); };
      await el.play();
    } catch {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US"; utt.rate = 0.85; utt.pitch = 0.9;
      utt.onstart = () => setAudioPlaying(true);
      utt.onend = () => { setAudioPlaying(false); startAmbientAndHeartbeat(); };
      utt.onerror = () => { setAudioPlaying(false); startAmbientAndHeartbeat(); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    }
  }

  function stopNarration() {
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setAudioPlaying(false);
  }

  async function runSimulation() {
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setVideoUri(null);
    setVideoLoading(false);
    setSaved(false);
    setVideoVisible(false);
    setProcessingVisible(true);
    setPanelsVisible(false);
    setStimmingActive(false);
    setVideoPaused(false);
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    if (videoPollRef.current) { clearTimeout(videoPollRef.current); videoPollRef.current = null; }
    narrationStartedRef.current = false;
    userStoppedInnerThoughtsRef.current = false;
    ambientStartedRef.current = false;
    startAmbientFileRef.current = null;
    stopNarration();
    ambientEngineRef.current?.stop();
    if (ambientAudioRef.current) { ambientAudioRef.current.pause(); ambientAudioRef.current = null; }
    setAmbientPlaying(false);
    setHeartbeatPlaying(false);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: snapshot.name, age: snapshot.age, gender: snapshot.gender, situation: snapshot.situation }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      const data = (await res.json()) as SimulationResult;
      setResult(data);

      setVideoLoading(true);
      // Step 1: start generation, get the operation name back immediately.
      // Step 2: poll /api/video-status every 7s (client-side) until done — this
      // avoids the Vercel Hobby 60s serverless function timeout.
      const onVideoReady = (uri: string) => {
        setVideoUrl("/api/video-proxy?uri=" + encodeURIComponent(uri));
        setVideoUri(uri);
        // Fade out background music as simulation begins
        if (typeof window !== "undefined" && window.backgroundMusic) {
          const fadeOut = setInterval(() => {
            if (window.backgroundMusic && window.backgroundMusic.volume > 0.02) {
              window.backgroundMusic.volume -= 0.02;
            } else {
              clearInterval(fadeOut);
              window.backgroundMusic?.pause();
            }
          }, 100);
        }
      };

      fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt: data.video_prompt || `First-person POV through the eyes of a person in ${snapshot.situation}. Cinematic handheld camera, overexposed fluorescent lighting, tunnel vision effect, photorealistic.`,
            ...(data.imageBase64 ? { imageBase64: data.imageBase64 } : {}),
          }),
      })
        .then(r => r.json())
        .then(start => {
          if (!start.operationName) { setVideoLoading(false); return; }
          const operationName = start.operationName as string;

          // Poll up to ~5 minutes (43 × 7s) before giving up.
          let attempts = 0;
          const MAX_ATTEMPTS = 43;
          const poll = () => {
            attempts++;
            fetch("/api/video-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operationName }),
            })
              .then(r => r.json())
              .then(status => {
                if (status.done && status.uri) {
                  onVideoReady(status.uri);
                  setVideoLoading(false);
                  return;
                }
                if (status.error || attempts >= MAX_ATTEMPTS) {
                  setVideoLoading(false);
                  return;
                }
                videoPollRef.current = setTimeout(poll, 7000);
              })
              .catch(() => {
                if (attempts >= MAX_ATTEMPTS) { setVideoLoading(false); return; }
                videoPollRef.current = setTimeout(poll, 7000);
              });
          };
          videoPollRef.current = setTimeout(poll, 7000);
        })
        .catch(() => setVideoLoading(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function toggleNarration() {
    if (!result) return;
    if (audioPlaying) {
      // Manual stop — remember it so the timed auto-play doesn't restart it.
      // Stopping the voice shouldn't leave the scene silent, so bring in
      // heartbeat + ambient now (it would otherwise wait for onended).
      userStoppedInnerThoughtsRef.current = true;
      stopNarration();
      startAmbientAndHeartbeat();
      return;
    }
    // Manual start clears the flag again.
    userStoppedInnerThoughtsRef.current = false;
    void startNarration(result);
  }

  function toggleAmbient() {
    // Ambient comes from TWO sources: the audio file (ambientAudioRef) and the
    // synth layers inside AmbientSoundEngine. Both must be silenced, or muting
    // leaves the synth ambient still audible.
    const el = ambientAudioRef.current;
    if (ambientPlaying) {
      if (el) { el.pause(); el.muted = true; }
      ambientEngineRef.current?.stopAmbientLayers();
      setAmbientPlaying(false);
    } else {
      if (el) {
        el.muted = false;
        el.play().catch(() => {});
      }
      setAmbientPlaying(true);
    }
  }

  function toggleHeartbeat() {
    if (heartbeatPlaying) {
      ambientEngineRef.current?.stop();
      setHeartbeatPlaying(false);
    } else {
      if (!ambientEngineRef.current) ambientEngineRef.current = new AmbientSoundEngine();
      ambientEngineRef.current.start(result?.overall_load ?? 50);
      setHeartbeatPlaying(true);
    }
  }

  function toggleVideo() {
    const el = videoRef.current;
    if (!el) return;
    if (videoPaused) { el.play().catch(() => {}); setVideoPaused(false); }
    else { el.pause(); setVideoPaused(true); }
  }

  async function handleSave() {
    if (!result || !videoUri || saved) return;
    try {
      saveSimulation({ situation: snapshot.situation, name: snapshot.name, age: snapshot.age, gender: snapshot.gender, result, videoUri });
      setSaved(true);
    } catch {}
    // Also sync to Supabase (non-blocking, does not affect local save)
    void saveSimulationToSupabase({
      situation: snapshot.situation,
      video_url: "/api/video-proxy?uri=" + encodeURIComponent(videoUri),
      internal_thoughts: Array.isArray(result.monologue) ? result.monologue.join(" | ") : "",
      sensory_load: result.overall_load ?? 0,
      emotional_landscape: Array.isArray(result.emotions) ? result.emotions.join(", ") : (Array.isArray(result.emotional_landscape) ? result.emotional_landscape.join(", ") : ""),
      soundscape: result.soundscape ?? "",
      objective: result.objective ?? "",
      visual_effect: result.visual_effect ?? "",
      ambient_sound: typeof result.ambient_sound === "string" ? result.ambient_sound : "",
    });
  }

  if (!snapshot.hasProfile || !snapshot.hasDraft) return null;

  const load = result?.overall_load ?? 0;
  const loadColor = load > 70 ? "#e05c5c" : load > 45 ? "#FFC99D" : "#5ce08c";
  const stimmingAnimation = !stimmingActive ? "none"
    : load > 70 ? "stimming-high 1s ease-in-out infinite"
    : load >= 40 ? "stimming-med 2.5s ease-in-out infinite"
    : "stimming-low 5s ease-in-out infinite";

  const panelBgLeft: React.CSSProperties = {
    background: "radial-gradient(ellipse at left center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 40%, transparent 70%)",
  };
  const panelBgRight: React.CSSProperties = {
    background: "radial-gradient(ellipse at right center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 40%, transparent 70%)",
  };
  const panelBgBottom: React.CSSProperties = {
    background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
  };

  const handleEndSimulation = () => {
    // Auto-save before leaving if not already saved
    if (result && videoUri && !saved) {
      try {
        saveSimulation({ situation: snapshot.situation, name: snapshot.name, age: snapshot.age, gender: snapshot.gender, result, videoUri });
        setSaved(true);
      } catch {}
      // Also sync to Supabase (non-blocking)
      void saveSimulationToSupabase({
        situation: snapshot.situation,
        video_url: "/api/video-proxy?uri=" + encodeURIComponent(videoUri),
        internal_thoughts: Array.isArray(result.monologue) ? result.monologue.join(" | ") : "",
        sensory_load: result.overall_load ?? 0,
        emotional_landscape: Array.isArray(result.emotions) ? result.emotions.join(", ") : (Array.isArray(result.emotional_landscape) ? result.emotional_landscape.join(", ") : ""),
        soundscape: result.soundscape ?? "",
        objective: result.objective ?? "",
        visual_effect: result.visual_effect ?? "",
        ambient_sound: typeof result.ambient_sound === "string" ? result.ambient_sound : "",
      });
    }

    // Stop simulation audio (ambient / heartbeat / narration) before reflecting
    ambientEngineRef.current?.stop();
    setHeartbeatPlaying(false);
    if (ambientAudioRef.current) { ambientAudioRef.current.pause(); ambientAudioRef.current = null; }
    setAmbientPlaying(false);
    stopNarration();

    // Pause the video
    videoRef.current?.pause();
    setVideoPaused(true);

    // Fade background music back in over 3 seconds
    if (typeof window !== "undefined" && window.backgroundMusic) {
      window.backgroundMusic.volume = 0;
      window.backgroundMusic.play().catch(() => {});
      const fadeIn = setInterval(() => {
        if (window.backgroundMusic && window.backgroundMusic.volume < 0.38) {
          window.backgroundMusic.volume += 0.02;
        } else {
          if (window.backgroundMusic) window.backgroundMusic.volume = 0.4;
          clearInterval(fadeIn);
        }
      }, 100);
    }

    // Dissolve to black (0.5s), then show the reflection screen.
    setFadingOut(true);
    setTimeout(() => setReflecting(true), 500);
  };

  if (reflecting) {
    return <ReflectionScreen onBank={() => navigate("/bank")} onNew={() => navigate("/chat")} />;
  }

  // ─── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  // Video pinned to the top, all data sections scrollable below in sans-serif.
  // Eye icon replaces any text logo. The loading ritual still overlays until done.
  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0807", display: "flex", flexDirection: "column" }}>
        {/* Dissolve to black on End Simulation (0.5s) */}
        <div aria-hidden style={{
          position: "fixed", inset: 0, background: "#000",
          opacity: fadingOut ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: fadingOut ? "auto" : "none",
          zIndex: 100,
        }} />

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
          @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
          .result-scroll::-webkit-scrollbar { width: 2px; }
          .result-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius:2px; }
        `}</style>

        {/* Loading ritual overlays everything until it completes */}
        <ProcessingMetrics visible={processingVisible} onComplete={() => setLoadingDone(true)} />

        {/* Video (top) */}
        <div style={{ position: "relative", width: "100%", height: "42vh", flexShrink: 0, background: "#000" }}>
          {/* Generation preview fills the slot until the video buffers, then
              crossfades (800ms) into the real video. */}
          {blobMounted && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              opacity: result && !videoUrl ? 1 : 0,
              transition: "opacity 800ms ease",
              pointerEvents: "none",
            }}>
              <GenerationBlob />
            </div>
          )}
          {videoUrl && (
            <video ref={videoRef} src={videoUrl} autoPlay loop playsInline
              onPlay={handleVideoPlay} onTimeUpdate={handleTimeUpdate}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: videoVisible ? 1 : 0, transition: "opacity 800ms ease" }} />
          )}
          {videoUrl && (
            <>
              <div style={{ position: "absolute", inset: 0, background: `rgba(220,80,80,${load / 800})`, mixBlendMode: "screen", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
            </>
          )}
          {/* Eye icon (replaces text logo) */}
          <div style={{ position: "absolute", top: 12, left: 14, display: "flex", alignItems: "center", gap: 8, zIndex: 5 }}>
            <img src="/icons/New_logo_eye.svg" alt="" style={{ width: 26, opacity: 0.9 }} />
          </div>
          {/* Load pill */}
          {result && (
            <div style={{ position: "absolute", bottom: 12, left: 14, zIndex: 5, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: loadColor }} />
              <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.75)" }}>Load {load}%</span>
            </div>
          )}
          {videoUrl && (
            <button type="button" onClick={toggleVideo} style={{ position: "absolute", bottom: 12, right: 14, zIndex: 5, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {videoPaused
                ? <svg width="11" height="13" viewBox="0 0 12 14" fill="white"><path d="M0 0l12 7-12 7V0z"/></svg>
                : <svg width="11" height="13" viewBox="0 0 12 14" fill="white"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>}
            </button>
          )}
        </div>

        {/* Scrollable info panel (all sections, sans-serif) */}
        <div className="result-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px", fontFamily: "var(--font-body)" }}>
          {snapshot.situation && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,0.82)", margin: "0 0 22px", fontFamily: "var(--font-body)" }}>
              &ldquo;{snapshot.situation}&rdquo;
            </p>
          )}

          {/* Sound toggles */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <button type="button" onClick={toggleNarration} className="sound-btn" style={{ flex: "1 1 44%", height: 40, borderRadius: 3, border: `1px solid ${audioPlaying ? "rgba(188,194,255,0.5)" : "rgba(255,255,255,0.14)"}`, background: audioPlaying ? "rgba(188,194,255,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: audioPlaying ? "#BCC2FF" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
              Inner Thoughts
              {audioPlaying && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#BCC2FF", animation: "pulse-dot 1s infinite" }} />}
            </button>
            <button type="button" onClick={toggleAmbient} className="sound-btn" style={{ flex: "1 1 44%", height: 40, borderRadius: 3, border: `1px solid ${ambientPlaying ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.14)"}`, background: ambientPlaying ? "rgba(255,201,157,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: ambientPlaying ? "#FFC99D" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
              Environment
              {ambientPlaying && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC99D", animation: "pulse-dot 1s infinite" }} />}
            </button>
            <button type="button" onClick={toggleHeartbeat} className="sound-btn" style={{ flex: "1 1 44%", height: 40, borderRadius: 3, border: `1px solid ${heartbeatPlaying ? "rgba(255,193,187,0.5)" : "rgba(255,255,255,0.14)"}`, background: heartbeatPlaying ? "rgba(255,193,187,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
              Heartbeat
              {heartbeatPlaying && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC1BB", animation: "pulse-dot 0.7s infinite" }} />}
            </button>
          </div>

          {result && (
            <>
              <MobileResultSection title="Inner Voices"><CyclingMonologue lines={result.monologue} /></MobileResultSection>

              <MobileResultSection title="Sensory Overload">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <LiveMetricBar label="Sensory Load" value={liveLoad} color="#FFC99D" tooltip="How overwhelmed the senses are right now" />
                  <LiveMetricBar label="Anxiety" value={liveAnxiety} color="#BCC2FF" tooltip="Physiological and social anxiety level" />
                  <LiveMetricBar label="Overstimulation" value={liveMasking} color="#FFC1BB" tooltip="Total sensory overload accumulation" />
                </div>
              </MobileResultSection>

              <MobileResultSection title="Emotions">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.emotions.map((e, i) => (
                    <span key={i} style={{ fontSize: 13, color: "rgba(255,201,157,0.85)", border: "1px solid rgba(255,201,157,0.2)", borderRadius: 4, padding: "4px 11px", fontFamily: "var(--font-body)" }}>{e}</span>
                  ))}
                </div>
              </MobileResultSection>

              <MobileResultSection title="Sensory Channels">
                {Object.entries(result.sensory_channels).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{key}</div>
                    <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "var(--font-body)" }}>{val}</p>
                  </div>
                ))}
              </MobileResultSection>

              <MobileResultSection title="Social Anxiety">
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "var(--font-body)" }}>{result.masking_cost}</p>
              </MobileResultSection>

              <MobileResultSection title="Coping Actions">
                {result.coping_actions.map((a, i) => (
                  <p key={i} style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10, fontFamily: "var(--font-body)" }}>{a}</p>
                ))}
              </MobileResultSection>

              {result.research_tags?.length > 0 && (
                <MobileResultSection title="Research Tags">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.research_tags.map((tag) => (
                      <span key={tag} style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "3px 8px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>{tag}</span>
                    ))}
                  </div>
                </MobileResultSection>
              )}

              <button type="button" onClick={handleEndSimulation} style={{ marginTop: 12, width: "100%", height: 50, borderRadius: 3, border: "none", background: "#FFC99D", opacity: 0.9, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0a0807", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                End Simulation
              </button>
            </>
          )}

          {error && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "24px 0" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>{error}</p>
              <button type="button" onClick={() => void runSimulation()} style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 3, padding: "8px 16px", color: "rgba(255,255,255,0.6)", background: "transparent", cursor: "pointer" }}>Retry</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    // The whole simulator screen is inset by the shared safe area (--gutter) on
    // all four sides, as one block. The `transform` makes this element the
    // containing block for its position:fixed descendants (video + all panels),
    // so they anchor to this inset frame instead of the viewport — the entire UI
    // shrinks inward together, leaving a 40px frame around everything.
    <div style={{
      position: "fixed", inset: "var(--gutter)", overflow: "hidden",
      background: "#0d0a08", borderRadius: 4,
      transform: "translateZ(0)",
    }}>
        {/* Dissolve to black on End Simulation (0.5s) */}
        <div aria-hidden style={{
          position: "fixed", inset: 0, background: "#000",
          opacity: fadingOut ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: fadingOut ? "auto" : "none",
          zIndex: 100,
        }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
        @keyframes stimming-low  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
        @keyframes stimming-med  { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-8px) rotate(0.4deg)} }
        @keyframes stimming-high { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes materialize { 0%{filter:blur(20px) brightness(0.4)} 100%{filter:blur(0px) brightness(1)} }
        .sound-btn { transition: background 0.2s, border-color 0.2s; }
        .sound-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .stop-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .nav-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .result-scroll::-webkit-scrollbar { width: 2px; }
        .result-scroll::-webkit-scrollbar-track { background: transparent; }
        .result-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius:2px; }
      `}</style>

      {/* ── FULLSCREEN VIDEO (center) ─────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "#000000" }}>
        {/* Generation preview — result is ready but the video is still buffering.
            Stays mounted through its 800ms crossfade once the video lands, so the
            preview resolves INTO the video rather than switching abruptly. Text
            (inside GenerationBlob) fades out with it. */}
        {blobMounted && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            opacity: result && !videoUrl ? 1 : 0,
            // 800ms crossfade: the preview dissolves as the video fades up beneath.
            transition: "opacity 800ms ease",
            pointerEvents: "none",
          }}>
            <GenerationBlob />
          </div>
        )}
        {videoUrl && (
          <video ref={videoRef}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: videoVisible ? videoLoopOpacity : 0,
              transform: "scale(1.06)",
              transition: "opacity 800ms ease",
              animation: videoVisible
                ? `materialize 3.5s cubic-bezier(0.4,0,0.2,1) forwards${stimmingAnimation !== "none" ? `, ${stimmingAnimation}` : ""}`
                : stimmingAnimation,
            }}
            src={videoUrl} autoPlay loop playsInline
            onPlay={handleVideoPlay} onTimeUpdate={handleTimeUpdate}
          />
        )}
        {videoUrl && (
          <>
            <div style={{ position: "absolute", inset: 0, background: `rgba(220,80,80,${load / 800})`, transform: `translateX(${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: `rgba(80,130,220,${load / 800})`, transform: `translateX(-${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
          </>
        )}
        {/* Video play/pause overlay button */}
        {videoUrl && (
          <button type="button" onClick={toggleVideo} style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5, backdropFilter: "blur(8px)" }}>
            {videoPaused
              ? <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><path d="M0 0l12 7-12 7V0z"/></svg>
              : <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
            }
          </button>
        )}
        <ProcessingMetrics visible={processingVisible} onComplete={() => setLoadingDone(true)} />
        {error && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 3 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Error</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "0 32px" }}>{error}</p>
            <button type="button" onClick={() => void runSimulation()} style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 3, padding: "8px 16px", color: "rgba(255,255,255,0.6)", background: "transparent", cursor: "pointer" }}>Retry</button>
          </div>
        )}
        {/* Screen vignette */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 25%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.85) 100%)", zIndex: 1 }} />
      </div>

      {/* ── LEFT DATA PANEL (280px) ───────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 10, ...panelBgLeft, display: "flex", flexDirection: "column", opacity: panelsVisible ? 1 : 0, transition: "opacity 0.8s ease" }}>

        {/* Nav buttons */}
        <div style={{ padding: "14px 16px 12px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className="nav-btn" onClick={() => navigate("/")} style={{ flex: 1, height: 32, borderRadius: 3, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            Home
          </button>
          <button type="button" className="nav-btn" onClick={() => navigate("/chat")} style={{ flex: 1, height: 32, borderRadius: 3, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            New Simulation
          </button>
        </div>

        {/* Situation quote */}
        {snapshot.situation && (
          <div style={{ padding: "0 20px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: "'Amiri', serif" }}>
              &ldquo;{snapshot.situation}&rdquo;
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="result-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Current Situation */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Current Situation</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.88)", margin: 0 }}>{result.sensory_channels.auditory}</p>
            </div>
          )}

          {/* Social Anxiety */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.88)", margin: 0 }}>{result.masking_cost}</p>
            </div>
          )}

          {/* Inner Voices — cycling */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Inner Voices</div>
              <CyclingMonologue lines={result.monologue} />
            </div>
          )}

          {/* Emotions */}
          {result && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Emotions</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.emotions.map((e, i) => (
                  <span key={i} style={{ fontSize: 12, letterSpacing: "0.06em", color: "rgba(255,201,157,0.8)", border: "1px solid rgba(255,201,157,0.2)", borderRadius: 4, padding: "3px 10px" }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Coping actions */}
          {result && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Coping Actions</div>
              {result.coping_actions.map((a, i) => (
                <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", margin: "0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10 }}>{a}</p>
              ))}
            </div>
          )}
        </div>

        {/* Bottom waveform + sounds label */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>Sounds Interruption</div>
          <WaveformBars active={ambientPlaying || heartbeatPlaying} />
          {/* save button */}
          {result && videoUri && (
            <button type="button" onClick={handleSave} style={{ marginTop: 10, width: "100%", height: 30, borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", background: saved ? "rgba(134,239,172,0.1)" : "transparent", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: saved ? "rgba(134,239,172,0.8)" : "rgba(255,255,255,0.4)", cursor: saved ? "default" : "pointer" }}>
              {saved ? "Saved ✓" : "Save Simulation"}
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT CONTROL PANEL (280px) ──────────────────────── */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, zIndex: 10, ...panelBgRight, display: "flex", flexDirection: "column", opacity: panelsVisible ? 1 : 0, transition: "opacity 0.8s ease" }}>

        <div className="result-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

          {/* Simulation Bank button */}
          <button type="button" onClick={() => navigate("/bank")} style={{ width: "100%", height: 36, borderRadius: 3, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer", marginBottom: 20 }} className="sound-btn">
            <img src="/icons/bank.svg" alt="" style={{ width: 16, opacity: 0.6 }} />
            Simulation Bank
          </button>

          {/* Sound controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Tooltip text="Hear the narrator's inner thoughts">
              <button type="button" onClick={toggleNarration} style={{ width: "100%", height: 44, borderRadius: 3, border: `1px solid ${audioPlaying ? "rgba(188,194,255,0.5)" : "rgba(255,255,255,0.14)"}`, background: audioPlaying ? "rgba(188,194,255,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: audioPlaying ? "#BCC2FF" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
                <img src="/icons/brain.svg" alt="" style={{ width: 16, flexShrink: 0 }} />
                Inner thoughts Sound
                {audioPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#BCC2FF", animation: "pulse-dot 1s infinite" }} />}
              </button>
            </Tooltip>
            <Tooltip text="Environmental sounds from the scene">
              <button type="button" onClick={toggleAmbient} style={{ width: "100%", height: 44, borderRadius: 3, border: `1px solid ${ambientPlaying ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.14)"}`, background: ambientPlaying ? "rgba(255,201,157,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: ambientPlaying ? "#FFC99D" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: ambientPlaying ? 1 : 0.6 }}>
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 1 2 2h1a2 2 0 0 1 2-2v-3a2 2 0 0 1-2-2H3z"/>
                </svg>
                Environment Sound
                {ambientPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FFC99D", animation: "pulse-dot 1s infinite" }} />}
              </button>
            </Tooltip>
            <Tooltip text="Simulated heartbeat matching sensory load">
              <button type="button" onClick={toggleHeartbeat} style={{ width: "100%", height: 44, borderRadius: 3, border: `1px solid ${heartbeatPlaying ? "rgba(255,193,187,0.5)" : "rgba(255,255,255,0.14)"}`, background: heartbeatPlaying ? "rgba(255,193,187,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 14s-6-4.5-6-8a4 4 0 0 1 6-3.46A4 4 0 0 1 14 6c0 3.5-6 8-6 8z" stroke={heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.4)"} strokeWidth="1.2" fill="none"/>
                </svg>
                Heartbeat Sound
                {heartbeatPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FFC1BB", animation: "pulse-dot 0.7s infinite" }} />}
              </button>
            </Tooltip>
          </div>

          {/* Sensory Overload section */}
          {result && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Sensory Overload</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <LiveMetricBar label="Sensory Load" value={liveLoad} color="#FFC99D" tooltip="How overwhelmed the senses are right now" />
                <LiveMetricBar label="Anxiety" value={liveAnxiety} color="#BCC2FF" tooltip="Physiological and social anxiety level" />
                <LiveMetricBar label="Overstimulation" value={liveMasking} color="#FFC1BB" tooltip="Total sensory overload accumulation" />
              </div>
            </div>
          )}

          {/* Sparkline chart */}
          {result && (
            <div style={{ marginBottom: 20, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Sparkline color="#FFC99D" label="Sensory" />
                <Sparkline color="#BCC2FF" label="Social" />
                <Sparkline color="#FFC1BB" label="Overstimulation" />
              </div>
            </div>
          )}

          {/* Social Anxiety detail */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.88)", margin: 0 }}>{result.masking_cost}</p>
            </div>
          )}

          {/* Second section repeated per screenshot */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.88)", margin: 0 }}>{result.sensory_channels.visual}</p>
            </div>
          )}

          {/* Research tags */}
          {result && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Research Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {result.research_tags.map(tag => (
                  <span key={tag} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "2px 6px", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* End Simulation CTA */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button type="button" onClick={handleEndSimulation}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 20px rgba(255,201,157,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.boxShadow = "none"; }}
            style={{ width: "100%", height: 44, borderRadius: 3, border: "none", background: "#FFC99D", opacity: 0.9, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#0a0807", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s ease, box-shadow 0.2s ease" }}>
            End Simulation
          </button>
        </div>
      </div>

      {/* Bottom timeline bar */}
      {result && (
        <div style={{ position: "fixed", bottom: 0, left: 280, right: 280, height: 56, zIndex: 10, ...panelBgBottom, display: "flex", alignItems: "center", gap: 32, padding: "0 28px", opacity: panelsVisible ? 1 : 0, transition: "opacity 0.8s ease" }}>
          <Tooltip text="Time elapsed in simulation">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Timeline</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-body)" }}>1.3 / 5.00</span>
            </div>
          </Tooltip>
          <Tooltip text="Physiological and social anxiety level">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>○ Anxiety</span>
              <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}><div style={{ height: "100%", width: `${liveAnxiety}%`, background: "#e08c5c", transition: "width 2s ease", borderRadius: 1 }} /></div>
            </div>
          </Tooltip>
          <Tooltip text="How overwhelmed the senses are right now">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>⊕ Sound</span>
              <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}><div style={{ height: "100%", width: `${liveLoad}%`, background: "#BCC2FF", transition: "width 2s ease", borderRadius: 1 }} /></div>
            </div>
          </Tooltip>
          <Tooltip text="The energy spent performing neurotypicality">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>≡ Overstimulation</span>
              <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}><div style={{ height: "100%", width: `${liveMasking}%`, background: "#FFC1BB", transition: "width 2s ease", borderRadius: 1 }} /></div>
            </div>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

function MobileResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10, fontFamily: "var(--font-body)" }}>{title}</div>
      {children}
    </div>
  );
}
