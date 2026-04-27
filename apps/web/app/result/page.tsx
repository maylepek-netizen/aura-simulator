"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadExperienceDraft, loadProfile } from "@/lib/experienceStorage";
import { saveSimulation } from "@/lib/simulationStorage";
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
    // Low mechanical hum — brown noise through narrow lowpass, no electronic beeps
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

// ─── Environment Sound Engine ────────────────────────────────────────────────

class EnvironmentSoundEngine {
  private ctx: AudioContext;
  private nodes: AudioNode[] = [];
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  constructor() {
    this.ctx = new AudioContext();
  }

  // Noise buffers — normalized output, no runaway amplification
  private makeNoise(seconds: number, type: "white" | "brown"): AudioBufferSourceNode {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    if (type === "white") {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = Math.max(-1, Math.min(1, last * 14));
      }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  private gain(v: number): GainNode {
    const g = this.ctx.createGain(); g.gain.value = v; return g;
  }

  private connect(...chain: AudioNode[]) {
    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  }

  // Children/screaming: rapid high-pitched noise bursts 2500-4000Hz every 0.3-1s
  private addScreamLayer(vol: number) {
    const fire = () => {
      if (!this.running) return;
      const now = this.ctx.currentTime;
      const dur = 0.06 + Math.random() * 0.12;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 2500 + Math.random() * 1500; bp.Q.value = 3;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      this.connect(src, bp, g, this.ctx.destination);
      src.start(now); src.stop(now + dur + 0.01);
      this.nodes.push(src, bp, g);
      const t = setTimeout(fire, 300 + Math.random() * 700);
      this.timeouts.push(t);
    };
    fire();
  }

  // Alarm/siren: oscillating 800-1200Hz cycling every 0.4s
  private addAlarmLayer(vol: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "square"; osc.frequency.value = 1000;
    // Frequency sweeps between 800 and 1200 with a 2.5Hz LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 2.5;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 200;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const master = this.gain(vol);
    this.connect(osc, master, this.ctx.destination);
    osc.start(); lfo.start();
    this.nodes.push(osc, lfo, lfoG, master);
  }

  // Crowd/mall: brown noise rumble + bandpass voice texture + voice bursts
  private addCrowdLayer(vol: number) {
    const brown = this.makeNoise(4, "brown");
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
    const rumbleG = this.gain(vol);
    this.connect(brown, lp, rumbleG, this.ctx.destination);
    brown.start();
    this.nodes.push(brown, lp, rumbleG);

    const white = this.makeNoise(3, "white");
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.4;
    const midG = this.gain(vol * 0.6);
    this.connect(white, bp, midG, this.ctx.destination);
    white.start();
    this.nodes.push(white, bp, midG);

    // Voice bursts
    const fire = () => {
      if (!this.running) return;
      const now = this.ctx.currentTime;
      const dur = 0.1 + Math.random() * 0.25;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const vbp = this.ctx.createBiquadFilter(); vbp.type = "bandpass"; vbp.frequency.value = 400 + Math.random() * 400; vbp.Q.value = 2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol * 0.7, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      this.connect(src, vbp, g, this.ctx.destination);
      src.start(now); src.stop(now + dur + 0.01);
      this.nodes.push(src, vbp, g);
      const t = setTimeout(fire, 400 + Math.random() * 1200);
      this.timeouts.push(t);
    };
    fire();
  }

  // Party: bass pulse at 120BPM (60Hz) + crowd noise
  private addPartyLayer(vol: number) {
    const bpm = 120;
    const fireBass = () => {
      if (!this.running) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = "sine"; osc.frequency.value = 60;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      this.connect(osc, g, this.ctx.destination);
      osc.start(now); osc.stop(now + 0.3);
      this.nodes.push(osc, g);
      const t = setTimeout(fireBass, (60 / bpm) * 1000);
      this.timeouts.push(t);
    };
    fireBass();
    this.addCrowdLayer(vol * 0.7);
  }

  // Rain: white noise through lowpass
  private addRainLayer(vol: number) {
    const white = this.makeNoise(4, "white");
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4000;
    const master = this.gain(vol);
    this.connect(white, lp, master, this.ctx.destination);
    white.start();
    this.nodes.push(white, lp, master);
  }

  // Classroom: medium crowd murmur + occasional chair scrape
  private addClassroomLayer(vol: number) {
    this.addCrowdLayer(vol * 0.7);
    // Chair scrape: low-mid broadband burst every 8-20s
    const fireScrape = () => {
      if (!this.running) return;
      const now = this.ctx.currentTime;
      const dur = 0.3 + Math.random() * 0.4;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 600 + Math.random() * 400; bp.Q.value = 0.5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol * 0.8, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      this.connect(src, bp, g, this.ctx.destination);
      src.start(now); src.stop(now + dur + 0.01);
      this.nodes.push(src, bp, g);
      const t = setTimeout(fireScrape, 8000 + Math.random() * 12000);
      this.timeouts.push(t);
    };
    fireScrape();
  }

  // Train/bus: constant low rumble 40-80Hz
  private addTransitLayer(vol: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = 50 + Math.random() * 30;
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 120;
    // Slow amplitude wobble
    const lfo = this.ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.3;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = vol * 0.2;
    const master = this.gain(vol * 0.8);
    lfo.connect(lfoG); lfoG.connect(master.gain);
    this.connect(osc, lp, master, this.ctx.destination);
    osc.start(); lfo.start();
    this.nodes.push(osc, lp, lfo, lfoG, master);

    // Brown noise road texture
    const brown = this.makeNoise(3, "brown");
    const brownG = this.gain(vol * 0.3);
    this.connect(brown, brownG, this.ctx.destination);
    brown.start();
    this.nodes.push(brown, brownG);
  }

  // Default: soft brown noise
  private addDefaultLayer(vol: number) {
    const brown = this.makeNoise(4, "brown");
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const master = this.gain(vol);
    this.connect(brown, lp, master, this.ctx.destination);
    brown.start();
    this.nodes.push(brown, lp, master);
  }

  start(situation: string, auditory: string, load: number) {
    if (this.running) return;
    this.running = true;
    if (this.ctx.state === "suspended") void this.ctx.resume();

    const base = Math.min(0.6, 0.4 + (load / 100) * 0.2);
    const t = (situation + " " + auditory).toLowerCase();

    if (/ילד|children|scream|צורח|צועק|שריקה|shriek|yell|kids/.test(t)) {
      this.addScreamLayer(base);
    } else if (/אזעק|alarm|siren|צופר|חירום/.test(t)) {
      this.addAlarmLayer(base + 0.1);
    } else if (/מסיבה|party|club|דיסקו|disco/.test(t)) {
      this.addPartyLayer(base);
    } else if (/קניון|mall|crowd|המון|supermarket|סופר|קהל|אנשים|people|restaurant|מסעדה|cafe|בית קפה/.test(t)) {
      this.addCrowdLayer(base);
    } else if (/כיתה|classroom|school|בית ספר|class/.test(t)) {
      this.addClassroomLayer(base);
    } else if (/רכבת|אוטובוס|train|bus|metro|subway/.test(t)) {
      this.addTransitLayer(base);
    } else if (/גשם|rain|storm|סופה|מטר/.test(t)) {
      this.addRainLayer(base - 0.05);
    } else {
      this.addDefaultLayer(0.2);
    }
  }

  stop() {
    this.running = false;
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
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
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Gemini TTS narration
  const [audioPlaying, setAudioPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Ambient sound (heartbeat + breathing + soundscape)
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);

  // Stimming pause
  const [stimmingPaused, setStimmingPaused] = useState(false);
  // Reveal timeline: stimmingActive starts false, auto-enabled at T=30s
  const [stimmingActive, setStimmingActive] = useState(false);
  const stimmingRafRef = useRef<number | null>(null);

  // Environment sound
  const [envPlaying, setEnvPlaying] = useState(false);
  const envEngineRef = useRef<EnvironmentSoundEngine | null>(null);

  // Timed reveal sequence
  const [videoVisible, setVideoVisible] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const revealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // History save
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      ambientEngineRef.current?.destroy();
      envEngineRef.current?.destroy();
      ttsAudioRef.current?.pause();
      revealTimersRef.current.forEach(clearTimeout);
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

  // Timed reveal sequence — fires once when simulation result arrives
  useEffect(() => {
    if (!result) return;
    // Clear any previous timers
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];

    // T=0: auto-start heartbeat
    if (!ambientEngineRef.current) {
      ambientEngineRef.current = new AmbientSoundEngine();
    }
    const auditoryType = detectAuditoryType(result.sensory_channels?.auditory ?? "");
    ambientEngineRef.current.start(result.overall_load ?? 0, auditoryType);
    setAmbientPlaying(true);

    // T=15s: show "Generating visual…" indicator + auto-start env sound
    const t15 = setTimeout(() => {
      setShowGenerating(true);
      if (!envEngineRef.current) {
        envEngineRef.current = new EnvironmentSoundEngine();
      }
      envEngineRef.current.start(
        snapshot.situation,
        result.sensory_channels?.auditory ?? "",
        result.overall_load ?? 0
      );
      setEnvPlaying(true);
    }, 15000);

    // T=30s: enable stimming on the video container
    const t30 = setTimeout(() => {
      setStimmingActive(true);
    }, 30000);

    revealTimersRef.current = [t15, t30];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result !== null]);

  // Fade in video when it becomes available, start narration simultaneously
  useEffect(() => {
    if (videoUrl) {
      const t = setTimeout(() => {
        setVideoVisible(true);
        // Start narration at the same moment video fades in
        if (!narrationStartedRef.current && result) {
          narrationStartedRef.current = true;
          void startNarration(result);
        }
      }, 50);
      return () => clearTimeout(t);
    } else {
      setVideoVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrationStartedRef = useRef(false);

  // rAF-driven camera stimming on the video element itself
  useEffect(() => {
    const el = videoRef.current;
    const active = stimmingActive && !stimmingPaused;
    const currentLoad = result?.overall_load ?? 0;

    if (stimmingRafRef.current !== null) {
      cancelAnimationFrame(stimmingRafRef.current);
      stimmingRafRef.current = null;
    }
    if (el) el.style.transform = "";

    if (!active || currentLoad < 40 || !el) return;

    const ampY  = currentLoad > 70 ? 10  : 4;
    const ampR  = currentLoad > 70 ? 1   : 0;
    const period = currentLoad > 70 ? 1000 : 3000;

    const tick = (ts: number) => {
      const t = (ts % period) / period * Math.PI * 2;
      const y = ampY * Math.sin(t);
      const r = ampR * Math.sin(t);
      el.style.transform = `translateY(${y}px) rotate(${r}deg)`;
      stimmingRafRef.current = requestAnimationFrame(tick);
    };
    stimmingRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (stimmingRafRef.current !== null) cancelAnimationFrame(stimmingRafRef.current);
      if (el) el.style.transform = "";
    };
  }, [stimmingActive, stimmingPaused, result?.overall_load]);
  const [videoLoopOpacity, setVideoLoopOpacity] = useState(1);

  const handleVideoPlay = useCallback(() => {
    // Narration already started via videoUrl effect; this is a no-op fallback
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const remaining = el.duration - el.currentTime;
    if (remaining <= 1.5) {
      // Fade down toward end
      setVideoLoopOpacity(0.7);
    } else if (el.currentTime < 0.5) {
      // Just looped — fade back up
      setVideoLoopOpacity(1);
    }
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
      // Play once, no loop
      el.loop = false;
      el.onended = () => { ttsAudioRef.current = null; setAudioPlaying(false); };
      el.onerror = () => { ttsAudioRef.current = null; setAudioPlaying(false); };
      await el.play();
    } catch {
      // Fallback: Web Speech API, play once
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = 0.85;
      utt.pitch = 0.9;
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
    setShowGenerating(false);
    setStimmingActive(false);
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
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
            setVideoUri(v.uri);
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
    envEngineRef.current.start(
      snapshot.situation,
      result?.sensory_channels?.auditory ?? "",
      result?.overall_load ?? 0
    );
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

  async function handleSave() {
    if (!result || !videoUri || saved) return;
    try {
      saveSimulation({
        situation: snapshot.situation,
        name: snapshot.name,
        age: snapshot.age,
        gender: snapshot.gender,
        result,
        videoUri,
      });
      setSaved(true);
    } catch {}
  }

  if (!snapshot.hasProfile || !snapshot.hasDraft) return null;

  const load = result?.overall_load ?? 0;

  const hasStimming = stimmingActive;

  const anxiety = result ? Math.round((result.sensory_scores.auditory + result.sensory_scores.social) / 2 * 33) : 0;
  const socialLoad = result ? Math.round(result.sensory_scores.social * 33) : 0;
  const maskingLoad = result ? Math.min(100, load + 10) : 0;

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">

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

      {/* Main result — full-height three-column layout */}
      {result && !loading && (
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div className="flex flex-col w-[175px] shrink-0 border-r border-foreground/10 bg-background">

            {/* Sound indicators — stacked pills */}
            <div className="flex flex-col gap-0 border-b border-foreground/10">
              {/* Heartbeat */}
              <div className={[
                "flex items-center gap-2.5 px-4 py-3.5 border-b border-foreground/8 text-[10px] tracking-[0.12em] uppercase transition-colors",
                ambientPlaying ? "bg-red-950/40 text-red-300" : "text-foreground/40",
              ].join(" ")}>
                <span className={ambientPlaying ? "animate-pulse" : ""}>♥</span>
                <span>Sounds of Heart beat</span>
              </div>
              {/* Environment */}
              <div className={[
                "flex items-center gap-2.5 px-4 py-3.5 border-b border-foreground/8 text-[10px] tracking-[0.12em] uppercase transition-colors",
                envPlaying ? "bg-green-950/40 text-green-300" : "text-foreground/40",
              ].join(" ")}>
                <span className={envPlaying ? "animate-pulse" : ""}>◎</span>
                <span>Sounds of environment</span>
              </div>
              {/* Narration — clickable */}
              <button
                type="button"
                onClick={toggleNarration}
                className={[
                  "flex items-center gap-2.5 px-4 py-3.5 border-b border-foreground/8 text-[10px] tracking-[0.12em] uppercase text-left transition-colors hover:bg-foreground/5",
                  audioPlaying ? "bg-blue-950/40 text-blue-300" : "text-foreground/40",
                ].join(" ")}
              >
                <span className={audioPlaying ? "animate-pulse" : ""}>◈</span>
                <span>{audioPlaying ? "Playing…" : "Sounds of inner thoughts"}</span>
              </button>
              {/* Stimming */}
              <div className={[
                "flex items-center gap-2.5 px-4 py-3.5 text-[10px] tracking-[0.12em] uppercase transition-colors",
                hasStimming && !stimmingPaused ? "bg-purple-950/40 text-purple-300" : "text-foreground/40",
              ].join(" ")}>
                <span className={hasStimming && !stimmingPaused ? "animate-pulse" : ""}>⟳</span>
                <span>Rocking movements</span>
              </div>
            </div>

            {/* Monologue scroll */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="text-[10px] leading-[1.8] text-foreground/50 space-y-1">
                {result.monologue.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
                {/* Coping actions appended */}
                <div className="mt-4 pt-3 border-t border-foreground/10 space-y-1">
                  {result.coping_actions.map((a, i) => (
                    <p key={i} className="opacity-60">{a}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Save + actions at bottom */}
            <div className="border-t border-foreground/10 p-3 flex flex-col gap-2">
              {result && videoUri && !saved && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full h-8 rounded border border-foreground/30 text-[9px] uppercase tracking-[0.15em] hover:bg-foreground/10 transition-all"
                >
                  Save
                </button>
              )}
              {saved && (
                <div className="text-center text-[9px] uppercase tracking-[0.15em] text-green-400 opacity-80">Saved ✓</div>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => router.push("/chat")}
                  className="flex-1 h-7 rounded border border-foreground/20 text-[8px] uppercase tracking-[0.12em] hover:border-foreground/40 transition-all"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex-1 h-7 rounded bg-foreground text-[8px] uppercase tracking-[0.12em] text-background hover:opacity-90 transition-all"
                >
                  Home
                </button>
              </div>
            </div>
          </div>

          {/* ── CENTER — Video (dominant, full height) ──────────── */}
          <div className="relative flex-1 bg-black overflow-hidden">
            <div className="absolute inset-0 bg-black" />

            {videoUrl && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                style={{ opacity: videoVisible ? videoLoopOpacity : 0, scale: "1.06" }}
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                onPlay={handleVideoPlay}
                onTimeUpdate={handleTimeUpdate}
              />
            )}

            {!videoUrl && showGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="h-3 w-3 animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 animate-pulse">
                  Generating visual…
                </div>
              </div>
            )}

            {/* Chromatic aberration overlays */}
            {videoUrl && (
              <>
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: `rgba(220,80,80,${load / 800})`, transform: `translateX(${load / 30}px)`, mixBlendMode: "screen" }} />
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: `rgba(80,130,220,${load / 800})`, transform: `translateX(-${load / 30}px)`, mixBlendMode: "screen" }} />
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />
              </>
            )}

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10 z-10"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)" }}>
              <p className="text-xs italic text-white/65 leading-5">{result.scene_caption}</p>
            </div>

            {/* Load bar top-left */}
            <div className="absolute top-3 left-3 right-16 z-10 flex items-center gap-2">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/35 whitespace-nowrap">load</div>
              <div className="flex-1 h-px bg-white/10 overflow-hidden">
                <div className="h-full transition-all duration-1000"
                  style={{ width: `${load}%`, background: load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c" }} />
              </div>
              <div className="text-[8px] font-mono text-white/35">{load}%</div>
            </div>

            {/* Download top-right */}
            {videoUrl && (
              <button type="button" onClick={downloadVideo} title="Download video"
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.15em] text-white/55 backdrop-blur-sm hover:border-white/40 hover:text-white/90 transition-all">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5" /><path d="M1 10h10" />
                </svg>
                MP4
              </button>
            )}
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────── */}
          <div className="flex flex-col w-[230px] shrink-0 border-l border-foreground/10 bg-background">

            {/* "More crucial information" collapsible header */}
            <details className="group flex-none border-b border-foreground/10">
              <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none select-none hover:bg-foreground/5 transition-colors">
                <span className="text-[10px] uppercase tracking-[0.15em] opacity-70">More crucial information you can open up</span>
                <svg className="w-4 h-4 opacity-40 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-4 py-3 border-t border-foreground/8 space-y-3">
                {Object.entries(result.sensory_channels).map(([key, val]) => (
                  <div key={key}>
                    <div className="text-[9px] uppercase tracking-[0.15em] opacity-35 mb-0.5">{key}</div>
                    <div className="text-[10px] leading-[1.7] opacity-60">{val}</div>
                  </div>
                ))}
                <div className="pt-2 border-t border-foreground/8">
                  <div className="text-[9px] uppercase tracking-[0.15em] opacity-35 mb-1">Masking cost</div>
                  <p className="text-[10px] leading-[1.7] opacity-60 italic">{result.masking_cost}</p>
                </div>
                <div className="pt-2 border-t border-foreground/8 flex flex-wrap gap-1">
                  {result.research_tags.map((tag) => (
                    <span key={tag} className="rounded border border-foreground/15 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] opacity-50">{tag}</span>
                  ))}
                </div>
              </div>
            </details>

            {/* Emotions + extra data scrollable block */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="text-[10px] leading-[1.8] text-foreground/50 space-y-1">
                {result.emotions.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                <div className="mt-4 pt-3 border-t border-foreground/10 space-y-2">
                  {CITATIONS.map((c) => (
                    <div key={c.id}>
                      <div className="text-[8px] uppercase tracking-[0.12em] opacity-30 mb-0.5">[{c.id}] {c.label}</div>
                      <div className="text-[9px] leading-[1.6] opacity-40">{c.excerpt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Load slider (0.0 – 1.0) */}
            <div className="border-t border-foreground/10 px-4 py-3">
              <div className="relative h-px bg-foreground/15 rounded-full">
                <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${load}%`, background: load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c" }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-foreground/40 bg-background transition-all duration-1000"
                  style={{ left: `${load}%`, transform: "translate(-50%, -50%)" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] font-mono opacity-30">0.0</span>
                <span className="text-[8px] font-mono opacity-30">1.0</span>
              </div>
            </div>

            {/* Sensory score mini line graph */}
            <div className="border-t border-foreground/10 px-4 pt-3 pb-4">
              <div className="relative h-[80px]">
                <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.5" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.5" />
                  <line x1="0" y1="60" x2="100" y2="60" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.5" />
                  {/* Labels */}
                  <text x="0" y="-3" fontSize="6" fill="currentColor" fillOpacity="0.3">1.0</text>
                  <text x="0" y="33" fontSize="6" fill="currentColor" fillOpacity="0.3">0.5</text>
                  {/* Score line: auditory, visual, tactile, social mapped to x positions */}
                  {(() => {
                    const scores = [
                      result.sensory_scores.auditory,
                      result.sensory_scores.visual,
                      result.sensory_scores.tactile,
                      result.sensory_scores.social,
                    ];
                    const pts = scores.map((s, i) => {
                      const x = (i / (scores.length - 1)) * 100;
                      const y = 60 - (s / 3) * 60;
                      return `${x},${y}`;
                    });
                    const dotColor = load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c";
                    return (
                      <>
                        <polyline
                          points={pts.join(" ")}
                          fill="none"
                          stroke={dotColor}
                          strokeWidth="1.2"
                          strokeOpacity="0.7"
                        />
                        {scores.map((s, i) => {
                          const x = (i / (scores.length - 1)) * 100;
                          const y = 60 - (s / 3) * 60;
                          return <circle key={i} cx={x} cy={y} r="2" fill={dotColor} fillOpacity="0.9" />;
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between mt-1">
                {["aud","vis","tac","soc"].map((l) => (
                  <span key={l} className="text-[7px] font-mono uppercase opacity-25">{l}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
