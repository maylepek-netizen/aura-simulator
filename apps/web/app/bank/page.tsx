"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "../TransitionProvider";
import { loadSimulations, deleteSimulationsByIds } from "@/lib/simulationStorage";
import type { SimulationRecord } from "@/lib/simulationStorage";

// ─── Filter bands ─────────────────────────────────────────────────────────────

type AgeBand = "All" | "Child" | "Teen" | "Adult";
type LoadBand = "All" | "Low" | "Medium" | "High" | "Shutdown";

const AGE_BANDS: { key: AgeBand; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Child", label: "Child (5-12)" },
  { key: "Teen", label: "Teen (13-18)" },
  { key: "Adult", label: "Adult (18+)" },
];

const LOAD_BANDS: LoadBand[] = ["All", "Low", "Medium", "High", "Shutdown"];

function matchesAgeBand(age: number, band: AgeBand): boolean {
  if (band === "All") return true;
  if (band === "Child") return age >= 5 && age <= 12;
  if (band === "Teen") return age >= 13 && age <= 18;
  return age >= 18; // Adult
}

// Sensory load bands: Low 0-30, Medium 31-60, High 61-85, Shutdown 86-100
function matchesLoadBand(load: number, band: LoadBand): boolean {
  if (band === "All") return true;
  if (band === "Low") return load <= 30;
  if (band === "Medium") return load > 30 && load <= 60;
  if (band === "High") return load > 60 && load <= 85;
  return load > 85; // Shutdown
}

// Random but stable positions across a 3000×2000 virtual canvas
function getCardPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const rng = (seed: number) => {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  };
  const rand = rng(42);
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const cellW = 2800 / cols;
  const cellH = 1800 / Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: 100 + col * cellW + rand() * cellW * 0.5,
      y: 100 + row * cellH + rand() * cellH * 0.5,
    });
  }
  return positions;
}

