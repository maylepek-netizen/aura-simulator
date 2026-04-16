"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadExperienceDraft, loadProfile } from "@/lib/experienceStorage";
import { CITATIONS } from "@/lib/researchCitations";

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
};

function nowIso() {
  return new Date().toISOString();
}

// ─── Ambient Sound Engine ─────────────────────────────────────────────────────

type AuditoryType = "scream" | "crowd" | "machine" | "default";

function detectAuditoryType(text: string): AuditoryType {
  const t = text.toLowerCase();
  if (/scream|cry|crying|children|shriek|yell/.test(t)) return "scream";
  if (/crowd|people|voices|chatter|noise|murmur|buzz/.test(t)) return "crowd";
  if (/beep|machine|alarm|click|mechanical|buzz|hum/.test(t)) return "machine";
  return "default";
}

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

  // ── Situational ambient soundscapes ──────────────────────────────────────

  // Creates a looping brown noise buffer (low-rumble crowd base)
  private makeBrownNoiseSource(seconds: number): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5; // amplify
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  // Creates a looping pink noise buffer (gentler hiss)
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
    // Brown noise base (crowd rumble)
    const brownSrc = this.makeBrownNoiseSource(4);
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;
    // LFO for crowd amplitude swell (2–8 Hz)
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
    // Pink noise base
    const pinkSrc = this.makePinkNoiseSource(3);
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 2500;
    highpass.Q.value = 1.5;
    // Fast LFO for sharp amplitude bursts
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
    const vol = Math.min(0.25, 0.12 + (load / 100) * 0.13);
    const beepFreq = 800 + Math.random() * 400; // 800–1200 Hz
    const period = load > 70 ? 0.4 : load > 40 ? 0.9 : 1.8;
    // Continuous oscillator gated by an LFO envelope
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = beepFreq;
    const lfo = this.ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 1 / period;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = vol / 2;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = vol / 2;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    osc.connect(masterGain);
    masterGain.connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this.ambientNodes.push(osc, lfo, lfoGain, masterGain);
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

// ─── Environment Sound Engine ────────────────────────────────────────────────

type EnvType = "mall" | "school" | "hospital" | "party" | "transport" | "restaurant" | "default";

function detectEnvType(situation: string): EnvType {
  const s = situation.toLowerCase();
  if (/mall|store|shop|supermarket/.test(s)) return "mall";
  if (/school|class|classroom|children/.test(s)) return "school";
  if (/doctor|hospital|clinic|waiting/.test(s)) return "hospital";
  if (/party|birthday|celebrat/.test(s)) return "party";
  if (/bus|train|transport|metro|subway/.test(s)) return "transport";
  if (/restaurant|cafe|coffee|diner/.test(s)) return "restaurant";
  return "default";
}

class EnvironmentSoundEngine {
  private ctx: AudioContext;
  private nodes: AudioNode[] = [];
  private running = false;

  constructor() {
    this.ctx = new AudioContext();
  }

  private vol(load: number) {
    return Math.min(0.3, 0.15 + (load / 100) * 0.15);
  }

