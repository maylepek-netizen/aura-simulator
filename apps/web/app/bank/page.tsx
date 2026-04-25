"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSimulations } from "@/lib/simulationStorage";
import type { SimulationRecord } from "@/lib/simulationStorage";

function LoadBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[9px] font-mono opacity-40 whitespace-nowrap">{value}%</span>
    </div>
  );
}

export default function BankPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecords(loadSimulations().slice().reverse());
    setLoading(false);
  }, []);

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full border border-foreground/60" />
          <div className="text-xs tracking-[0.26em] uppercase opacity-80">Aura</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">Simulation Bank</div>
          <div className="text-[9px] uppercase tracking-[0.15em] opacity-40 mt-0.5">Previously generated · Replay at zero cost</div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 border border-foreground/20 rounded px-3 py-1 transition-all"
        >
          ← Back
        </button>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center pt-20">
            <div className="h-5 w-5 rounded-full border border-foreground/20 border-t-foreground/80 animate-spin" />
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-40">No simulations saved yet</div>
            <p className="text-[11px] opacity-40 text-center max-w-xs">
              Run a simulation and click "Save this simulation" to store it here for free replay.
            </p>
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="text-[10px] uppercase tracking-[0.2em] border border-foreground/20 rounded px-4 py-2 hover:border-foreground/40"
            >
              Start a simulation
            </button>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {records.map((rec) => {
              const load = (rec.result as { overall_load?: number }).overall_load ?? 0;
              const loadColor = load > 70 ? "#e05c5c" : load > 45 ? "#c8a882" : "#5ce08c";
              const date = new Date(rec.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              });
              const time = new Date(rec.createdAt).toLocaleTimeString("en-GB", {
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <div
                  key={rec.id}
                  className="rounded-xl border border-foreground/15 bg-foreground/[0.02] p-4 flex flex-col gap-3"
                >
                  <p className="text-[11px] leading-5 opacity-80 line-clamp-3 flex-1">
                    {rec.situation}
                  </p>

                  <LoadBar value={load} color={loadColor} />

                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.15em] opacity-40">{rec.name} · {rec.gender}</div>
                      <div className="text-[9px] uppercase tracking-[0.15em] opacity-30">Age {rec.age}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono opacity-40">{date}</div>
                      <div className="text-[9px] font-mono opacity-25">{time}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/bank/" + rec.id)}
                    className="mt-1 h-8 rounded border border-foreground/25 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/50 hover:bg-foreground/5 transition-all"
                  >
                    ▶ Replay
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