function SimCard({ rec, index, x, y, onOpen }: {
  rec: SimulationRecord; index: number; x: number; y: number; onOpen: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const load = (rec.result as { overall_load?: number }).overall_load ?? 0;
  const loadColor = load > 70 ? "#e05c5c" : load > 45 ? "#FFC99D" : "#5ce08c";
  const situationSnippet = rec.situation.length > 80 ? rec.situation.slice(0, 80) + "…" : rec.situation;
  const num = String(index + 1).padStart(3, "0");

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onOpen(rec.id); }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 200,
        cursor: "pointer",
        transform: hovered ? "scale(1.06)" : "scale(1)",
        filter: hovered ? "grayscale(0%) brightness(1.05)" : "grayscale(100%)",
        transition: "all 0.4s ease",
        opacity: 0,
        animation: `cardFadeIn 0.6s ease forwards`,
        animationDelay: `${index * 0.06}s`,
      }}
    >
      {/* Thumbnail rectangle */}
      <div style={{
        width: "100%",
        height: 120,
        borderRadius: 8,
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${hovered ? "rgba(255,201,157,0.35)" : "rgba(255,255,255,0.1)"}`,
        overflow: "hidden",
        position: "relative",
        boxShadow: hovered ? "0 0 24px rgba(255,201,157,0.2), 0 8px 32px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.4)",
        transition: "all 0.4s ease",
      }}>
        {/* Video thumbnail — first frame */}
        {rec.videoUri ? (
          <video
            src={"/api/video-proxy?uri=" + encodeURIComponent(rec.videoUri)}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.5; }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, rgba(20,15,10,0.9), rgba(10,8,6,0.95))",
          }} />
        )}
        {/* Load bar at bottom of thumbnail */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", width: `${load}%`, background: loadColor, transition: "width 1s ease" }} />
        </div>
        {/* Sim number */}
        <div style={{ position: "absolute", top: 10, left: 10, fontSize: 9, letterSpacing: "0.2em", color: hovered ? "rgba(255,201,157,0.8)" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}>
          #{num}
        </div>
        {/* Load value */}
        <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, letterSpacing: "0.1em", color: hovered ? loadColor : "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)" }}>
          {load}%
        </div>
      </div>

      {/* Meta below thumbnail */}
      <div style={{ marginTop: 8, padding: "0 2px" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: hovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", marginBottom: 3, transition: "color 0.4s" }}>
          {rec.name} · {rec.gender} · Age {rec.age}
        </div>
        <p style={{ fontSize: 10, lineHeight: 1.55, color: hovered ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)", margin: 0, transition: "color 0.4s" }}>
          {situationSnippet}
        </p>
      </div>
    </div>
  );
}

export default function BankPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

  // Filters
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState<AgeBand>("All");
  const [loadFilter, setLoadFilter] = useState<LoadBand>("All");
  // "Drag to explore" hint — fades out 3s after the first drag.
  const [hintVisible, setHintVisible] = useState(true);

  // Pan + zoom state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: -200, y: -100 });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Touch gesture state
  const pinchDist = useRef<number | null>(null);   // last two-finger distance
  const pinchScale = useRef(1);                     // scale at pinch start
  const touchMoved = useRef(false);                 // did the finger move (to distinguish tap from drag)
  const lastTouch = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const all = loadSimulations().slice().reverse();
    setRecords(all);
    setPositions(getCardPositions(all.length));
    setLoading(false);
  }, []);

  // Once the user starts dragging, fade the hint out after 3s.
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteDragStarted = () => {
    if (hintTimerRef.current) return; // already scheduled
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000);
  };
  useEffect(() => () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }, []);

  // Pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    // only drag on canvas background, not on cards
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    dragging.current = true;
    noteDragStarted();
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const onMouseUp = () => { dragging.current = false; };

  // ── Touch: one finger pans, two fingers pinch-zoom ──
  const dist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    noteDragStarted();
    if (e.touches.length === 1) {
      touchMoved.current = false;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      pinchDist.current = dist(e.touches[0], e.touches[1]);
      pinchScale.current = scale;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist.current != null) {
      // Pinch to zoom (clamped 0.5×–2.5×)
      const next = pinchScale.current * (dist(e.touches[0], e.touches[1]) / pinchDist.current);
      setScale(Math.max(0.5, Math.min(2.5, next)));
      touchMoved.current = true;
    } else if (e.touches.length === 1 && pinchDist.current == null) {
      // One-finger pan
      const t = e.touches[0];
      const dx = t.clientX - lastTouch.current.x;
      const dy = t.clientY - lastTouch.current.y;
      lastTouch.current = { x: t.clientX, y: t.clientY };
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) touchMoved.current = true;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchDist.current = null;
  };

  const [cleaning, setCleaning] = useState(false);

  async function cleanUpBroken() {
    setCleaning(true);
    const broken = new Set<string>();
    await Promise.all(
      records.map(async (r) => {
        if (!r.videoUri) { broken.add(r.id); return; }
        try {
          const res = await fetch("/api/video-proxy?uri=" + encodeURIComponent(r.videoUri), { method: "HEAD" });
          if (!res.ok) broken.add(r.id);
        } catch {
          broken.add(r.id);
        }
      })
    );
    if (broken.size > 0) {
      deleteSimulationsByIds(broken);
      const remaining = loadSimulations().slice().reverse();
      setRecords(remaining);
      setPositions(getCardPositions(remaining.length));
    }
    setCleaning(false);
  }

  const filteredRecords = records.filter(r => {
    // Hide empty cards — a record with no usable video has nothing to show.
    if (typeof r.videoUri !== "string" || r.videoUri.trim().length === 0) return false;
    if (genderFilter !== "All" && r.gender !== genderFilter) return false;
    if (!matchesAgeBand(r.age, ageFilter)) return false;
    const load = (r.result as { overall_load?: number })?.overall_load ?? 0;
    if (!matchesLoadBand(load, loadFilter)) return false;
    return true;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0806", overflow: "hidden", userSelect: "none" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
        @keyframes cardFadeIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pageFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .filter-btn { transition: background 0.2s, border-color 0.2s, color 0.2s; }
        .filter-btn:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Radial gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)", pointerEvents: "none", zIndex: 2 }} />

      {/* Top filter bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", gap: 10, padding: "12px 28px 14px",
        animation: "pageFadeIn 0.8s ease",
      }}>
        {/* Row 1 — title + gender + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <img src="/icons/bank.svg" alt="" style={{ width: 18, opacity: 0.6 }} />
            <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Simulation Bank</span>
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)" }}>{records.length} saved</span>
          </div>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Gender filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Gender</span>
            {["All", "Male", "Female", "Non-binary"].map(g => (
              <button key={g} type="button" className="filter-btn" onClick={() => setGenderFilter(g)} style={{
                height: 24, padding: "0 10px", borderRadius: 4,
                border: `1px solid ${genderFilter === g ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.12)"}`,
                background: genderFilter === g ? "rgba(255,201,157,0.08)" : "transparent",
                fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                color: genderFilter === g ? "#FFC99D" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
              }}>{g}</button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" className="filter-btn" onClick={() => navigate("/chat")} style={{ height: 30, padding: "0 14px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
              New Simulation
            </button>
          </div>
        </div>

        {/* Row 2 — age band + anxiety/sensory level */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Age band */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Age</span>
            {AGE_BANDS.map(({ key, label }) => (
              <button key={key} type="button" className="filter-btn" onClick={() => setAgeFilter(key)} style={{
                height: 24, padding: "0 10px", borderRadius: 4,
                border: `1px solid ${ageFilter === key ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.12)"}`,
                background: ageFilter === key ? "rgba(255,201,157,0.08)" : "transparent",
                fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                color: ageFilter === key ? "#FFC99D" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Anxiety / sensory level */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Level</span>
            {LOAD_BANDS.map(b => (
              <button key={b} type="button" className="filter-btn" onClick={() => setLoadFilter(b)} style={{
                height: 24, padding: "0 10px", borderRadius: 4,
                border: `1px solid ${loadFilter === b ? "rgba(255,201,157,0.5)" : "rgba(255,255,255,0.12)"}`,
                background: loadFilter === b ? "rgba(255,201,157,0.08)" : "transparent",
                fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                color: loadFilter === b ? "#FFC99D" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
              }}>{b}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Pannable canvas */}
      <div
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ position: "absolute", inset: 0, cursor: dragging.current ? "grabbing" : "grab", zIndex: 1, touchAction: "none" }}
      >
        <div style={{
          position: "absolute",
          width: 3000, height: 2000,
          left: offset.x,
          top: offset.y + 100, // clears the two-row filter bar
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          transition: dragging.current || pinchDist.current != null ? "none" : "transform 0.1s, left 0.05s, top 0.05s",
        }}>
          {!loading && filteredRecords.map((rec, i) => {
            const origIdx = records.indexOf(rec);
            const pos = positions[origIdx] ?? { x: 100, y: 100 };
            return (
              <div key={rec.id} data-card="true">
                <SimCard
                  rec={rec}
                  index={i}
                  x={pos.x}
                  y={pos.y}
                  onOpen={(id) => { if (!touchMoved.current) navigate("/bank/" + id); }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, zIndex: 10 }}>
          <img src="/icons/bank.svg" alt="" style={{ width: 40, opacity: 0.25 }} />
          <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>No simulations saved yet</p>
          <button type="button" onClick={() => navigate("/chat")} style={{ height: 36, padding: "0 24px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            Start a simulation
          </button>
        </div>
      )}

      {/* Drag hint — near the top, fades 3s after the first drag */}
      {!loading && records.length > 0 && (
        <div style={{
          position: "fixed", top: 116, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-body)",
          fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(255,201,157,0.4)",
          zIndex: 20, pointerEvents: "none", whiteSpace: "nowrap",
          opacity: hintVisible ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}>
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
            <path d="M4.5 1L1 5l3.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drag to explore
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
            <path d="M8.5 1L12 5l-3.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Footer bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 60, zIndex: 20,
        background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", pointerEvents: "none",
      }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(255,201,157,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          style={{
            pointerEvents: "auto",
            background: "transparent",
            border: "1px solid #FFC99D",
            color: "#FFC99D",
            padding: "9px 20px", borderRadius: 12, fontSize: 13, cursor: "pointer",
            fontFamily: "var(--font-body)", letterSpacing: "0.04em",
            transition: "box-shadow 0.2s ease",
          }}
        >
          ← Back to Start
        </button>
        <button
          type="button"
          onClick={() => navigate("/research")}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(255,201,157,0.6)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          style={{
            pointerEvents: "auto",
            background: "#FFC99D",
            border: "1px solid #FFC99D",
            color: "#1a0f00",
            fontWeight: 600,
            padding: "9px 20px", borderRadius: 12, fontSize: 13, cursor: "pointer",
            fontFamily: "var(--font-body)", letterSpacing: "0.04em",
            transition: "box-shadow 0.2s ease",
          }}
        >
          Read the Research →
        </button>
      </div>
    </div>
  );
}
