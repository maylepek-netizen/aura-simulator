"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadExperienceDraft, loadProfile } from "@/lib/experienceStorage";
import { CITATIONS } from "@/lib/researchCitations";
import { EMPATHY_SYSTEM_INSTRUCTIONS } from "@/lib/empathySystemInstructions";

type Section = {
  title: string;
  items: string[];
};

function scoreSituation(s: string) {
  const t = s.toLowerCase();
  const has = (re: RegExp) => re.test(t);

  const auditory =
    (has(/loud|music|party|birthday|crowd|speaker|mic|clap|bus|train|alarm/) ? 2 : 0) +
    (has(/supermarket|mall|checkout|trolley|cart|queue/) ? 1 : 0);

  const visual =
    (has(/bright|lights|fluorescent|screen|neon|signs|aisle/) ? 2 : 0) +
    (has(/crowd|busy|movement|people|hallway/) ? 1 : 0);

  const tactile =
    (has(/tight|itch|scratch|tags|fabric|touch|bump|packed/) ? 2 : 0) +
    (has(/bus|crowd|queue|line/) ? 1 : 0);

  const social =
    (has(/talk|conversation|small talk|friends|strangers|teacher|cashier/) ? 2 : 0) +
    (has(/birthday|party|school|meeting/) ? 1 : 0);

  return {
    auditory: Math.min(3, auditory),
    visual: Math.min(3, visual),
    tactile: Math.min(3, tactile),
    social: Math.min(3, social),
  };
}

function bar(n: number, max = 3) {
  return "█".repeat(n) + "░".repeat(Math.max(0, max - n));
}

function nowIso() {
  return new Date().toISOString();
}

