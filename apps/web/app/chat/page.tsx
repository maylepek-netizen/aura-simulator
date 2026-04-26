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

const SITUATION_BANK: { category: string; items: string[] }[] = [
  {
    category: "Daily Life",
    items: [
      "Waiting at the doctor's office",
      "Supermarket with bright fluorescent lights",
      "Morning routine disrupted",
      "Eating at a noisy restaurant",
      "Getting a haircut from a new person",
      "Crowded public bathroom",
    ],
  },
  {
    category: "Social",
    items: [
      "Birthday party with strangers",
      "Meeting someone new for the first time",
      "Group conversation at school",
      "Unexpected phone call",
      "Being asked a question in front of the class",
      "Family dinner with many relatives",
    ],
  },
  {
    category: "Sensory",
    items: [
      "Crowded mall on a weekend",
      "Loud construction nearby",
      "Scratchy clothing tag",
      "Strong perfume in a small elevator",
      "Sudden fire alarm",
      "Flickering fluorescent light",
    ],
  },
  {
    category: "Change & Unexpected",
    items: [
      "Mom changed her haircut",
      "Furniture moved at home",
      "Different route to school",
      "Plans cancelled last minute",
      "Substitute teacher unexpectedly",
      "Power outage at home",
    ],
  },
  {
    category: "Nature & Alone",
    items: [
      "Walking alone in a park",
      "Beach with a crowd",
      "Empty room at night",
      "Forest path alone",
      "Sitting by the sea at sunset",
      "Thunderstorm outside",
    ],
  },
];

function nowIso() {
  return new Date().toISOString();
}

export default function ChatPage() {
  const router = useRouter();
  const iso = useMemo(() => nowIso(), []);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
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
    setInput("");
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
          onClick={() => router.push("/bank")}
          className="text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 border border-foreground/20 rounded px-3 py-1.5 transition-all hover:border-foreground/40"
        >
          📁 Situation Bank
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16 pt-2 sm:px-6">
        <div className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-foreground/15">
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
                placeholder="Describe a situation…"
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

        {/* Quick suggestions — below the input box */}
        {!processing && (() => {
          const allItems = SITUATION_BANK.flatMap((g) => g.items);
          const visible = showAllSuggestions ? allItems : allItems.slice(0, 3);
          return (
            <div className="mt-3 px-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] opacity-35">Quick suggestions</span>
                {!showAllSuggestions && (
                  <button
                    type="button"
                    onClick={() => setShowAllSuggestions(true)}
                    className="text-[9px] uppercase tracking-[0.15em] opacity-35 hover:opacity-70 transition-opacity"
                  >
                    Show more →
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visible.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className={[
                      "rounded border px-2 py-0.5 text-[9px] leading-5 tracking-[0.08em] transition-all",
                      input === s
                        ? "border-foreground/40 bg-foreground/10 opacity-100"
                        : "border-foreground/12 opacity-40 hover:border-foreground/30 hover:opacity-80",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
