"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Activity,
  Waves,
  Eye,
  Hand,
  Volume2,
  Zap,
  Play,
  Radio,
  Terminal,
} from "lucide-react";

type MonologueItem = {
  text: string;
  tag: string;
};

const MONOLOGUE_SEQUENCE: MonologueItem[] = [
  { text: "I walk in and the room hits me all at once. I can't turn it down.", tag: "G-AUD" },
  { text: "Don't stare. Don't flinch. Keep moving like everyone else.", tag: "DEP" },
  { text: "The details won't stay in the background—every label, every flicker pulls me by the eyes.", tag: "EPF" },
  { text: "Pick an anchor. Edge of the room. Exit. Quiet corner.", tag: "EPF" },
  { text: "Someone says my name. I lose the sentence I was holding.", tag: "DEP" },
  { text: "I can feel my face trying to arrange itself into 'fine.'", tag: "DEP" },
  { text: "My brain is doing math on noise. Counting seconds between sounds.", tag: "G-AUD" },
  { text: "Everything is too fast. Too bright. Too close.", tag: "SEN" },
  { text: "I tell myself: one more minute. One more breath.", tag: "REG" },
  { text: "I'm not broken. This is a mismatch—two worlds trying to talk past each other.", tag: "DEP" },
];

function useTypingEffect(text: string, isActive: boolean, speed = 35) {
  const [displayed, setDisplayed] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setDisplayed("");
      setIsComplete(false);
      return;
    }

    let index = 0;
    setDisplayed("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayed(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isActive, speed]);

  return { displayed, isComplete };
}

function Waveform({ intensity, color = "white" }: { intensity: number; color?: string }) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newBars = Array.from({ length: 24 }, () =>
        Math.random() * intensity * 0.8 + intensity * 0.2
      );
      setBars(newBars);
    }, 80);
    return () => clearInterval(interval);
  }, [intensity]);

  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-[2px] bg-current transition-all duration-75"
          style={{
            height: `${Math.max(2, height * 32)}px`,
            opacity: 0.4 + (height * 0.6),
          }}
        />
      ))}
    </div>
  );
}

