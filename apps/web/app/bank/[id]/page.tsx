"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useNavigate } from "../../TransitionProvider";
import { getSimulationById } from "@/lib/simulationStorage";
import type { SimulationRecord } from "@/lib/simulationStorage";

type SimResult = {
  overall_load: number;
  visual_effect: string;
  scene_caption: string;
  monologue: string[];
  sensory_channels: { auditory: string; visual: string; tactile: string; interoception: string };
  emotions: string[];
  coping_actions: string[];
  masking_cost: string;
  research_tags: string[];
  ambient_sound?: string;
  sensory_scores?: { auditory: number; visual: number; tactile: number; social: number };
};

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

// ─── Synthesized heartbeat (Web Audio) ────────────────────────────────────────
// Mirrors the heartbeat used on /result: a low sine "thump" whose rate scales
// with sensory load. Kept minimal here (no ambient/breath layers).
class HeartbeatEngine {
  private ctx: AudioContext;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor() {
    this.ctx = new AudioContext();
  }

  private bpmForLoad(load: number) {
    if (load < 40) return 60;
    if (load <= 70) return 90;
    return 130;
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
  }

  private loop(load: number) {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    this.beatPulse(now, 0.9);
    this.beatPulse(now + 0.12, 0.55);
    const interval = (60 / this.bpmForLoad(load)) * 1000;
    this.timeout = setTimeout(() => this.loop(load), interval);
  }

  start(load: number) {
    if (this.running) return;
    this.running = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.loop(load);
  }

  stop() {
    this.running = false;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    try { this.ctx.suspend(); } catch {}
  }

  destroy() {
    this.stop();
    try { this.ctx.close(); } catch {}
  }
}

// matchMedia-based mobile detection (max-width: 768px)
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

// Pulsing eye loading screen — quick visual transition (not waiting on data).
function LoadingScreen({ visible, isMobile }: { visible: boolean; isMobile: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "#0a0807",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.8s ease",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <img src="/icons/New_logo_eye.svg" alt="" style={{
        width: isMobile ? 60 : 80,
        opacity: 0.9,
        animation: "eye-pulse 1.6s ease-in-out infinite",
      }} />
    </div>
  );
}

function CyclingMonologue({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    if (!lines.length) return;
    const t = setInterval(() => {
      setOpacity(0);
      setTimeout(() => { setIdx(i => (i + 1) % lines.length); setOpacity(1); }, 400);
    }, 3500);
    return () => clearInterval(t);
  }, [lines]);
  if (!lines.length) return null;
  return (
    <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.65)", margin: 0, fontFamily: "'Amiri', serif", fontStyle: "italic", transition: "opacity 0.4s ease", opacity }}>
      &ldquo;{lines[idx]}&rdquo;
    </p>
  );
}

function LiveMetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{label}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(value)}%</span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 1, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// Reflection screen shown when the viewer ends the simulation.
function ReflectionScreen({ onBank, onNew }: { onBank: () => void; onNew: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      background: "#0a0807",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 40, padding: "0 24px",
      opacity: visible ? 1 : 0, transition: "opacity 0.9s ease",
    }}>
      <img src="/icons/New_logo_eye.svg" alt="" style={{ width: 64, opacity: 0.85, animation: "eye-pulse 3s ease-in-out infinite" }} />
      <h1 style={{
        fontFamily: "'Amiri', serif", fontSize: "clamp(26px, 6vw, 40px)",
        color: "rgba(255,255,255,0.92)", margin: 0, textAlign: "center", fontWeight: 400,
      }}>
        How did that feel?
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <button type="button" onClick={onBank} style={{
          width: "100%", height: 50, borderRadius: 8,
          border: "1px solid rgba(255,201,157,0.5)", background: "rgba(255,201,157,0.06)",
          fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#FFC99D", cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          Simulation Bank
        </button>
        <button type="button" onClick={onNew} style={{
          width: "100%", height: 50, borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)",
          fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          New Simulation
        </button>
      </div>
    </div>
  );
}

export default function BankReplayPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id as string;
  const isMobile = useIsMobile();

  const [record, setRecord] = useState<SimulationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(true); // brief pulsing-eye screen before reveal
  const [reflecting, setReflecting] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [heartbeatPlaying, setHeartbeatPlaying] = useState(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatRef = useRef<HeartbeatEngine | null>(null);

  useEffect(() => {
    const found = getSimulationById(id);
    if (found) setRecord(found);
    setLoading(false);
  }, [id]);

  // Quick loading transition — a visual dissolve, not waiting on anything.
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setTransitionLoading(false), 900);
    return () => clearTimeout(t);
  }, [loading]);

  // Auto-play ambient sound when record loads
  useEffect(() => {
    if (!record) return;
    const result = record.result as SimResult;
    const category = result.ambient_sound?.toLowerCase().trim() ?? "";
    if (!category) return;
    const url = SOUND_MAP[category] ?? Object.entries(SOUND_MAP).find(([k]) => category.includes(k))?.[1];
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.45;
    ambientRef.current = audio;
    audio.play().then(() => setAmbientPlaying(true)).catch(() => {});
    return () => { audio.pause(); audio.src = ""; };
  }, [record]);

  // Auto-play synthesized heartbeat when record loads
  useEffect(() => {
    if (!record) return;
    const result = record.result as SimResult;
    const engine = new HeartbeatEngine();
    heartbeatRef.current = engine;
    engine.start(result.overall_load ?? 50);
    setHeartbeatPlaying(true);
    return () => { engine.destroy(); heartbeatRef.current = null; };
  }, [record]);

  function toggleAmbient() {
    const audio = ambientRef.current;
    if (!audio) return;
    if (ambientPlaying) { audio.pause(); setAmbientPlaying(false); }
    else { audio.play().catch(() => {}); setAmbientPlaying(true); }
  }

  function toggleHeartbeat() {
    const engine = heartbeatRef.current;
    if (!engine) return;
    if (heartbeatPlaying) { engine.stop(); setHeartbeatPlaying(false); }
    else { engine.start((record?.result as SimResult)?.overall_load ?? 50); setHeartbeatPlaying(true); }
  }

  function endSimulation() {
    ambientRef.current?.pause();
    heartbeatRef.current?.stop();
    setAmbientPlaying(false);
    setHeartbeatPlaying(false);
    setReflecting(true);
  }

  const sharedStyle = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
      @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      @keyframes eye-pulse { 0%,100%{opacity:0.55;transform:scale(0.94)} 50%{opacity:1;transform:scale(1.06)} }
      .sound-btn { transition: border-color 0.2s, background 0.2s, color 0.2s; }
      .sound-btn:hover { border-color: rgba(255,255,255,0.3) !important; }
      .bank-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
      .bank-scroll::-webkit-scrollbar { width: 3px; }
      .bank-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0807" }}>
      {sharedStyle}
      <img src="/icons/New_logo_eye.svg" alt="" style={{ width: isMobile ? 60 : 80, opacity: 0.9, animation: "eye-pulse 1.6s ease-in-out infinite" }} />
    </div>
  );

  if (!record) return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#0d0a08" }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Simulation not found</p>
      <button type="button" onClick={() => navigate("/bank")} style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "8px 16px", color: "rgba(255,255,255,0.6)", background: "transparent", cursor: "pointer" }}>← Back to Bank</button>
    </div>
  );

  const result = record.result as SimResult;
  const load = result.overall_load ?? 0;
  const loadColor = load > 70 ? "#e05c5c" : load > 45 ? "#FFC99D" : "#5ce08c";
  const videoUrl = record.videoUri ? "/api/video-proxy?uri=" + encodeURIComponent(record.videoUri) : null;
  const anxiety = Math.round(((result.sensory_scores?.auditory ?? load * 0.8) + (result.sensory_scores?.social ?? load * 0.9)) / 2);
  const overstim = Math.min(100, load + 10);

  const panelBg = { background: "linear-gradient(to right, rgba(10,8,6,0.97) 0%, rgba(10,8,6,0.92) 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" };
  const panelBgRight = { background: "linear-gradient(to left, rgba(10,8,6,0.97) 0%, rgba(10,8,6,0.92) 100%)", borderLeft: "1px solid rgba(255,255,255,0.06)" };

  if (reflecting) {
    return (
      <>
        {sharedStyle}
        <ReflectionScreen onBank={() => navigate("/bank")} onNew={() => navigate("/chat")} />
      </>
    );
  }

  // ─── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {sharedStyle}
        <LoadingScreen visible={transitionLoading} isMobile />
        <div style={{
          position: "fixed", inset: 0, background: "#0a0807", display: "flex", flexDirection: "column",
          opacity: transitionLoading ? 0 : 1, transition: "opacity 0.8s ease",
        }}>
          {/* Fixed video area (top) */}
          <div style={{ position: "relative", width: "100%", height: "42vh", flexShrink: 0, background: "#000" }}>
            {videoUrl ? (
              <video src={videoUrl} autoPlay loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>No video saved</span>
              </div>
            )}
            {videoUrl && (
              <>
                <div style={{ position: "absolute", inset: 0, background: `rgba(220,80,80,${load / 800})`, mixBlendMode: "screen", pointerEvents: "none" }} />
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
              </>
            )}
            {/* Eye icon (replaces AURA text logo) */}
            <div style={{ position: "absolute", top: 12, left: 14, display: "flex", alignItems: "center", gap: 8, zIndex: 5 }}>
              <img src="/icons/New_logo_eye.svg" alt="" style={{ width: 26, opacity: 0.9 }} />
            </div>
            {/* Back to bank */}
            <button type="button" onClick={() => navigate("/bank")} style={{ position: "absolute", top: 12, right: 14, zIndex: 5, height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", cursor: "pointer" }}>
              ← Bank
            </button>
            {/* Load pill */}
            <div style={{ position: "absolute", bottom: 12, left: 14, zIndex: 5, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: loadColor }} />
              <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.75)" }}>Load {load}%</span>
            </div>
          </div>

          {/* Scrollable info panel — all sections, sans-serif */}
          <div className="bank-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px", fontFamily: "var(--font-body)" }}>
            {/* Situation */}
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,0.82)", margin: "0 0 22px", fontFamily: "var(--font-body)" }}>
              &ldquo;{record.situation}&rdquo;
            </p>

            {/* Sound toggles */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button type="button" onClick={toggleAmbient} className="sound-btn" style={{ flex: 1, height: 40, borderRadius: 6, border: `1px solid ${ambientPlaying ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.14)"}`, background: ambientPlaying ? "rgba(255,201,157,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: ambientPlaying ? "#FFC99D" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Environment
                {ambientPlaying && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC99D", animation: "pulse-dot 1s infinite" }} />}
              </button>
              <button type="button" onClick={toggleHeartbeat} className="sound-btn" style={{ flex: 1, height: 40, borderRadius: 6, border: `1px solid ${heartbeatPlaying ? "rgba(255,193,187,0.5)" : "rgba(255,255,255,0.14)"}`, background: heartbeatPlaying ? "rgba(255,193,187,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Heartbeat
                {heartbeatPlaying && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC1BB", animation: "pulse-dot 0.7s infinite" }} />}
              </button>
            </div>

            <MobileSection title="Inner Voices"><CyclingMonologue lines={result.monologue} /></MobileSection>

            <MobileSection title="Sensory Overload">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <LiveMetricBar label="Sensory Load" value={load} color={loadColor} />
                <LiveMetricBar label="Anxiety" value={anxiety} color="#e08c5c" />
                <LiveMetricBar label="Overstimulation" value={overstim} color="#BCC2FF" />
              </div>
            </MobileSection>

            <MobileSection title="Emotions">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.emotions.map((e, i) => (
                  <span key={i} style={{ fontSize: 13, color: "rgba(255,201,157,0.85)", border: "1px solid rgba(255,201,157,0.2)", borderRadius: 4, padding: "4px 11px", fontFamily: "var(--font-body)" }}>{e}</span>
                ))}
              </div>
            </MobileSection>

            <MobileSection title="Sensory Channels">
              {Object.entries(result.sensory_channels).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{key}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "var(--font-body)" }}>{val}</p>
                </div>
              ))}
            </MobileSection>

            <MobileSection title="Social Anxiety">
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "var(--font-body)" }}>{result.masking_cost}</p>
            </MobileSection>

            <MobileSection title="Coping Actions">
              {result.coping_actions.map((a, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10, fontFamily: "var(--font-body)" }}>{a}</p>
              ))}
            </MobileSection>

            {result.research_tags?.length > 0 && (
              <MobileSection title="Research Tags">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {result.research_tags.map((tag) => (
                    <span key={tag} style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "3px 8px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>{tag}</span>
                  ))}
                </div>
              </MobileSection>
            )}

            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: 8, fontFamily: "var(--font-body)" }}>
              {record.name} · {record.gender} · Age {record.age}
            </div>

            {/* End simulation → reflection */}
            <button type="button" onClick={endSimulation} style={{ marginTop: 24, width: "100%", height: 50, borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: "var(--font-body)" }}>
              End Simulation
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <>
      {sharedStyle}
      <LoadingScreen visible={transitionLoading} isMobile={false} />

      <div style={{ position: "fixed", inset: 0, background: "#0d0a08", overflow: "hidden", opacity: transitionLoading ? 0 : 1, transition: "opacity 0.8s ease" }}>

        {/* ── CENTER VIDEO ── */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 280, right: 280 }}>
          {videoUrl ? (
            <video
              src={videoUrl}
              autoPlay loop playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#0a0806", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>No video saved</span>
            </div>
          )}
          {videoUrl && (
            <>
              <div style={{ position: "absolute", inset: 0, background: `rgba(220,80,80,${load / 800})`, transform: `translateX(${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: `rgba(80,130,220,${load / 800})`, transform: `translateX(-${load / 30}px)`, mixBlendMode: "screen", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
            </>
          )}
          {/* Screen-edge vignette */}
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 25%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.85) 100%)", zIndex: 1 }} />
        </div>

        {/* ── LEFT PANEL ── */}
        <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 10, ...panelBg, display: "flex", flexDirection: "column" }}>

          {/* Nav */}
          <div style={{ padding: "14px 16px 12px", display: "flex", gap: 8, flexShrink: 0 }}>
            <button type="button" className="sound-btn" onClick={() => navigate("/bank")} style={{ flex: 1, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
              ← Bank
            </button>
            <button type="button" className="sound-btn" onClick={() => navigate("/chat")} style={{ flex: 1, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
              New
            </button>
          </div>

          {/* Situation quote */}
          <div style={{ padding: "0 20px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: "'Amiri', serif" }}>
              &ldquo;{record.situation}&rdquo;
            </p>
          </div>

          {/* Scrollable content */}
          <div className="bank-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Current Situation</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0 }}>{result.sensory_channels.auditory}</p>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Social Anxiety</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", margin: 0 }}>{result.masking_cost}</p>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Inner Voices</div>
              <CyclingMonologue lines={result.monologue} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Emotions</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.emotions.map((e, i) => (
                  <span key={i} style={{ fontSize: 12, letterSpacing: "0.06em", color: "rgba(255,201,157,0.8)", border: "1px solid rgba(255,201,157,0.2)", borderRadius: 4, padding: "3px 10px" }}>{e}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Coping Actions</div>
              {result.coping_actions.map((a, i) => (
                <p key={i} style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.45)", margin: "0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 10 }}>{a}</p>
              ))}
            </div>
          </div>

          {/* Bottom info */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
              {record.name} · {record.gender} · Age {record.age}
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.15)", marginTop: 4 }}>
              {new Date(record.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 280, zIndex: 10, ...panelBgRight, display: "flex", flexDirection: "column" }}>

          <div className="bank-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

            {/* Sound controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <button type="button" onClick={toggleAmbient} className="sound-btn" style={{ width: "100%", height: 44, borderRadius: 6, border: `1px solid ${ambientPlaying ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.14)"}`, background: ambientPlaying ? "rgba(255,201,157,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: ambientPlaying ? "#FFC99D" : "rgba(255,255,255,0.6)", cursor: "pointer" }}>
                <img src="/icons/ear.svg" alt="" style={{ width: 14, flexShrink: 0, opacity: ambientPlaying ? 1 : 0.6 }} />
                Environment Sound
                {ambientPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FFC99D", animation: "pulse-dot 1s infinite" }} />}
              </button>
              <button type="button" onClick={toggleHeartbeat} className="sound-btn" style={{ width: "100%", height: 44, borderRadius: 6, border: `1px solid ${heartbeatPlaying ? "rgba(255,193,187,0.5)" : "rgba(255,255,255,0.14)"}`, background: heartbeatPlaying ? "rgba(255,193,187,0.06)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 12, letterSpacing: "0.08em", color: heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.6)", cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 14s-6-4.5-6-8a4 4 0 0 1 6-3.46A4 4 0 0 1 14 6c0 3.5-6 8-6 8z" stroke={heartbeatPlaying ? "#FFC1BB" : "rgba(255,255,255,0.4)"} strokeWidth="1.2" fill="none"/>
                </svg>
                Heartbeat Sound
                {heartbeatPlaying && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FFC1BB", animation: "pulse-dot 0.7s infinite" }} />}
              </button>
            </div>

            {/* Sensory Overload */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Sensory Overload</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <LiveMetricBar label="Sensory Load" value={load} color={loadColor} />
                <LiveMetricBar label="Anxiety" value={anxiety} color="#e08c5c" />
                <LiveMetricBar label="Overstimulation" value={overstim} color="#BCC2FF" />
              </div>
            </div>

            {/* Sensory channels */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Sensory Channels</div>
              {Object.entries(result.sensory_channels).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{key}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.55)", margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Research tags */}
            {result.research_tags?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Research Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {result.research_tags.map((tag) => (
                    <span key={tag} style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "3px 8px", color: "rgba(255,255,255,0.4)" }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* End Simulation → reflection */}
          <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <button type="button" className="sound-btn" onClick={endSimulation} style={{ width: "100%", height: 44, borderRadius: 6, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", cursor: "pointer" }}>
              End Simulation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10, fontFamily: "var(--font-body)" }}>{title}</div>
      {children}
    </div>
  );
}