  private makeBrownNoise(seconds: number): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private makePinkNoise(seconds: number): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
      b6 = w * 0.115926;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private addCrowdLayer(v: number, lfoFreq: number) {
    const brown = this.makeBrownNoise(4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1200;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = lfoFreq;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.05;
    const master = this.ctx.createGain();
    master.gain.value = v;
    lfo.connect(lfoG); lfoG.connect(master.gain);
    brown.connect(lp); lp.connect(master); master.connect(this.ctx.destination);
    brown.start(); lfo.start();
    this.nodes.push(brown, lp, lfo, lfoG, master);
  }

  private addBeepLayer(freq: number, period: number, v: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine"; osc.frequency.value = freq;
    const gate = this.ctx.createOscillator();
    gate.type = "square"; gate.frequency.value = 1 / period;
    const gateG = this.ctx.createGain();
    gateG.gain.value = v / 2;
    const master = this.ctx.createGain();
    master.gain.value = v / 2;
    gate.connect(gateG); gateG.connect(master.gain);
    osc.connect(master); master.connect(this.ctx.destination);
    osc.start(); gate.start();
    this.nodes.push(osc, gate, gateG, master);
  }

  private addHumLayer(freq: number, v: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine"; osc.frequency.value = freq;
    const master = this.ctx.createGain();
    master.gain.value = v;
    osc.connect(master); master.connect(this.ctx.destination);
    osc.start();
    this.nodes.push(osc, master);
  }

  private addHighNoise(v: number, lfoFreq: number) {
    const pink = this.makePinkNoise(3);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 2000;
    const lfo = this.ctx.createOscillator();
    lfo.type = "sawtooth"; lfo.frequency.value = lfoFreq;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = v * 0.5;
    const master = this.ctx.createGain();
    master.gain.value = v * 0.5;
    lfo.connect(lfoG); lfoG.connect(master.gain);
    pink.connect(hp); hp.connect(master); master.connect(this.ctx.destination);
    pink.start(); lfo.start();
    this.nodes.push(pink, hp, lfo, lfoG, master);
  }

  private addBassThump(bpm: number, v: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine"; osc.frequency.value = 60;
    const gate = this.ctx.createOscillator();
    gate.type = "square"; gate.frequency.value = bpm / 60;
    const gateG = this.ctx.createGain();
    gateG.gain.value = v / 2;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 120;
    const master = this.ctx.createGain();
    master.gain.value = v / 2;
    gate.connect(gateG); gateG.connect(master.gain);
    osc.connect(lp); lp.connect(master); master.connect(this.ctx.destination);
    osc.start(); gate.start();
    this.nodes.push(osc, gate, gateG, lp, master);
  }

  private addEngineRumble(v: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = 55;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 80;
    // slight wobble
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 6;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 5;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const master = this.ctx.createGain();
    master.gain.value = v;
    osc.connect(lp); lp.connect(master); master.connect(this.ctx.destination);
    osc.start(); lfo.start();
    this.nodes.push(osc, lp, lfo, lfoG, master);
  }

  start(envType: EnvType, load: number) {
    if (this.running) return;
    this.running = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const v = this.vol(load);

    switch (envType) {
      case "mall":
        this.addCrowdLayer(v, 0.8);
        this.addBeepLayer(880, 3.5, v * 0.4);
        break;
      case "school":
        this.addHighNoise(v, 1.2);
        this.addCrowdLayer(v * 0.5, 2.5);
        break;
      case "hospital":
        this.addHumLayer(120, v * 0.6);
        this.addBeepLayer(1000, 2.0, v * 0.3);
        break;
      case "party":
        this.addCrowdLayer(v, 3.0);
        this.addBassThump(120, v);
        break;
      case "transport":
        this.addEngineRumble(v);
        this.addBeepLayer(660, 8.0, v * 0.25);
        break;
      case "restaurant":
        this.addCrowdLayer(v * 0.7, 1.5);
        this.addBeepLayer(1200, 5.0, v * 0.2);
        break;
      default:
        this.addCrowdLayer(v * 0.6, 1.0);
        this.addHumLayer(80, v * 0.3);
    }
  }

  stop() {
    this.running = false;
    for (const n of this.nodes) {
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
    }
    this.nodes = [];
    try { this.ctx.suspend(); } catch {}
  }

  destroy() {
    this.stop();
    try { this.ctx.close(); } catch {}
  }
}

// ─── Animated Meter ───────────────────────────────────────────────────────────

function Meter({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden min-w-[40px]">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[9px] font-mono opacity-50 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function Panel({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-foreground/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-foreground/5 hover:bg-foreground/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-70">{title}</span>
        </div>
        <span className="text-[10px] opacity-40">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-3 py-3">{children}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const iso = useMemo(() => nowIso(), []);

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
  const [loadMsg, setLoadMsg] = useState("Initialising…");
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // Gemini TTS narration
  const [audioPlaying, setAudioPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Ambient sound (heartbeat + breathing + soundscape)
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);

  // Stimming pause
  const [stimmingPaused, setStimmingPaused] = useState(false);

  // Environment sound
  const [envPlaying, setEnvPlaying] = useState(false);
  const envEngineRef = useRef<EnvironmentSoundEngine | null>(null);

  // History save
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      ambientEngineRef.current?.destroy();
      envEngineRef.current?.destroy();
      ttsAudioRef.current?.pause();
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
  }, []);

  // Auto-start narration when video begins playing
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrationStartedRef = useRef(false);

  const handleVideoPlay = useCallback(() => {
    if (narrationStartedRef.current || !result) return;
    narrationStartedRef.current = true;
    void startNarration(result);
  }, [result]);

