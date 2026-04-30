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
  // videoUrl added so effect re-runs if video mounts after stimmingActive fires
  }, [stimmingActive, stimmingPaused, result?.overall_load, videoUrl]);
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
      console.log("[TTS] sending gender from localStorage:", JSON.stringify(snapshot.gender));
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
  const loadColor = load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c";
  const anxiety = result ? Math.round((result.sensory_scores.auditory + result.sensory_scores.social) / 2 * 33) : 0;
  const socialLoad = result ? Math.round(result.sensory_scores.social * 33) : 0;
  const maskingLoad = result ? Math.min(100, load + 10) : 0;

  const glass = {
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  } as React.CSSProperties;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>

      {/* ── FULLSCREEN VIDEO (z-index 0) ─────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", background: "#000" }}>
        {videoUrl && (
          <video
            ref={videoRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: videoVisible ? videoLoopOpacity : 0, scale: "1.06", transition: "opacity 1s" }}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onPlay={handleVideoPlay}
            onTimeUpdate={handleTimeUpdate}
          />
        )}

        {/* Chromatic aberration overlays */}
        {videoUrl && (
          <>
            <div style={{ position: "absolute", inset: 0, background: `rgba(220,80,80,${load / 800})`, transform: `translateX(${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: `rgba(80,130,220,${load / 800})`, transform: `translateX(-${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
          </>
        )}

        {/* Loading overlay */}
        {(loading || (!videoUrl && !result)) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div className="h-6 w-6 rounded-full border border-white/20 border-t-white/80 animate-spin" />
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{loadMsg}</div>
          </div>
        )}

        {/* Generating indicator */}
        {!videoUrl && showGenerating && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none" }}>
            <div className="h-3 w-3 animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 animate-pulse">Generating visual…</div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">Error</div>
            <p className="text-sm text-white/50 text-center px-8">{error}</p>
            <button type="button" onClick={() => void runSimulation()}
              className="text-[10px] uppercase tracking-[0.22em] border border-white/20 rounded px-4 py-2 text-white/60 hover:border-white/40">
              Retry
            </button>
          </div>
        )}

        {/* Caption at bottom center */}
        {result && (
          <div style={{ position: "absolute", bottom: 0, left: 280, right: 280, padding: "0 20px 20px", background: "linear-gradient(0deg,rgba(0,0,0,0.7) 0%,transparent 100%)", zIndex: 1 }}>
            <p className="text-xs italic text-white/60 leading-5 text-center">{result.scene_caption}</p>
          </div>
        )}
      </div>

      {/* ── TOP METRICS BAR (z-index 10) ─────────────────────── */}
      {result && (
        <div style={{ position: "fixed", top: 0, left: 280, right: 280, height: 48, zIndex: 10, ...glass, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 24, padding: "0 24px" }}>
          {[
            { label: "Sensory Load", value: load, color: loadColor },
            { label: "Anxiety", value: anxiety, color: "#e08c5c" },
            { label: "Social Load", value: socialLoad, color: "#8c5ce0" },
            { label: "Masking", value: maskingLoad, color: "#5c8ce0" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[8px] uppercase tracking-[0.18em] text-white/40 whitespace-nowrap">{label}</span>
              <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color }} />
              </div>
              <span className="text-[8px] font-mono text-white/35">{value}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── LEFT GLASS PANEL (z-index 10) ────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 10, ...glass, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>

        {/* Sound status indicators */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          {[
            { icon: "♥", label: "Heartbeat", active: ambientPlaying, color: "rgba(252,165,165,0.9)" },
            { icon: "◎", label: "Environment", active: envPlaying, color: "rgba(134,239,172,0.9)" },
            { icon: "◈", label: audioPlaying ? "Playing thoughts…" : "Inner thoughts", active: audioPlaying, color: "rgba(147,197,253,0.9)", onClick: toggleNarration },
            { icon: "⟳", label: "Rocking movements", active: hasStimming && !stimmingPaused, color: "rgba(216,180,254,0.9)" },
          ].map(({ icon, label, active, color, onClick }) => (
            <div
              key={label}
              onClick={onClick}
              role={onClick ? "button" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: onClick ? "pointer" : "default" }}
              className={onClick ? "hover:bg-white/5 transition-colors" : ""}
            >
              <span style={{ fontSize: 12, color: active ? color : "rgba(255,255,255,0.25)", transition: "color 0.3s" }} className={active ? "animate-pulse" : ""}>{icon}</span>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? color : "rgba(255,255,255,0.3)", transition: "color 0.3s" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Internal monologue — scrollable */}
        {result && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Internal Monologue</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.monologue.map((t, i) => (
                <p key={i} style={{ fontSize: 11, lineHeight: 1.75, color: "rgba(255,255,255,0.65)", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 10, margin: 0 }}>{t}</p>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Coping Actions</div>
              {result.coping_actions.map((a, i) => (
                <p key={i} style={{ fontSize: 11, lineHeight: 1.75, color: "rgba(255,255,255,0.5)", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10, margin: "0 0 8px" }}>{a}</p>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {videoUrl && (
            <button type="button" onClick={downloadVideo}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", cursor: "pointer", width: "100%" }}
              className="hover:bg-white/10 transition-colors">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5" /><path d="M1 10h10" />
              </svg>
              Download MP4
            </button>
          )}
          {result && videoUri && !saved ? (
            <button type="button" onClick={handleSave}
              style={{ height: 34, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", cursor: "pointer", width: "100%" }}
              className="hover:bg-white/10 transition-colors">
              Save simulation
            </button>
          ) : saved ? (
            <div style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(134,239,172,0.8)" }}>Saved ✓</div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => router.push("/chat")}
              style={{ flex: 1, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
              className="hover:bg-white/5 transition-colors">
              New
            </button>
            <button type="button" onClick={() => router.push("/")}
              style={{ flex: 1, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              className="hover:bg-white/15 transition-colors">
              Home
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT GLASS PANEL (z-index 10) ───────────────────── */}
      {result && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, zIndex: 10, ...glass, borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "20px 20px 0", flex: 1 }}>

            {/* Sensory channels */}
            <Section title="Sensory Channels">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(result.sensory_channels).map(([key, val]) => (
                  <div key={key}>
                    <div style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>{key}</div>
                    <div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>{val}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Emotions */}
            <Section title="Emotions">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.emotions.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,0.6)", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 10 }}>{e}</div>
                ))}
              </div>
            </Section>

            {/* Masking cost */}
            <Section title="Masking Cost">
              <p style={{ fontSize: 11, lineHeight: 1.75, color: "rgba(255,255,255,0.55)", fontStyle: "italic", margin: 0 }}>{result.masking_cost}</p>
            </Section>

            {/* Research tags */}
            <Section title="Research Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {result.research_tags.map((tag) => (
                  <span key={tag} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, padding: "2px 7px", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{tag}</span>
                ))}
              </div>
            </Section>

            {/* Sensory scores bar chart */}
            <Section title="Sensory Scores">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Auditory", value: result.sensory_scores.auditory },
                  { label: "Visual", value: result.sensory_scores.visual },
                  { label: "Tactile", value: result.sensory_scores.tactile },
                  { label: "Social", value: result.sensory_scores.social },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", width: 52, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(value / 3) * 100}%`, background: loadColor, transition: "width 1s", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", width: 16 }}>{value}</span>
                  </div>
                ))}
              </div>
            </Section>

          </div>

          {/* Citations collapsed at bottom */}
          <details style={{ borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <summary style={{ padding: "12px 20px", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", cursor: "pointer", userSelect: "none" }}>
              Research Sources
            </summary>
            <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {CITATIONS.map((c) => (
                <div key={c.id}>
                  <div style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 2 }}>[{c.id}] {c.label}</div>
                  <div style={{ fontSize: 9, lineHeight: 1.6, color: "rgba(255,255,255,0.35)" }}>{c.excerpt}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: open ? 10 : 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{title}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </div>
  );
}
