"use client";

import { useEffect, useState } from "react";
import { getSimulationsFromSupabase } from "@/lib/supabase";

type SimulationRow = {
  id: string;
  situation: string;
  video_url: string;
  internal_thoughts: string;
  sensory_load: number;
  emotional_landscape: string;
  soundscape: string;
  objective: string;
  visual_effect: string;
  created_at: string;
};

export default function ExplorePage() {
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SimulationRow | null>(null);

  useEffect(() => {
    getSimulationsFromSupabase().then((data) => {
      setSimulations(data as SimulationRow[]);
      setLoading(false);
    });
  }, []);

  const loadColor = (load: number) =>
    load > 70 ? "#e05c5c" : load > 45 ? "#FFC99D" : "#5ce08c";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sim-card { transition: border-color 0.2s, background 0.2s; }
        .sim-card:hover { border-color: rgba(255,201,157,0.3) !important; background: rgba(255,255,255,0.05) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0d0a08", color: "white", fontFamily: "system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(13,10,8,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo-orange.svg" alt="" style={{ width: 24, opacity: 0.8 }} />
          <span style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Explore</span>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)" }}>{simulations.length} simulations</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,201,157,0.8)", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Empty */}
        {!loading && simulations.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>No simulations yet</p>
          </div>
        )}

        {/* Grid */}
        {!loading && simulations.length > 0 && (
          <div style={{ padding: "20px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {simulations.map((sim, i) => (
              <div
                key={sim.id}
                className="sim-card"
                onClick={() => setSelected(sim)}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  animation: `fadeIn 0.4s ease forwards`,
                  animationDelay: `${i * 0.03}s`,
                  opacity: 0,
                }}
              >
                {/* Video thumbnail */}
                {sim.video_url && (
                  <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
                    <video
                      src={sim.video_url}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 1; }}
                    />
                    {/* Load bar */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ height: "100%", width: `${sim.sensory_load}%`, background: loadColor(sim.sensory_load) }} />
                    </div>
                    <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, letterSpacing: "0.1em", color: loadColor(sim.sensory_load), background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 3 }}>
                      {sim.sensory_load}%
                    </div>
                  </div>
                )}

                {/* Info */}
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.75)", margin: "0 0 8px", fontFamily: "'Amiri', serif" }}>
                    &ldquo;{sim.situation.length > 100 ? sim.situation.slice(0, 100) + "…" : sim.situation}&rdquo;
                  </p>
                  {sim.emotional_landscape && (
                    <p style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(255,201,157,0.6)", margin: 0 }}>
                      {sim.emotional_landscape}
                    </p>
                  )}
                  <div style={{ marginTop: 8, fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)" }}>
                    {new Date(sim.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fullscreen modal */}
        {selected && (
          <div
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Close */}
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 12px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            {/* Video */}
            {selected.video_url && (
              <video
                src={selected.video_url}
                autoPlay
                loop
                muted
                playsInline
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}

            {/* Vignette */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)", pointerEvents: "none" }} />

            {/* Bottom info */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 24px 40px", zIndex: 5 }}
            >
              <p style={{ fontFamily: "'Amiri', serif", fontSize: "clamp(1rem, 3vw, 1.4rem)", color: "rgba(255,255,255,0.9)", margin: "0 0 12px", lineHeight: 1.4 }}>
                &ldquo;{selected.situation}&rdquo;
              </p>
              {selected.objective && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>{selected.objective}</p>
              )}
              {selected.internal_thoughts && (
                <p style={{ fontSize: 11, color: "rgba(255,201,157,0.7)", margin: "0 0 10px", fontStyle: "italic", lineHeight: 1.5 }}>
                  {selected.internal_thoughts.split(" | ")[0]}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", color: loadColor(selected.sensory_load) }}>
                  SENSORY LOAD {selected.sensory_load}%
                </span>
                {selected.emotional_landscape && (
                  <span style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)" }}>
                    {selected.emotional_landscape}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