export default function ResultPage() {
  const router = useRouter();
  const iso = useMemo(() => nowIso(), []);

  const [snapshot] = useState(() => {
    if (typeof window === "undefined") {
      return {
        profileName: "",
        age: 0,
        gender: "",
        situation: "",
        hasProfile: false,
        hasDraft: false,
      };
    }
    const p = loadProfile();
    const d = loadExperienceDraft();
    return {
      profileName: p?.name ?? "",
      age: p?.age ?? 0,
      gender: p?.gender ?? "",
      situation: d?.situation ?? "",
      hasProfile: Boolean(p),
      hasDraft: Boolean(d),
    };
  });

  useEffect(() => {
    if (!snapshot.hasProfile) {
      router.replace("/");
      return;
    }
    if (!snapshot.hasDraft) {
      router.replace("/chat");
      return;
    }
  }, [router, snapshot.hasDraft, snapshot.hasProfile]);

  const ready = snapshot.hasProfile && snapshot.hasDraft;
  const situation = snapshot.situation;
  const profileName = snapshot.profileName || "User";
  const age = snapshot.age;
  const gender = snapshot.gender;

  const scores = useMemo(
    () => scoreSituation(situation || ""),
    [situation],
  );

  const analysis = useMemo((): {
    monologue: Section;
    sensory: Section;
    emotions: Section;
    actions: Section;
  } => {
    const who = `${profileName}${age ? ` (${age})` : ""}${gender ? `, ${gender}` : ""}`;

    const monologue: Section = {
      title: "Internal Monologue (Stream)",
      items: [
        `${profileName}, I walk in and the room hits me all at once. I can’t turn it down. [G-AUD]`,
        `Don’t stare. Don’t flinch. Keep moving like everyone else. Keep it normal. [DEP]`,
        `The details won’t stay in the background—every label, every flicker, every tiny movement pulls me by the eyes. [EPF]`,
        `Pick an anchor. Edge of the room. Exit. Quiet corner. A straight line to follow. [EPF]`,
        `Someone says my name. I lose the sentence I was holding. It snaps. It’s gone.`,
        `I can feel my face trying to arrange itself into “fine.” I’m performing while I’m drowning. [DEP]`,
        `If I ask them to repeat, they’ll think I’m rude. If I guess, I’ll be wrong. Either way: misunderstanding. [DEP]`,
        `My brain is doing math on noise. I’m counting seconds between sounds. I’m predicting collisions. I’m scanning for spikes. [G-AUD][EPF]`,
        `I tell myself: one more minute. One more breath. One more step.`,
        `Everything is too fast. Too bright. Too close. And I have to look calm anyway.`,
        `I’m not broken. This is a mismatch—two worlds trying to talk past each other. [DEP]`,
        `LOG: subject=${who} / situation="${situation}" / load=↑`,
      ],
    };

    const sensory: Section = {
      title: "Sensory (What my body is doing)",
      items: [
        `Audio: ${bar(scores.auditory)} — it’s like an open microphone in my head. Every scrape is amplified. I can’t modulate it. [G-AUD]`,
        `Light/visual: ${bar(scores.visual)} — my attention locks onto sharp edges and tiny changes. Motion becomes noise. Detail won’t let go. [EPF]`,
        `Touch: ${bar(scores.tactile)} — fabric feels abrasive; contact lingers like a bruise. My skin feels too tight for my body. [G-TAC]`,
        `Heart: racing in short bursts, like it’s bracing for impact.`,
        `Breath: shallow. Jaw tight. Hands damp. Shoulders up near my ears.`,
      ],
    };

    const emotions: Section = {
      title: "Emotions (Raw)",
      items: [
        `Panic-at-the-edges: not dramatic, just constant. A quiet alarm under my ribs. [G-AUD]`,
        `Anger that isn’t anger—more like my nervous system yelling “STOP.” [G-AUD]`,
        `Shame flashes when my timing is off and people read me as cold or weird. [DEP]`,
        `Relief is physical when I find a pattern: a rhythm, a predictable corner, a way out.`,
      ],
    };

    const actions: Section = {
      title: "Likely Actions (Coping / Survival)",
      items: [
        `I shorten my sentences. I nod when I’m not sure. I script. [DEP]`,
        `I scan for exits and edges. I choose routes with fewer surprises. [EPF]`,
        `I try to reduce peaks: step away, cover ears, steady my breathing. [G-AUD]`,
        `If it keeps rising: shutdown (silent, blank, frozen) or a burst of escape. Either is my body protecting itself.`,
      ],
    };

    // Situation-specific nudges (keep visceral + cited)
    if (scores.auditory >= 2) {
      sensory.items.push(
        `Sudden peaks feel like a drill hitting a nerve; my whole body startles before I can think. [G-AUD]`,
      );
      actions.items.unshift(
        `I hold my breath without noticing. Then I remember to exhale, slow, like defusing something. [G-AUD]`,
      );
    }
    if (scores.visual >= 2) {
      sensory.items.push(
        `My eyes keep grabbing details I don’t want. It’s exhausting—like my gaze has magnets. [EPF]`,
      );
      actions.items.push(
        `I stare at the floor line / a fixed shape to quiet the motion. [EPF]`,
      );
    }
    if (scores.social >= 2) {
      monologue.items.splice(6, 0, `I’m calculating the “right” face. The “right” pause. It’s work. [DEP]`);
      emotions.items.push(
        `The hardest part is being misread while I’m already overwhelmed—like my effort is invisible. [DEP]`,
      );
      actions.items.push(
        `I try to clarify directly, but it can land wrong—cross-neurotype expectations collide. [DEP]`,
      );
    }

    return { monologue, sensory, emotions, actions };
  }, [age, gender, profileName, scores, situation]);

  if (!ready) return null;

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
          <div className="opacity-80">{profileName}</div>
        </div>
        <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>build: dev</div>
          <div className="opacity-80">proto: v0.1</div>
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

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-foreground/15">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-size:44px_44px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.28)_1px,transparent_1px)]" />

          <div className="relative flex flex-col gap-2 border-b border-foreground/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                analysis / simulation
              </div>
              <div className="mt-1 text-sm opacity-80">
                Situation: <span className="opacity-100">{situation}</span>
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
              audio {bar(scores.auditory)} · visual {bar(scores.visual)} · touch{" "}
              {bar(scores.tactile)} · social {bar(scores.social)}
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-0 lg:grid-cols-12">
            {/* Monologue: dominant */}
            <section className="lg:col-span-7 px-5 py-9 sm:px-8">
              <div className="flex items-baseline justify-between gap-6">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-90">
                  {analysis.monologue.title}
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] opacity-55 text-right">
                  case: {profileName}
                </div>
              </div>
              <div className="mt-5 space-y-3 text-base leading-7 opacity-90">
                {analysis.monologue.items.map((t, i) => (
                  <div
                    key={i}
                    className="border-l border-foreground/15 pl-3"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </section>

            {/* Right stack */}
            <div className="lg:col-span-5 border-t border-foreground/15 lg:border-t-0 lg:border-l lg:border-foreground/15">
              {[analysis.sensory, analysis.emotions, analysis.actions].map((sec, idx) => (
                <section
                  key={sec.title}
                  className={[
                    "px-5 py-8 sm:px-8",
                    idx > 0 ? "border-t border-foreground/15" : "",
                  ].join(" ")}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                    {sec.title}
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 opacity-80">
                    {sec.items.map((t, i) => (
                      <li key={i} className="border-l border-foreground/15 pl-3">
                        {t}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div className="relative border-t border-foreground/15 px-5 py-6 sm:px-8">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
              validation (quiet science, loud experience)
            </div>
            <div className="mt-3 text-sm leading-6 opacity-70">
              The text above is written to be felt. The papers below are used only to keep the experience accurate.
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {CITATIONS.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-foreground/15 bg-transparent p-3"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                      [{c.id}] {c.label}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.22em] opacity-50 text-right">
                      {c.filename}
                    </div>
                  </div>
                  <div className="mt-2 text-sm leading-6 opacity-75">
                    {c.excerpt}
                  </div>
                </div>
              ))}
            </div>
            <details className="mt-5 rounded-md border border-foreground/15 p-3">
              <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em] opacity-75">
                system instructions (empathy rules)
              </summary>
              <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-5 opacity-70">
                {EMPATHY_SYSTEM_INSTRUCTIONS}
              </pre>
            </details>
          </div>

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

        <div className="mt-8 h-px w-full bg-foreground/15" />
        <footer className="mt-5 flex flex-col gap-2 text-[10px] uppercase tracking-[0.22em] opacity-70 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aura</div>
          <div>note: educational simulation, not diagnosis</div>
        </footer>
      </main>
    </div>
  );
}