function IntensityMeter({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em]">
        <span className="opacity-70">{label}</span>
        <span className="opacity-90 tabular-nums">{value}</span>
      </div>
      <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground/60 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function formatUTCTime(date: Date) {
  return date.toISOString().slice(11, 19) + " UTC";
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentMonologueIndex, setCurrentMonologueIndex] = useState(0);
  const [monologueHistory, setMonologueHistory] = useState<MonologueItem[]>([]);
  const [situation, setSituation] = useState("");
  const [sensoryData, setSensoryData] = useState({
    audio: 45,
    visual: 38,
    tactile: 22,
    cognitive: 55,
  });

  const monologueRef = useRef<HTMLDivElement>(null);
  const currentItem = MONOLOGUE_SEQUENCE[currentMonologueIndex];
  const { displayed, isComplete } = useTypingEffect(
    currentItem?.text || "",
    isSimulating
  );

  // Update time
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate sensory fluctuations
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSensoryData((prev) => ({
        audio: Math.min(100, Math.max(20, prev.audio + (Math.random() - 0.45) * 15)),
        visual: Math.min(100, Math.max(15, prev.visual + (Math.random() - 0.45) * 12)),
        tactile: Math.min(100, Math.max(10, prev.tactile + (Math.random() - 0.5) * 10)),
        cognitive: Math.min(100, Math.max(30, prev.cognitive + (Math.random() - 0.4) * 18)),
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [isSimulating]);

  // Advance monologue
  useEffect(() => {
    if (!isSimulating || !isComplete) return;

    const timeout = setTimeout(() => {
      setMonologueHistory((prev) => [...prev, currentItem]);
      if (currentMonologueIndex < MONOLOGUE_SEQUENCE.length - 1) {
        setCurrentMonologueIndex((i) => i + 1);
      } else {
        setIsSimulating(false);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isComplete, isSimulating, currentMonologueIndex, currentItem]);

  // Auto-scroll monologue
  useEffect(() => {
    monologueRef.current?.scrollTo({
      top: monologueRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [monologueHistory, displayed]);

  const handleSimulate = useCallback(() => {
    if (!situation.trim()) return;
    setIsSimulating(true);
    setCurrentMonologueIndex(0);
    setMonologueHistory([]);
    setSensoryData({
      audio: 45 + Math.random() * 20,
      visual: 38 + Math.random() * 20,
      tactile: 22 + Math.random() * 15,
      cognitive: 55 + Math.random() * 20,
    });
  }, [situation]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Subtle grid overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] [background-size:60px_60px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.5)_1px,transparent_1px)]" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-foreground/60" />
              <span className="text-[11px] uppercase tracking-[0.3em] opacity-80">
                Aura
              </span>
            </div>
            <div className="h-4 w-px bg-foreground/15" />
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-60">
              LOG: subject=may (26)
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-60 tabular-nums">
              {formatUTCTime(currentTime)}
            </div>
            <div className="h-4 w-px bg-foreground/15" />
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isSimulating
                    ? "bg-foreground animate-pulse"
                    : "bg-foreground/40"
                }`}
              />
              <span className="text-[10px] uppercase tracking-[0.22em] opacity-80">
                {isSimulating ? "ACTIVE" : "READY"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="pt-[60px] min-h-screen flex">
        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:pr-[280px]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Central Experience Zone - Video Container */}
            <section className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Radio className="h-3.5 w-3.5 opacity-60" />
                  <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                    Experience Zone
                  </span>
                </div>
                {isSimulating && (
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-foreground animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.22em] opacity-60">
                      REC
                    </span>
                  </div>
                )}
              </div>

              <div className="relative aspect-video rounded-xl border border-foreground/15 overflow-hidden bg-foreground/[0.02]">
                {/* Abstract visualization placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isSimulating ? (
                    <div className="relative w-full h-full">
                      {/* Animated noise/static effect */}
                      <div className="absolute inset-0 opacity-20">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-px bg-foreground/30"
                            style={{
                              left: `${5 + i * 5}%`,
                              top: "20%",
                              height: `${40 + Math.random() * 40}%`,
                              animation: `pulse ${1 + Math.random()}s ease-in-out infinite`,
                              animationDelay: `${Math.random() * 2}s`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Activity className="h-12 w-12 opacity-20 mx-auto animate-pulse" />
                          <div className="mt-4 text-[10px] uppercase tracking-[0.22em] opacity-40">
                            Processing Sensory Data
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Play className="h-16 w-16 opacity-10 mx-auto" />
                      <div className="mt-4 text-[10px] uppercase tracking-[0.22em] opacity-30">
                        Awaiting Simulation
                      </div>
                    </div>
                  )}
                </div>

                {/* Corner markers */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l border-t border-foreground/20" />
                <div className="absolute top-4 right-4 w-6 h-6 border-r border-t border-foreground/20" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l border-b border-foreground/20" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r border-b border-foreground/20" />
              </div>
            </section>

            {/* Internal Monologue Stream */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                  Internal Monologue
                </span>
              </div>

              <div className="rounded-xl border border-foreground/15 overflow-hidden bg-foreground/[0.02]">
                <div
                  ref={monologueRef}
                  className="h-[200px] overflow-y-auto p-5 space-y-3"
                >
                  {monologueHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border border-foreground/20 rounded opacity-60">
                        {item.tag}
                      </span>
                      <span className="text-sm leading-relaxed opacity-80">
                        {item.text}
                      </span>
                    </div>
                  ))}

                  {isSimulating && displayed && (
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 border border-foreground/30 rounded opacity-80">
                        {currentItem.tag}
                      </span>
                      <span className="text-sm leading-relaxed opacity-90">
                        {displayed}
                        <span className="inline-block w-[2px] h-4 bg-foreground/60 ml-0.5 animate-pulse" />
                      </span>
                    </div>
                  )}

                  {!isSimulating && monologueHistory.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[10px] uppercase tracking-[0.22em] opacity-30">
                        Stream inactive — describe a situation to begin
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Input Area */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                  Situation Input
                </span>
              </div>

              <div className="rounded-xl border border-foreground/15 overflow-hidden bg-foreground/[0.02] p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSimulating) handleSimulate();
                    }}
                    disabled={isSimulating}
                    placeholder="Describe a situation..."
                    className="flex-1 h-11 bg-transparent border border-foreground/15 rounded-lg px-4 text-sm outline-none focus:border-foreground/30 transition-colors placeholder:opacity-40 disabled:opacity-40"
                  />
                  <button
                    onClick={handleSimulate}
                    disabled={isSimulating || !situation.trim()}
                    className="h-11 px-6 bg-foreground text-background rounded-lg text-[11px] uppercase tracking-[0.22em] font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? "Processing" : "Simulate"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Right Sidebar - Analytics */}
        <aside className="hidden lg:block fixed right-0 top-[60px] bottom-0 w-[260px] border-l border-foreground/10 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="p-5 space-y-8">
            {/* Sensory Channels */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Activity className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                  Sensory Channels
                </span>
              </div>

              <div className="space-y-6">
                {/* Audio */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3 w-3 opacity-50" />
                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
                      Auditory
                    </span>
                  </div>
                  <Waveform intensity={isSimulating ? sensoryData.audio / 100 : 0.2} />
                  <IntensityMeter value={Math.round(sensoryData.audio)} label="Level" />
                </div>

                {/* Visual */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3 opacity-50" />
                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
                      Visual
                    </span>
                  </div>
                  <Waveform intensity={isSimulating ? sensoryData.visual / 100 : 0.15} />
                  <IntensityMeter value={Math.round(sensoryData.visual)} label="Level" />
                </div>

                {/* Tactile */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hand className="h-3 w-3 opacity-50" />
                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
                      Tactile
                    </span>
                  </div>
                  <Waveform intensity={isSimulating ? sensoryData.tactile / 100 : 0.1} />
                  <IntensityMeter value={Math.round(sensoryData.tactile)} label="Level" />
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px w-full bg-foreground/10" />

            {/* Cognitive Load */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Waves className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                  Cognitive Load
                </span>
              </div>

              <div className="relative h-24 border border-foreground/15 rounded-lg overflow-hidden bg-foreground/[0.02]">
                <div className="absolute inset-0 flex items-end justify-center p-2">
                  <div
                    className="w-full bg-foreground/20 rounded-t transition-all duration-500"
                    style={{ height: `${sensoryData.cognitive}%` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl tabular-nums opacity-80">
                    {Math.round(sensoryData.cognitive)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] opacity-50">
                <span>Low</span>
                <span>High</span>
              </div>
            </section>

            {/* Divider */}
            <div className="h-px w-full bg-foreground/10" />

            {/* System Status */}
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] opacity-70 mb-4">
                System Status
              </div>

              <div className="space-y-2 text-[10px] opacity-60">
                <div className="flex justify-between">
                  <span>Mode</span>
                  <span className="opacity-80">
                    {isSimulating ? "SIMULATION" : "STANDBY"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Frames</span>
                  <span className="tabular-nums opacity-80">
                    {isSimulating ? "60fps" : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Latency</span>
                  <span className="tabular-nums opacity-80">
                    {isSimulating ? "24ms" : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Build</span>
                  <span className="opacity-80">v0.1-dev</span>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
