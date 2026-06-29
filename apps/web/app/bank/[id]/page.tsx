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

export default function BankReplayPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<SimulationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const found = getSimulationById(id);
    if (found) setRecord(found);
    setLoading(false);
  }, [id]);

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

  function toggleAmbient() {
    const audio = ambientRef.current;
    if (!audio) return;
    if (ambientPlaying) { audio.pause(); setAmbientPlaying(false); }
    else { audio.play().catch(() => {}); setAmbientPlaying(true); }
  }

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0a08" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.8)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .sound-btn { transition: border-color 0.2s, background 0.2s, color 0.2s; }
        .sound-btn:hover { border-color: rgba(255,255,255,0.3) !important; }
        .bank-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        .bank-scroll::-webkit-scrollbar { width: 3px; }
        .bank-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#0d0a08", overflow: "hidden" }}>

        {/* ── CENTER VIDEO ── */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 280, right: 280 }}>
          {videoUrl ? (
            <video
              src={videoUrl}
              autoPlay loop muted playsInline
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

          {/* Bottom load indicator */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Sensory Load</span>
              <span style={{ fontSize: 9, color: loadColor }}>{load}%</span>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: `${load}%`, background: loadColor, borderRadius: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
