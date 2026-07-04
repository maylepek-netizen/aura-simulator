"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigate } from "../TransitionProvider";
import { loadExperienceDraft, loadProfile } from "@/lib/experienceStorage";
import { saveSimulation } from "@/lib/simulationStorage";
import { saveSimulationToSupabase } from "@/lib/supabase";
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

const SOUND_MAP: Record<string, string> = {
  crowd: "/sounds/mall.wav",
  children: "/sounds/classroom.wav",
  storm: "/sounds/storm.wav",
  alarm: "/sounds/alarm.mp3",
  restaurant: "/sounds/resturant.wav",
  transport: "/sounds/train.wav",
  nature: "/sounds/nature.wav",
  party: "/sounds/party.wav",
  classroom: "/sounds/classroom.wav",
  street: "/sounds/street.m4a",
  hospital: "/sounds/hospital.m4a",
  home: "/sounds/home.m4a",
  supermarket: "/sounds/supermarket.m4a",
  office: "/sounds/office.m4a",
  beach: "/sounds/beach.m4a",
  construction: "/sounds/construction.m4a",
  library: "/sounds/library.m4a",
  sports: "/sounds/sports.wav",
  airport: "/sounds/airport.m4a",
  cafe: "/sounds/cafe.m4a",
  nightclub: "/sounds/nightclub.m4a",
  traffic: "/sounds/highway.m4a",
  park: "/sounds/birds.m4a",
  baby: "/sounds/baby.m4a",
  dogs: "/sounds/dogs.m4a",
  forest: "/sounds/forest.m4a",
  rain: "/sounds/rain.m4a",
};

const AMBIENT_FALLBACK = "/sounds/mall.wav";

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

// ─── Processing Metrics (loading screen) ─────────────────────────────────────

const PROC_METRICS_NEW = [
  { key: "NEURAL LOAD",    color: "#FFC99D" },
  { key: "SENSORY INPUT",  color: "#BCC2FF" },
  { key: "SOCIAL MAPPING", color: "#FFC1BB" },
  { key: "THREAT LEVEL",   color: "rgba(255,255,255,0.7)" },
] as const;

const FLOATING_THOUGHTS = [
  "Processing sensory input...",
  "Mapping neural pathways...",
  "Calibrating threat response...",
  "Reading the room...",
  "Too many signals at once...",
  "Filtering background noise...",
  "Encoding emotional context...",
  "Simulating perception...",
];

