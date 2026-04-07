"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadProfile,
  saveExperienceDraft,
  type ExperienceDraft,
} from "@/lib/experienceStorage";

type ChatItem =
  | { role: "system"; text: string }
  | { role: "user"; text: string }
  | { role: "assistant"; text: string };

const PRESETS = [
  "Busy Supermarket",
  "Loud Birthday Party",
  "School Hallway Between Classes",
  "Crowded Bus Ride",
];

function nowIso() {
  return new Date().toISOString();
}

export default function ChatPage() {
  const router = useRouter();
  const iso = useMemo(() => nowIso(), []);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([
    {
      role: "system",
      text: "Step 2/3 — describe a situation. Choose a preset or type your own.",
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) router.replace("/");
  }, [router]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [items, processing]);

  async function sendSituation(situation: string) {
    const trimmed = situation.trim();
    if (!trimmed || processing) return;

    setProcessing(true);
    setItems((prev) => [...prev, { role: "user", text: trimmed }]);
    setItems((prev) => [
      ...prev,
      { role: "assistant", text: "Processing…" },
    ]);

    const draft: ExperienceDraft = { situation: trimmed, createdAtIso: nowIso() };
    saveExperienceDraft(draft);

    await new Promise((r) => setTimeout(r, 1300));
    router.push("/result");
  }

  return (
    <div className="relative flex-1">
      {/* Corner telemetry */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>Aura / simulator</div>
          <div className="opacity-80">t={iso}</div>
        </div>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>route /chat</div>
          <div className="opacity-80">step 2/3</div>
        </div>
        <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>sys.log</div>
          <div className="opacity-80">
            status={processing ? "processing" : "idle"}
          </div>
        </div>
        <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>build: dev</div>
          <div className="opacity-80">proto: v0.1</div>
        </div>
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
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

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6">
        <div className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-2xl border border-foreground/15">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-size:44px_44px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.28)_1px,transparent_1px)]" />

          <div className="relative flex items-center justify-between border-b border-foreground/15 px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
              situation selection
            </div>
            <div className="flex items-center gap-2">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  processing ? "bg-white/70 animate-pulse" : "bg-white/40",
                ].join(" ")}
              />
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                {processing ? "processing" : "ready"}
              </div>
            </div>
          </div>

          <div
            ref={listRef}
            className="relative flex-1 overflow-auto px-5 py-6 sm:px-8"
          >
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className={[
                    "max-w-[78%] rounded-md border px-3 py-2 text-sm leading-6",
                    it.role === "user"
                      ? "ml-auto border-foreground/25 bg-white/5"
                      : "border-foreground/15 bg-transparent",
                  ].join(" ")}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-[0.22em] opacity-60">
                    {it.role}
                  </div>
                  <div className={it.text.includes("…") ? "opacity-80" : ""}>
                    {it.text}
                    {it.role === "assistant" && it.text.startsWith("Processing") ? (
                      <span className="ml-2 inline-flex items-center gap-1 align-middle">
                        <span className="h-1 w-1 rounded-full bg-white/60 animate-pulse [animation-delay:0ms]" />
                        <span className="h-1 w-1 rounded-full bg-white/60 animate-pulse [animation-delay:150ms]" />
                        <span className="h-1 w-1 rounded-full bg-white/60 animate-pulse [animation-delay:300ms]" />
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative border-t border-foreground/15 px-5 py-4 sm:px-8">
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={processing}
                  onClick={() => sendSituation(p)}
                  className="h-9 rounded-md border border-foreground/20 px-3 text-[11px] uppercase tracking-[0.22em] opacity-90 hover:border-foreground/35 disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void sendSituation(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={processing}
                className="h-11 flex-1 rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground/40 disabled:opacity-50"
                placeholder="Type a situation…"
              />
              <button
                type="submit"
                disabled={processing || !input.trim()}
                className="h-11 rounded-md bg-foreground px-4 text-[11px] uppercase tracking-[0.22em] text-background hover:opacity-90 disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

