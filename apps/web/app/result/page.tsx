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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bar(n: number, max = 3) {
  const filled = Math.round(Math.min(max, Math.max(0, n)));
  return "█".repeat(filled) + "░".repeat(Math.max(0, max - filled));
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Glitch Canvas ────────────────────────────────────────────────────────────

function GlitchOverlay({
  effect,
  load,
}: {
  effect: SimulationResult["visual_effect"];
  load: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const intensity = load / 100;
    const numBlocks =
      effect === "calm"
        ? 8
        : effect === "glitch_light"
          ? 25
          : effect === "glitch_medium"
            ? 55
            : 90;

    const opacity =
      effect === "calm"
        ? 0.06
        : effect === "glitch_light"
          ? 0.12
          : effect === "glitch_medium"
            ? 0.22
            : 0.38;

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < numBlocks; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = Math.random() * 20 + 3;
        const h = Math.random() * (w * 4) + 1;
        const r = Math.random();
        if (r < 0.3)
          ctx.fillStyle = `rgba(200,168,130,${Math.random() * opacity + 0.03})`;
        else if (r < 0.55)
          ctx.fillStyle = `rgba(220,80,80,${Math.random() * opacity + 0.02})`;
        else if (r < 0.8)
          ctx.fillStyle = `rgba(80,130,220,${Math.random() * opacity + 0.02})`;
        else
          ctx.fillStyle = `rgba(240,236,228,${Math.random() * opacity * 0.5})`;
        ctx.fillRect(x, y, w, h);
      }

      // Horizontal glitch lines
      if (effect !== "calm" && Math.random() < intensity * 0.12) {
        const ly = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(240,236,228,${Math.random() * 0.15})`;
        ctx.fillRect(0, ly, canvas.width, Math.random() * 3 + 1);
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [effect, load]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 1 }}
    />
  );
}

// ─── Chromatic Aberration ─────────────────────────────────────────────────────

function ChromaticLayers({ load }: { load: number }) {
  const intensity = load / 100;
  const shift = Math.round(intensity * 10);
  if (shift < 1) return null;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `rgba(220,80,80,${intensity * 0.12})`,
          transform: `translateX(${shift}px)`,
          mixBlendMode: "screen",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `rgba(80,130,220,${intensity * 0.12})`,
          transform: `translateX(-${shift}px)`,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}

// ─── Monologue Panel ──────────────────────────────────────────────────────────

function MonologuePanel({
  lines,
  isOpen,
  onClose,
}: {
  lines: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={[
        "absolute inset-y-0 right-0 z-30 w-72 overflow-y-auto border-l border-foreground/15 bg-background/95 px-5 py-6 transition-transform duration-300 ease-out sm:w-80",
        isOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">
          internal monologue
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-[0.22em] opacity-50 hover:opacity-100"
        >
          close ✕
        </button>
      </div>
      <div className="space-y-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className="border-l border-foreground/20 pl-3 text-sm leading-6 opacity-85"
            style={{
              animationDelay: `${i * 80}ms`,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overload Overlay ─────────────────────────────────────────────────────────

function OverloadOverlay({ active, load }: { active: boolean; load: number }) {
  const shakeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !shakeRef.current) return;
    let frame: number;
    function shake() {
      if (!shakeRef.current) return;
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 4;
      shakeRef.current.style.transform = `translate(${dx}px,${dy}px)`;
      frame = requestAnimationFrame(shake);
    }
    shake();
    return () => {
      cancelAnimationFrame(frame);
      if (shakeRef.current) shakeRef.current.style.transform = "none";
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={shakeRef}
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.97) 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(220,80,80,${load / 600})`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const iso = useMemo(() => nowIso(), []);

  // Load saved data once
  const [snapshot] = useState(() => {
    if (typeof window === "undefined")
      return {
        name: "",
        age: 0,
        gender: "",
        situation: "",
        apiKey: "",
        hasProfile: false,
        hasDraft: false,
      };
    const p = loadProfile();
    const d = loadExperienceDraft();
    return {
      name: p?.name ?? "",
      age: p?.age ?? 0,
      gender: p?.gender ?? "",
      situation: d?.situation ?? "",
      apiKey:
        typeof window !== "undefined"
          ? (localStorage.getItem("aura.apikey.v1") ?? "")
          : "",
      hasProfile: Boolean(p),
      hasDraft: Boolean(d),
    };
  });

  // UI state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Initialising…");
  const [error, setError] = useState<string | null>(null);
  const [monologueOpen, setMonologueOpen] = useState(false);
  const [overloadActive, setOverloadActive] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(snapshot.apiKey);
  const [apiKeySaved, setApiKeySaved] = useState(Boolean(snapshot.apiKey));

  // Redirects
  useEffect(() => {
    if (!snapshot.hasProfile) router.replace("/");
    else if (!snapshot.hasDraft) router.replace("/chat");
  }, [router, snapshot]);

  // Auto-run if we already have a key
  useEffect(() => {
    if (snapshot.hasProfile && snapshot.hasDraft && snapshot.apiKey) {
      void runSimulation(snapshot.apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSimulation(key: string) {
    setLoading(true);
    setError(null);

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
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": key,
        },
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  function saveKey() {
    const k = apiKeyInput.trim();
    if (!k) return;
    localStorage.setItem("aura.apikey.v1", k);
    setApiKeySaved(true);
    void runSimulation(k);
  }

  if (!snapshot.hasProfile || !snapshot.hasDraft) return null;

  const load = result?.overall_load ?? 0;

  return (
    <div className="relative flex-1">
      {/* Corner telemetry */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>Aura / simulator</div>
          <div className="opacity-80">t={iso}</div>
        </div>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>route /result</div>
          <div className="opacity-80">step 3/3</div>
        </div>
        <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>case</div>
          <div className="opacity-80">{snapshot.name || "—"}</div>
        </div>
        <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>load</div>
          <div className="opacity-80">{result ? `${load}%` : "—"}</div>
        </div>
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full border border-foreground/60" />
          <div className="text-xs tracking-[0.26em] uppercase opacity-80">
            Aura
          </div>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="group inline-flex h-9 w-9 items-center justify-center rounded-md border border-foreground/15 bg-transparent hover:border-foreground/30"
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1">
            <span className="h-px w-4 bg-foreground/80 transition-transform group-hover:translate-x-[1px]" />
            <span className="h-px w-4 bg-foreground/80 transition-transform group-hover:translate-x-[-1px]" />
            <span className="h-px w-4 bg-foreground/80 transition-transform group-hover:translate-x-[1px]" />
          </span>
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">

        {/* ── API Key entry (if not saved) ── */}
        {!apiKeySaved && !loading && (
          <div className="mb-6 rounded-2xl border border-foreground/15 p-6">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-3">
              Google Gemini API Key Required
            </div>
            <p className="text-sm opacity-60 mb-4 leading-6">
              Enter your API key to run the simulation. Stored only in this browser.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="AIza…"
                className="h-11 flex-1 rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground/40 font-mono"
              />
              <button
                type="button"
                onClick={saveKey}
                disabled={!apiKeyInput.trim()}
                className="h-11 rounded-md bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:opacity-90 disabled:opacity-40"
              >
                Run
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <div className="flex min-h-[500px] flex-col items-center justify-center gap-6 rounded-2xl border border-foreground/15">
            <div className="h-8 w-8 rounded-full border border-foreground/20 border-t-foreground/80 animate-spin" />
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
              {loadMsg}
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="mb-6 rounded-2xl border border-foreground/20 p-6">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-2">
              Error
            </div>
            <p className="text-sm opacity-70 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => void runSimulation(apiKeyInput || snapshot.apiKey)}
              className="h-9 rounded-md border border-foreground/20 px-4 text-[11px] uppercase tracking-[0.22em] hover:border-foreground/40"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Result ── */}
        {result && !loading && (
          <>
            {/* Visual scene panel */}
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-foreground/15 bg-black"
              style={{ minHeight: "280px" }}>

              {/* Glitch canvas */}
              <GlitchOverlay effect={result.visual_effect} load={load} />

              {/* Chromatic aberration */}
              <ChromaticLayers load={load} />

              {/* Scanlines */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)",
                }}
              />

              {/* Vignette */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    "radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.82) 100%)",
                }}
              />

              {/* Overload overlay */}
              <OverloadOverlay active={overloadActive} load={load} />

              {/* Monologue side panel */}
              <MonologuePanel
                lines={result.monologue}
                isOpen={monologueOpen}
                onClose={() => setMonologueOpen(false)}
              />

              {/* Sensory bar */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 whitespace-nowrap">
                  sensory load
                </div>
                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${load}%`,
                      background:
                        load > 70
                          ? "#e05c5c"
                          : load > 45
                            ? "#c8a882"
                            : "#5ce08c",
                    }}
                  />
                </div>
                <div className="text-[9px] text-white/50 font-mono">{load}%</div>
              </div>

              {/* Scene caption */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-5 pt-10"
                style={{
                  background: "linear-gradient(0deg,rgba(0,0,0,0.88) 0%,transparent 100%)",
                }}>
                <p className="text-sm italic text-white/70 leading-6">
                  {result.scene_caption}
                </p>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 right-4 z-30 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMonologueOpen((v) => !v)}
                  className={[
                    "h-8 rounded-md border px-3 text-[10px] uppercase tracking-[0.2em] transition-colors",
                    monologueOpen
                      ? "border-white/40 bg-white/10 text-white/90"
                      : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80",
                  ].join(" ")}
                >
                  thoughts
                </button>
                <button
                  type="button"
                  onClick={() => setOverloadActive((v) => !v)}
                  className={[
                    "h-8 rounded-md border px-3 text-[10px] uppercase tracking-[0.2em] transition-colors",
                    overloadActive
                      ? "border-red-400/60 bg-red-400/10 text-red-300"
                      : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80",
                  ].join(" ")}
                >
                  ⚡ overload
                </button>
              </div>
            </div>

            {/* Main analysis grid */}
            <div className="relative overflow-hidden rounded-2xl border border-foreground/15">
              <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-size:44px_44px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.28)_1px,transparent_1px)]" />

              {/* Header */}
              <div className="relative flex flex-col gap-2 border-b border-foreground/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                    analysis / simulation
                  </div>
                  <div className="mt-1 text-sm opacity-70">
                    Situation:{" "}
                    <span className="opacity-100">{snapshot.situation}</span>
                  </div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                  aud {bar(result.sensory_scores.auditory)} · vis{" "}
                  {bar(result.sensory_scores.visual)} · tac{" "}
                  {bar(result.sensory_scores.tactile)} · soc{" "}
                  {bar(result.sensory_scores.social)}
                </div>
              </div>

              <div className="relative grid grid-cols-1 gap-0 lg:grid-cols-12">
                {/* Sensory channels */}
                <section className="lg:col-span-7 px-5 py-9 sm:px-8">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-5">
                    Sensory Channels (What my body is doing)
                  </div>
                  <div className="space-y-4">
                    {Object.entries(result.sensory_channels).map(
                      ([key, val]) => (
                        <div
                          key={key}
                          className="border-l border-foreground/15 pl-3"
                        >
                          <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">
                            {key}
                          </div>
                          <div className="text-sm leading-6 opacity-85">
                            {val}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-8 text-[11px] uppercase tracking-[0.22em] opacity-80 mb-5">
                    Masking Cost
                  </div>
                  <div className="border-l border-foreground/15 pl-3 text-sm leading-6 opacity-80 italic">
                    {result.masking_cost}
                  </div>
                </section>

                {/* Right stack */}
                <div className="lg:col-span-5 border-t border-foreground/15 lg:border-t-0 lg:border-l">
                  <section className="px-5 py-8 sm:px-8">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-4">
                      Emotions (Raw)
                    </div>
                    <ul className="space-y-3">
                      {result.emotions.map((e, i) => (
                        <li
                          key={i}
                          className="border-l border-foreground/15 pl-3 text-sm leading-6 opacity-80"
                        >
                          {e}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="border-t border-foreground/15 px-5 py-8 sm:px-8">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-4">
                      Likely Actions / Coping
                    </div>
                    <ul className="space-y-3">
                      {result.coping_actions.map((a, i) => (
                        <li
                          key={i}
                          className="border-l border-foreground/15 pl-3 text-sm leading-6 opacity-80"
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="border-t border-foreground/15 px-5 py-8 sm:px-8">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-4">
                      Research Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.research_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-foreground/20 px-2 py-1 text-[10px] uppercase tracking-[0.15em] opacity-70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Citations */}
              <div className="relative border-t border-foreground/15 px-5 py-6 sm:px-8">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 mb-3">
                  Research Sources
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {CITATIONS.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-foreground/15 p-3"
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                          [{c.id}] {c.label}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.22em] opacity-50 text-right">
                          {c.filename}
                        </div>
                      </div>
                      <div className="text-sm leading-6 opacity-70">
                        {c.excerpt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="relative border-t border-foreground/15 px-5 py-5 sm:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => router.push("/chat")}
                    className="h-11 rounded-md border border-foreground/20 px-4 text-[11px] uppercase tracking-[0.22em] hover:border-foreground/35"
                  >
                    Try New Situation
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="h-11 rounded-md bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:opacity-90"
                  >
                    Home
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