function ProcessingMetrics({ visible }: { visible: boolean }) {
  const [vals, setVals] = useState<number[]>([67, 89, 41, 58]);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [thoughtOpacity, setThoughtOpacity] = useState(1);
  const [thoughtPos, setThoughtPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      setVals([
        Math.round(40 + Math.random() * 55),
        Math.round(50 + Math.random() * 45),
        Math.round(20 + Math.random() * 70),
        Math.round(50 + 45 * Math.sin(frame / 10)),
      ]);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cycle = () => {
      setThoughtOpacity(0);
      setTimeout(() => {
        setThoughtIndex(prev => (prev + 1) % FLOATING_THOUGHTS.length);
        setThoughtPos({ x: 15 + Math.random() * 60, y: 70 + Math.random() * 20 });
        setThoughtOpacity(1);
      }, 700);
    };
    const timer = setInterval(cycle, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, opacity: visible ? 1 : 0, transition: "opacity 1.5s ease", pointerEvents: visible ? "auto" : "none", zIndex: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
        @keyframes loading-breathe { 0%,100%{opacity:0.35} 50%{opacity:0.65} }
      `}</style>
      <video src="https://res.cloudinary.com/duhsqezo3/video/upload/v1782673643/good_video_o7ktrf.mp4"
        autoPlay loop muted playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px) brightness(0.6)", transform: "scale(1.05)" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: `${thoughtPos.x}%`, top: `${thoughtPos.y}%`, opacity: thoughtOpacity * 0.45, transition: "opacity 0.7s ease", pointerEvents: "none", zIndex: 3 }}>
        <span style={{ fontFamily: "'Amiri', serif", fontStyle: "italic", fontSize: "clamp(0.9rem, 1.4vw, 1.15rem)", color: "white", whiteSpace: "nowrap" }}>{FLOATING_THOUGHTS[thoughtIndex]}</span>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, zIndex: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 280 }}>
          {PROC_METRICS_NEW.map((m, i) => (
            <div key={m.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{m.key}</span>
                <span style={{ fontSize: 9, color: m.color, fontFamily: "var(--font-body)", opacity: 0.85 }}>{Math.round(vals[i])}%</span>
              </div>
              <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}>
                <div style={{ height: "100%", width: `${vals[i]}%`, background: m.color, transition: "width 0.7s ease", borderRadius: 1, opacity: 0.75 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 7, letterSpacing: "0.3em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>AURA SIMULATION ENGINE v2.5</div>
      </div>
    </div>
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
      fontSize: 11, lineHeight: 1.75, color: "rgba(255,255,255,0.55)",
      fontStyle: "italic", margin: 0,
      opacity, transition: "opacity 0.6s ease",
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

  const [audioPlaying, setAudioPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [heartbeatPlaying, setHeartbeatPlaying] = useState(false);

  const [stimmingPaused] = useState(false);
  const [stimmingActive, setStimmingActive] = useState(false);

  const [videoVisible, setVideoVisible] = useState(false);
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

  // Timed reveal sequence
  useEffect(() => {
    if (!result) return;
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    const load = result.overall_load ?? 0;

    const t5 = setTimeout(() => { setPanelsVisible(true); }, 10000);

    const t15 = setTimeout(() => {
      if (!ambientEngineRef.current) {
        ambientEngineRef.current = new AmbientSoundEngine();
      }
      const auditoryText = result.sensory_channels?.auditory?.toLowerCase() ?? "";
      const auditoryType: AuditoryType =
        auditoryText.includes("scream") || auditoryText.includes("shout") ? "scream"
        : auditoryText.includes("crowd") || auditoryText.includes("people") ? "crowd"
        : auditoryText.includes("machine") || auditoryText.includes("buzz") || auditoryText.includes("hum") ? "machine"
        : "default";
      ambientEngineRef.current.start(load, auditoryType);
      setAmbientPlaying(true);
      setHeartbeatPlaying(true);
    }, 15000);

    const t30 = setTimeout(() => { setStimmingActive(true); }, 30000);

    revealTimersRef.current = [t5, t15, t30];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result !== null]);

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

  // Ambient sound
  useEffect(() => {
    if (!result?.ambient_sound) return;
    const category = result.ambient_sound.toLowerCase().trim();
    const url = SOUND_MAP[category] ?? Object.entries(SOUND_MAP).find(([key]) => category.includes(key))?.[1] ?? AMBIENT_FALLBACK;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.min(0.75, 0.55 + (result.overall_load / 100) * 0.2);
    ambientAudioRef.current = audio;
    audio.play().catch(() => {
      document.addEventListener("click", () => audio.play().catch(() => {}), { once: true });
    });
    return () => { ambientAudioRef.current?.pause(); ambientAudioRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.ambient_sound]);

  // Narration at T=20s
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      if (!narrationStartedRef.current) {
        narrationStartedRef.current = true;
        void startNarration(result);
      }
    }, 20000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Video fade-in
  useEffect(() => {
    if (videoUrl) {
      setProcessingVisible(false);
      const t = setTimeout(() => { setVideoVisible(true); }, 50);
      return () => clearTimeout(t);
    } else {
      setVideoVisible(false);
      setProcessingVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrationStartedRef = useRef(false);
  const [videoLoopOpacity, setVideoLoopOpacity] = useState(1);
  const [eyelidsClosed, setEyelidsClosed] = useState(false);

  const handleVideoPlay = useCallback(() => {}, []);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const remaining = el.duration - el.currentTime;
    if (remaining <= 1.5) setVideoLoopOpacity(0.7);
    else if (el.currentTime < 0.5) setVideoLoopOpacity(1);

    // Eyelid blink at the loop point: close just before the video ends,
    // reopen right after it loops back to the start.
    if (remaining <= 0.6) setEyelidsClosed(true);
    else if (el.currentTime < 0.3) setEyelidsClosed(false);
  }, []);

  async function startNarration(r: SimulationResult) {
    if (audioPlaying) return;
    const text = r.monologue.join(". ");
    setAudioPlaying(true);
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
      el.onended = () => { ttsAudioRef.current = null; setAudioPlaying(false); };
      el.onerror = () => { ttsAudioRef.current = null; setAudioPlaying(false); };
      await el.play();
    } catch {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US"; utt.rate = 0.85; utt.pitch = 0.9;
      utt.onend = () => setAudioPlaying(false);
      utt.onerror = () => setAudioPlaying(false);
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
    if (audioPlaying) { stopNarration(); return; }
    void startNarration(result);
  }

  function toggleAmbient() {
    if (ambientPlaying) {
      ambientAudioRef.current?.pause();
      setAmbientPlaying(false);
    } else {
      ambientAudioRef.current?.play().catch(() => {});
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
      emotional_landscape: Array.isArray(result.emotional_landscape) ? result.emotional_landscape.join(", ") : "",
      soundscape: result.soundscape ?? "",
      objective: result.objective ?? "",
      visual_effect: result.visual_effect ?? "",
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
        emotional_landscape: Array.isArray(result.emotional_landscape) ? result.emotional_landscape.join(", ") : "",
        soundscape: result.soundscape ?? "",
        objective: result.objective ?? "",
        visual_effect: result.visual_effect ?? "",
      });
    }

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

    setFadingOut(true);
    setTimeout(() => navigate("/summary"), 1500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0d0a08", opacity: fadingOut ? 0 : 1, transition: "opacity 1.5s ease-in-out" }}>
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
        {videoUrl && (
          <video ref={videoRef}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: videoVisible ? videoLoopOpacity : 0,
              transform: "scale(1.06)",
              transition: "opacity 1s",
              animation: videoVisible
                ? `materialize 3.5s cubic-bezier(0.4,0,0.2,1) forwards${stimmingAnimation !== "none" ? `, ${stimmingAnimation}` : ""}`
                : stimmingAnimation,
            }}
            src={videoUrl} autoPlay loop playsInline
            onPlay={handleVideoPlay} onTimeUpdate={handleTimeUpdate}
          />
        )}
        {/* Eyelid blink overlay — top and bottom close to meet in the middle at the loop point */}
        {videoUrl && (
          <>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0,
              height: eyelidsClosed ? "45%" : "0%",
              background: "#000000", zIndex: 4, pointerEvents: "none",
              transition: "height 0.4s ease-in-out",
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: eyelidsClosed ? "45%" : "0%",
              background: "#000000", zIndex: 4, pointerEvents: "none",
              transition: "height 0.4s ease-in-out",
            }} />
          </>
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
        <ProcessingMetrics visible={processingVisible} />
        {error && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 3 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Error</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "0 32px" }}>{error}</p>
            <button type="button" onClick={() => void runSimulation()} style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "8px 16px", color: "rgba(255,255,255,0.6)", background: "transparent", cursor: "pointer" }}>Retry</button>
          </div>
        )}
        {/* Screen vignette */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 25%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.85) 100%)", zIndex: 1 }} />
      </div>

      {/* ── LEFT DATA PANEL (280px) ───────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 10, ...panelBgLeft, display: "flex", flexDirection: "column", opacity: panelsVisible ? 1 : 0, transition: "opacity 0.8s ease" }}>

        {/* Nav buttons */}
        <div style={{ padding: "14px 16px 12px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className="nav-btn" onClick={() => navigate("/")} style={{ flex: 1, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
            Home
          </button>
          <button type="button" className="nav-btn" onClick={() => navigate("/chat")} style={{ flex: 1, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
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
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0 }}>{result.sensory_channels.auditory}</p>
            </div>
          )}

          {/* Social Anxiety */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0 }}>{result.masking_cost}</p>
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
                <p key={i} style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.45)", margin: "0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10 }}>{a}</p>
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
            <button type="button" onClick={handleSave} style={{ marginTop: 10, width: "100%", height: 30, borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: saved ? "rgba(134,239,172,0.1)" : "transparent", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: saved ? "rgba(134,239,172,0.8)" : "rgba(255,255,255,0.4)", cursor: saved ? "default" : "pointer" }}>
              {saved ? "Saved ✓" : "Save Simulation"}
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT CONTROL PANEL (280px) ──────────────────────── */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, zIndex: 10, ...panelBgRight, display: "flex", flexDirection: "column", opacity: panelsVisible ? 1 : 0, transition: "opacity 0.8s ease" }}>

        <div className="result-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

          {/* Simulation Bank button */}
          <button type="button" onClick={() => navigate("/bank")} style={{ width: "100%", height: 36, borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer", marginBottom: 20 }} className="sound-btn">
            <img src="/icons/bank.svg" alt="" style={{ width: 16, opacity: 0.6 }} />
            Simulation Bank
          </button>

          {/* Sound controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <Tooltip text="Hear the narrator's inner thoughts">
              <button type="button" onClick={toggleNarration} style={{ width: "100%", height: 44, borderRadius: 6, border: `1px solid ${audioPlaying ? "rgba(188,194,255,0.5)" : "rgba(255,255,255,0.14)"}`, background: audioPlaying ? "rgba(188,194,255,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: audioPlaying ? "#BCC2FF" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
                <img src="/icons/brain.svg" alt="" style={{ width: 16, flexShrink: 0 }} />
                Inner thoughts Sound
                {audioPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#BCC2FF", animation: "pulse-dot 1s infinite" }} />}
              </button>
            </Tooltip>
            <Tooltip text="Environmental sounds from the scene">
              <button type="button" onClick={toggleAmbient} style={{ width: "100%", height: 44, borderRadius: 6, border: `1px solid ${ambientPlaying ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.14)"}`, background: ambientPlaying ? "rgba(255,201,157,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: ambientPlaying ? "#FFC99D" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
                <img src="/icons/ear.svg" alt="" style={{ width: 14, flexShrink: 0, opacity: ambientPlaying ? 1 : 0.6 }} />
                Environment Sound
                {ambientPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FFC99D", animation: "pulse-dot 1s infinite" }} />}
              </button>
            </Tooltip>
            <Tooltip text="Simulated heartbeat matching sensory load">
              <button type="button" onClick={toggleHeartbeat} style={{ width: "100%", height: 44, borderRadius: 6, border: `1px solid ${heartbeatPlaying ? "rgba(255,193,187,0.5)" : "rgba(255,255,255,0.14)"}`, background: heartbeatPlaying ? "rgba(255,193,187,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.6)", cursor: "pointer" }} className="sound-btn">
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
                <LiveMetricBar label="Sensory Load" value={liveLoad} color={loadColor} tooltip="How overwhelmed the senses are right now" />
                <LiveMetricBar label="Anxiety" value={liveAnxiety} color="#e08c5c" tooltip="Physiological and social anxiety level" />
                <LiveMetricBar label="Overstimulation" value={liveMasking} color="#BCC2FF" tooltip="Total sensory overload accumulation" />
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
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", margin: 0 }}>{result.masking_cost}</p>
            </div>
          )}

          {/* Second section repeated per screenshot */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", margin: 0 }}>{result.sensory_channels.visual}</p>
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
          <button type="button" className="stop-btn" onClick={handleEndSimulation} style={{ width: "100%", height: 44, borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", cursor: "pointer" }}>
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
