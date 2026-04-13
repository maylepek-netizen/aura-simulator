"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  unsplash_query?: string;video_prompt?: string;
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

function bar(n: number, max = 3) {
  const filled = Math.round(Math.min(max, Math.max(0, n)));
  return "█".repeat(filled) + "░".repeat(Math.max(0, max - filled));
}

function nowIso() {
  return new Date().toISOString();
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
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!snapshot.hasProfile) router.replace("/");
    else if (!snapshot.hasDraft) router.replace("/chat");
  }, [router, snapshot]);

  useEffect(() => {
    if (snapshot.hasProfile && snapshot.hasDraft) {
      void runSimulation();
    }
  }, []);

  async function runSimulation() {
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setVideoLoading(false);

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
          if (v.uri) setVideoUrl("/api/video-proxy?uri=" + encodeURIComponent(v.uri));
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

  function toggleAudio() {
    if (!result) return;
    if (audioPlaying) {
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
      return;
    }
    const text = result.monologue.join(". ");
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.85;
    utt.pitch = 0.9;
    utt.onend = () => setAudioPlaying(false);
    audioRef.current = utt;
    window.speechSynthesis.speak(utt);
    setAudioPlaying(true);
  }

  if (!snapshot.hasProfile || !snapshot.hasDraft) return null;

  const load = result?.overall_load ?? 0;
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
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 border border-foreground/20 rounded px-3 py-1"
        >
          New →
        </button>
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

            {/* LEFT PANEL - Thoughts + Audio */}
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

              {/* Audio button */}
              <button
                type="button"
                onClick={toggleAudio}
                className={[
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-all",
                  audioPlaying
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-foreground/20 opacity-60 hover:opacity-100",
                ].join(" ")}
              >
                <span className="text-base">{audioPlaying ? "⏹" : "🔊"}</span>
                {audioPlaying ? "Stop narration" : "Play narration"}
              </button>

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
            <div className="relative rounded-xl overflow-hidden border border-foreground/15 bg-black min-h-[320px] lg:min-h-0">
              {/* Video or loading */}
              {videoUrl ? (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
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
                  {/* Chromatic aberration */}
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
                  {/* Vignette */}
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
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
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
