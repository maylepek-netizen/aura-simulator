"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSimulations } from "@/lib/simulationStorage";
import type { SimulationRecord } from "@/lib/simulationStorage";

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
        background: hovered
          ? `linear-gradient(135deg, rgba(255,201,157,0.15), rgba(188,194,255,0.1))`
          : "rgba(255,255,255,0.06)",
        border: `1px solid ${hovered ? "rgba(255,201,157,0.35)" : "rgba(255,255,255,0.1)"}`,
        overflow: "hidden",
        position: "relative",
        boxShadow: hovered ? "0 0 24px rgba(255,201,157,0.2), 0 8px 32px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.4)",
        transition: "all 0.4s ease",
      }}>
        {/* Load bar at bottom of thumbnail */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", width: `${load}%`, background: loadColor, transition: "width 1s ease" }} />
        </div>
        {/* Sim number */}
        <div style={{ position: "absolute", top: 10, left: 10, fontSize: 9, letterSpacing: "0.2em", color: hovered ? "rgba(255,201,157,0.8)" : "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
          #{num}
        </div>
        {/* Load value */}
        <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, letterSpacing: "0.1em", color: hovered ? loadColor : "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
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
  const router = useRouter();
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

  // Filters
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageMin, setAgeMin] = useState(5);
  const [ageMax, setAgeMax] = useState(100);

  // Pan state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: -200, y: -100 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const all = loadSimulations().slice().reverse();
    setRecords(all);
    setPositions(getCardPositions(all.length));
    setLoading(false);
  }, []);

  // Pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    // only drag on canvas background, not on cards
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    dragging.current = true;
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

  const filteredRecords = records.filter(r => {
    if (genderFilter !== "All" && r.gender !== genderFilter) return false;
    if (r.age < ageMin || r.age > ageMax) return false;
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
        position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 20,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: 24, padding: "0 28px",
        animation: "pageFadeIn 0.8s ease",
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <img src="/icons/bank.svg" alt="" style={{ width: 18, opacity: 0.6 }} />
          <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Simulation Bank</span>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{records.length} saved</span>
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

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {/* Age range */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Age</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>{ageMin}–{ageMax}</span>
          <input type="range" min={5} max={ageMax} value={ageMin} onChange={e => setAgeMin(Number(e.target.value))}
            style={{ width: 60, accentColor: "#FFC99D", cursor: "pointer" }} />
          <input type="range" min={ageMin} max={100} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))}
            style={{ width: 60, accentColor: "#FFC99D", cursor: "pointer" }} />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="filter-btn" onClick={() => router.push("/chat")} style={{ height: 30, padding: "0 14px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
            New Simulation
          </button>
          <button type="button" className="filter-btn" onClick={() => router.push("/")} style={{ height: 30, padding: "0 14px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
            ← Home
          </button>
        </div>
      </div>

      {/* Pannable canvas */}
      <div
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ position: "absolute", inset: 0, cursor: dragging.current ? "grabbing" : "grab", zIndex: 1 }}
      >
        <div style={{
          position: "absolute",
          width: 3000, height: 2000,
          left: offset.x,
          top: offset.y + 56,
          transition: dragging.current ? "none" : "left 0.05s, top 0.05s",
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
                  onOpen={(id) => router.push("/bank/" + id)}
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
          <button type="button" onClick={() => router.push("/chat")} style={{ height: 36, padding: "0 24px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            Start a simulation
          </button>
        </div>
      )}

      {/* Hint */}
      {!loading && records.length > 0 && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", zIndex: 20, pointerEvents: "none" }}>
          drag to explore · click to replay
        </div>
      )}
    </div>
  );
}
