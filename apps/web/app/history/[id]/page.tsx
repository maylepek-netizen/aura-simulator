"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CITATIONS } from "@/lib/researchCitations";
import { getSimulationById } from "@/lib/simulationStorage";
import type { SimulationRecord } from "@/lib/simulationStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

type SimulationResult = {
  sensory_scores: { auditory: number; visual: number; tactile: number; social: number };
  overall_load: number;
  visual_effect: string;
  scene_caption: string;
  monologue: string[];
  sensory_channels: { auditory: string; visual: string; tactile: string; interoception: string };
  emotions: string[];
  coping_actions: string[];
  masking_cost: string;
  research_tags: string[];
};

function nowIso() { return new Date().toISOString(); }

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden min-w-[40px]">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] font-mono opacity-50 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

function Panel({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
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

export default function ReplayPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const iso = useMemo(() => nowIso(), []);

  const [record, setRecord] = useState<SimulationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = getSimulationById(id);
    if (found) setRecord(found);
    else setError("Simulation not found");
    setLoading(false);
  }, [id]);

  async function downloadVideo(videoUrl: string) {
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen gap-4">
        <div className="h-5 w-5 rounded-full border border-foreground/20 border-t-foreground/80 animate-spin" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm opacity-50">{error ?? "Not found"}</p>
        <button type="button" onClick={() => router.push("/history")}
          className="text-[10px] uppercase tracking-[0.2em] border border-foreground/20 rounded px-4 py-2">
          Back to history
        </button>
      </div>
    );
  }

  const result = record.result as SimulationResult;
  const load = result.overall_load ?? 0;
  const videoUrl = record.videoUri
    ? "/api/video-proxy?uri=" + encodeURIComponent(record.videoUri)
    : null;

  const stimmingClass =
    load > 80 ? "stimming-intense" :
    load > 65 ? "stimming-gentle" : "";

  const anxiety = Math.round((result.sensory_scores.auditory + result.sensory_scores.social) / 2 * 33);
  const socialLoad = Math.round(result.sensory_scores.social * 33);
  const maskingLoad = Math.min(100, load + 10);

  const date = new Date(record.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <style>{`
        @keyframes stimming-gentle {
          0%   { transform: translateY(0px)  rotate(0deg);    }
          25%  { transform: translateY(4px)  rotate(0.5deg);  }
          50%  { transform: translateY(0px)  rotate(0deg);    }
          75%  { transform: translateY(-4px) rotate(-0.5deg); }
          100% { transform: translateY(0px)  rotate(0deg);    }
        }
        @keyframes stimming-intense {
          0%   { transform: translateY(0px)   rotate(0deg);   }
          25%  { transform: translateY(10px)  rotate(1.5deg); }
          50%  { transform: translateY(0px)   rotate(0deg);   }
          75%  { transform: translateY(-10px) rotate(-1.5deg);}
          100% { transform: translateY(0px)   rotate(0deg);   }
        }
        .stimming-gentle  { animation: stimming-gentle  2s   ease-in-out infinite; }
        .stimming-intense { animation: stimming-intense 0.8s ease-in-out infinite; }
      `}</style>

      {/* Corner telemetry */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute left-4 top-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50">
          <div>Aura / replay</div>
          <div className="opacity-70">t={iso}</div>
        </div>
        <div className="absolute right-4 top-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50 text-right">
          <div>route /history/{id}</div>
          <div className="opacity-70">{date}</div>
        </div>
        <div className="absolute left-4 bottom-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50">
          <div>case</div>
          <div className="opacity-70">{record.name}</div>
        </div>
        <div className="absolute right-4 bottom-4 text-[9px] leading-4 tracking-[0.22em] uppercase opacity-50 text-right">
          <div>load</div>
          <div className="opacity-70">{load}%</div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full border border-foreground/60" />
          <div className="text-xs tracking-[0.26em] uppercase opacity-80">Aura</div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 max-w-xs truncate">
          {record.situation}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.15em] opacity-30">replay</span>
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 border border-foreground/20 rounded px-3 py-1"
          >
            ← History
          </button>
        </div>
      </header>

      <div className="flex flex-col flex-1 px-4 pb-8 pt-4 sm:px-6 gap-3">

        {/* Top meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1">
          <Meter label="Sensory Load" value={load} color={load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c"} />
          <Meter label="Anxiety" value={anxiety} color="#e08c5c" />
          <Meter label="Social Load" value={socialLoad} color="#8c5ce0" />
          <Meter label="Masking" value={maskingLoad} color="#5c8ce0" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-3 flex-1">

          {/* LEFT */}
          <div className="flex flex-col gap-3">
            <Panel title="Internal Monologue" icon="💭">
              <div className="space-y-2">
                {result.monologue.map((t, i) => (
                  <div key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">{t}</div>
                ))}
              </div>
            </Panel>
            <Panel title="Coping Actions" icon="🛡" defaultOpen={false}>
              <ul className="space-y-2">
                {result.coping_actions.map((a, i) => (
                  <li key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">{a}</li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* CENTER - Video */}
          <div className={["relative rounded-xl overflow-hidden border border-foreground/15 bg-black min-h-[320px] lg:min-h-0", stimmingClass].join(" ")}>
            {videoUrl ? (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/30">No video saved</span>
              </div>
            )}

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
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10"
              style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
              <p className="text-xs italic text-white/70 leading-5">{result.scene_caption}</p>
            </div>

            {/* Sensory bar */}
            <div className="absolute top-3 left-3 right-14 z-10 flex items-center gap-2">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/40 whitespace-nowrap">load</div>
              <div className="flex-1 h-px bg-white/10 overflow-hidden">
                <div className="h-full transition-all duration-1000"
                  style={{ width: `${load}%`, background: load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c" }} />
              </div>
              <div className="text-[8px] font-mono text-white/40">{load}%</div>
            </div>

            {/* Download button */}
            {videoUrl && (
              <button
                type="button"
                onClick={() => downloadVideo(videoUrl)}
                title="Download video"
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.15em] text-white/60 backdrop-blur-sm hover:border-white/40 hover:text-white/90 transition-all"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5" /><path d="M1 10h10" />
                </svg>
                MP4
              </button>
            )}
          </div>

          {/* RIGHT */}
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
                  <li key={i} className="text-[11px] leading-5 opacity-75 border-l border-foreground/15 pl-2">{e}</li>
                ))}
              </ul>
            </Panel>
            <Panel title="Masking Cost" icon="🎭" defaultOpen={false}>
              <p className="text-[11px] leading-5 opacity-75 italic">{result.masking_cost}</p>
            </Panel>
            <Panel title="Research Tags" icon="🔬" defaultOpen={false}>
              <div className="flex flex-wrap gap-1">
                {result.research_tags.map((tag) => (
                  <span key={tag} className="rounded border border-foreground/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] opacity-60">{tag}</span>
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
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-1">[{c.id}] {c.label}</div>
                <div className="text-[11px] leading-5 opacity-60">{c.excerpt}</div>
              </div>
            ))}
          </div>
        </details>

        {/* Actions */}
        <div className="flex gap-3 justify-between">
          <button type="button" onClick={() => router.push("/history")}
            className="h-9 rounded border border-foreground/20 px-4 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/40">
            ← History
          </button>
          <button type="button" onClick={() => router.push("/")}
            className="h-9 rounded bg-foreground px-4 text-[10px] uppercase tracking-[0.2em] text-background hover:opacity-90">
            New simulation
          </button>
        </div>
      </div>
    </div>
  );
}