  async function startNarration(r: SimulationResult) {
    if (audioPlaying) return;
    const text = r.monologue.join(". ");
    try {
      setAudioPlaying(true);
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
      el.onended = () => setAudioPlaying(false);
      el.onerror = () => setAudioPlaying(false);
      await el.play();
    } catch {
      // fallback to Web Speech API
      const utt = new SpeechSynthesisUtterance(r.monologue.join(". "));
      utt.lang = "en-US";
      utt.rate = 0.85;
      utt.pitch = 0.9;
      utt.onend = () => setAudioPlaying(false);
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
    setVideoLoading(false);
    setSaved(false);
    narrationStartedRef.current = false;
    stopNarration();

    const msgs = [
      "Calibrating sensory channels…",
      "Mapping internal state…",
      "Synthesising experience…",
      "Rendering perspective…",
    ];
    let mi = 0;
    setLoadMsg(msgs[0]);
    const ticker = setInterval(() => {
      mi = Math.min(mi + 1, msgs.length - 1);
      setLoadMsg(msgs[mi]);
    }, 1800);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: snapshot.name,
          age: snapshot.age,
          gender: snapshot.gender,
          situation: snapshot.situation,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as SimulationResult;
      setResult(data);

      // Generate video
      setVideoLoading(true);
      fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.video_prompt || `First-person POV through the eyes of a person in ${snapshot.situation}. Cinematic handheld camera, overexposed fluorescent lighting, tunnel vision effect, photorealistic.`,
        }),
      })
        .then((r) => r.json())
        .then((v) => {
          if (v.uri) {
            setVideoUrl("/api/video-proxy?uri=" + encodeURIComponent(v.uri));
            // Save to history
            fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                situation: snapshot.situation,
                name: snapshot.name,
                age: snapshot.age,
                gender: snapshot.gender,
                result: data,
                videoUri: v.uri,
              }),
            })
              .then((r) => r.ok && setSaved(true))
              .catch(() => {});
          }
          setVideoLoading(false);
        })
        .catch(() => setVideoLoading(false));

    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  function toggleNarration() {
    if (!result) return;
    if (audioPlaying) {
      stopNarration();
      return;
    }
    void startNarration(result);
  }

  function toggleAmbient() {
    if (ambientPlaying) {
      ambientEngineRef.current?.stop();
      setAmbientPlaying(false);
      return;
    }
    if (!ambientEngineRef.current) {
      ambientEngineRef.current = new AmbientSoundEngine();
    }
    const auditoryType = detectAuditoryType(result?.sensory_channels?.auditory ?? "");
    ambientEngineRef.current.start(result?.overall_load ?? 0, auditoryType);
    setAmbientPlaying(true);
  }

  function toggleEnv() {
    if (envPlaying) {
      envEngineRef.current?.stop();
      setEnvPlaying(false);
      return;
    }
    if (!envEngineRef.current) {
      envEngineRef.current = new EnvironmentSoundEngine();
    }
    const envType = detectEnvType(snapshot.situation);
    envEngineRef.current.start(envType, result?.overall_load ?? 0);
    setEnvPlaying(true);
  }

  async function downloadVideo() {
    if (!videoUrl) return;
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aura-simulation.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  if (!snapshot.hasProfile || !snapshot.hasDraft) return null;

  const load = result?.overall_load ?? 0;

  const activeStimmingClass = stimmingPaused ? "" :
    load > 80 ? "stimming-intense" :
    load > 65 ? "stimming-gentle" :
    "";
  const hasStimming = load > 65;

  const anxiety = result ? Math.round((result.sensory_scores.auditory + result.sensory_scores.social) / 2 * 33) : 0;
  const socialLoad = result ? Math.round(result.sensory_scores.social * 33) : 0;
  const maskingLoad = result ? Math.min(100, load + 10) : 0;

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <style>{`
        @keyframes stimming-gentle {
          0%   { transform: translateY(0px)  rotate(0deg);     }
          25%  { transform: translateY(4px)  rotate(0.5deg);   }
          50%  { transform: translateY(0px)  rotate(0deg);     }
          75%  { transform: translateY(-4px) rotate(-0.5deg);  }
          100% { transform: translateY(0px)  rotate(0deg);     }
        }
        @keyframes stimming-intense {
          0%   { transform: translateY(0px)   rotate(0deg);    }
          25%  { transform: translateY(10px)  rotate(1.5deg);  }
          50%  { transform: translateY(0px)   rotate(0deg);    }
          75%  { transform: translateY(-10px) rotate(-1.5deg); }
          100% { transform: translateY(0px)   rotate(0deg);    }
        }
        .stimming-gentle  { animation: stimming-gentle  2s   ease-in-out infinite; }
        .stimming-intense { animation: stimming-intense 0.8s ease-in-out infinite; }
      `}</style>

      {/* Corner telemetry */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute left-4 top-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50">
          <div>Aura / simulator</div>
          <div className="opacity-70">t={iso}</div>
        </div>
        <div className="absolute right-4 top-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50 text-right">
          <div>route /result</div>
          <div className="opacity-70">step 3/3</div>
        </div>
        <div className="absolute left-4 bottom-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50">
          <div>case</div>
          <div className="opacity-70">{snapshot.name || "—"}</div>
        </div>
        <div className="absolute right-4 bottom-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50 text-right">
          <div>load</div>
          <div className="opacity-70">{result ? `${load}%` : "—"}</div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full border border-foreground/60" />
          <div className="text-xs tracking-[0.26em] uppercase opacity-80">Aura</div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 max-w-xs truncate">
          {snapshot.situation}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 text-green-400">
              Saved ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 border border-foreground/20 rounded px-3 py-1"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 border border-foreground/20 rounded px-3 py-1"
          >
            New →
          </button>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-6 w-6 rounded-full border border-foreground/20 border-t-foreground/80 animate-spin" />
          <div className="text-[10px] uppercase tracking-[0.22em] opacity-50">{loadMsg}</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <div className="text-[10px] uppercase tracking-[0.22em] opacity-60 mb-2">Error</div>
          <p className="text-sm opacity-60 text-center">{error}</p>
          <button
            type="button"
            onClick={() => void runSimulation()}
            className="text-[10px] uppercase tracking-[0.22em] border border-foreground/20 rounded px-4 py-2 hover:border-foreground/40"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main result */}
      {result && !loading && (
        <div className="flex flex-col flex-1 px-4 pb-8 pt-4 sm:px-6 gap-3">

          {/* Top meters bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1">
            <Meter label="Sensory Load" value={load} color={load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c"} />
            <Meter label="Anxiety" value={anxiety} color="#e08c5c" />
            <Meter label="Social Load" value={socialLoad} color="#8c5ce0" />
            <Meter label="Masking" value={maskingLoad} color="#5c8ce0" />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-3 flex-1">

            {/* LEFT PANEL - Thoughts + Audio controls */}
            <div className="flex flex-col gap-3">
              <Panel title="Internal Monologue" icon="💭">
                <div className="space-y-2">
                  {result.monologue.map((t, i) => (
                    <div key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">
                      {t}
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Narration button (Gemini TTS) */}
              <button
                type="button"
                onClick={toggleNarration}
                className={[
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                  audioPlaying
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-foreground/20 opacity-60 hover:opacity-100",
                ].join(" ")}
              >
                <span className="text-base">{audioPlaying ? "⏹" : "💭"}</span>
                {audioPlaying ? "Stop thoughts" : "Play thoughts"}
              </button>

              {/* Heartbeat + breathing + ambient button */}
              <button
                type="button"
                onClick={toggleAmbient}
                className={[
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                  ambientPlaying
                    ? "border-red-400/60 bg-red-400/10 text-red-300"
                    : "border-foreground/20 opacity-60 hover:opacity-100",
                ].join(" ")}
              >
                <span className={["text-base", ambientPlaying ? "animate-pulse" : ""].join(" ")}>♥</span>
                {ambientPlaying ? "Stop heartbeat" : "Heartbeat"}
              </button>

              {/* Environment sound button */}
              <button
                type="button"
                onClick={toggleEnv}
                className={[
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                  envPlaying
                    ? "border-green-400/60 bg-green-400/10 text-green-300"
                    : "border-foreground/20 opacity-60 hover:opacity-100",
                ].join(" ")}
              >
                <span className={["text-base", envPlaying ? "animate-pulse" : ""].join(" ")}>🌍</span>
                {envPlaying ? "Stop environment" : "Environment"}
              </button>

              {/* Stimming pause button — only visible when stimming is active */}
              {hasStimming && (
                <button
                  type="button"
                  onClick={() => setStimmingPaused((v) => !v)}
                  className={[
                    "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                    stimmingPaused
                      ? "border-foreground/40 opacity-80"
                      : "border-foreground/20 opacity-60 hover:opacity-100",
                  ].join(" ")}
                >
                  <span className="text-base">⟳</span>
                  {stimmingPaused ? "Resume stimming" : "Pause stimming"}
                </button>
              )}

              <Panel title="Coping Actions" icon="🛡" defaultOpen={false}>
                <ul className="space-y-2">
                  {result.coping_actions.map((a, i) => (
                    <li key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">
                      {a}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            {/* CENTER - Video */}
            <div className={["relative rounded-xl overflow-hidden border border-foreground/15 bg-black min-h-[320px] lg:min-h-0", activeStimmingClass].join(" ")}>
              {videoUrl ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onPlay={handleVideoPlay}
                />
              ) : videoLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                  <div className="h-5 w-5 rounded-full border border-white/20 border-t-white/70 animate-spin" />
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 animate-pulse">
                    Generating visual…
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black" />
              )}

              {/* Overlay effects */}
              {videoUrl && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `rgba(220,80,80,${load / 800})`,
                      transform: `translateX(${load / 30}px)`,
                      mixBlendMode: "screen",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `rgba(80,130,220,${load / 800})`,
                      transform: `translateX(-${load / 30}px)`,
                      mixBlendMode: "screen",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)",
                    }}
                  />
                </>
              )}

              {/* Caption */}
              <div
                className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10"
                style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
              >
                <p className="text-xs italic text-white/70 leading-5">{result.scene_caption}</p>
              </div>

              {/* Sensory bar */}
              <div className="absolute top-3 left-3 right-14 z-10 flex items-center gap-2">
                <div className="text-[8px] uppercase tracking-[0.2em] text-white/40 whitespace-nowrap">load</div>
                <div className="flex-1 h-px bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all duration-1000"
                    style={{
                      width: `${load}%`,
                      background: load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c",
                    }}
                  />
                </div>
                <div className="text-[8px] font-mono text-white/40">{load}%</div>
              </div>

              {/* Download button */}
              {videoUrl && (
                <button
                  type="button"
                  onClick={downloadVideo}
                  title="Download video"
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.15em] text-white/60 backdrop-blur-sm hover:border-white/40 hover:text-white/90 transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5" />
                    <path d="M1 10h10" />
                  </svg>
                  MP4
                </button>
              )}
            </div>

            {/* RIGHT PANEL - Sensory + Emotions */}
            <div className="flex flex-col gap-3">
              <Panel title="Sensory Channels" icon="👁">
                <div className="space-y-3">
                  {Object.entries(result.sensory_channels).map(([key, val]) => (
                    <div key={key}>
                      <div className="text-[9px] uppercase tracking-[0.15em] opacity-40 mb-1">{key}</div>
                      <div className="text-[11px] leading-5 opacity-75">{val}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Emotions" icon="💚">
                <ul className="space-y-2">
                  {result.emotions.map((e, i) => (
                    <li key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">
                      {e}
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Masking Cost" icon="🎭" defaultOpen={false}>
                <p className="text-[11px] leading-5 opacity-75 italic">{result.masking_cost}</p>
              </Panel>

              <Panel title="Research Tags" icon="🔬" defaultOpen={false}>
                <div className="flex flex-wrap gap-1">
                  {result.research_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-foreground/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] opacity-60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* Citations */}
          <details className="rounded-lg border border-foreground/10 px-4 py-3">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.2em] opacity-50">
              Research Sources
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CITATIONS.map((c) => (
                <div key={c.id} className="rounded border border-foreground/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-1">
                    [{c.id}] {c.label}
                  </div>
                  <div className="text-[11px] leading-5 opacity-60">{c.excerpt}</div>
                </div>
              ))}
            </div>
          </details>

          {/* Actions */}
          <div className="flex gap-3 justify-between">
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="h-9 rounded border border-foreground/20 px-4 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/40"
            >
              New Situation
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="h-9 rounded bg-foreground px-4 text-[10px] uppercase tracking-[0.2em] text-background hover:opacity-90"
            >
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
