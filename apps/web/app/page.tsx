"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Gender, OnboardingProfile } from "@/lib/experienceStorage";
import { saveProfile, clearExperienceDraft } from "@/lib/experienceStorage";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function OnboardingPage() {
  const router = useRouter();
  const [iso, setIso] = useState<string | null>(null);

  useEffect(() => {
    setIso(new Date().toISOString());
  }, []);

  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(22);
  const [gender, setGender] = useState<Gender>("Prefer not to say");
  const [error, setError] = useState<string | null>(null);

  function onStart() {
    const trimmed = name.trim();
    const normalizedAge = clamp(Number(age), 5, 120);

    if (!trimmed) {
      setError("Name is required.");
      return;
    }

    const profile: OnboardingProfile = {
      name: trimmed,
      age: normalizedAge,
      gender,
    };

    setError(null);
    saveProfile(profile);
    clearExperienceDraft();
    router.push("/chat");
  }

  return (
    <div className="relative flex-1">
      {/* Corner telemetry */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute left-4 top-4 sm:left-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>Aura / simulator</div>
          <div className="opacity-80">t={iso ?? "---"}</div>
        </div>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70 text-right">
          <div>route /</div>
          <div className="opacity-80">step 1/3</div>
        </div>
        <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-[10px] leading-4 tracking-[0.22em] uppercase opacity-70">
          <div>sys.log</div>
          <div className="opacity-80">status=ready</div>
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

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-2xl border border-foreground/15">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-size:44px_44px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.28)_1px,transparent_1px)]" />

          <div className="relative flex items-center justify-between border-b border-foreground/15 px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
              onboarding
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
              autism sensory simulator
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <section className="px-5 py-10 sm:px-8 sm:py-14">
              <h1 className="text-balance text-3xl leading-[1.1] tracking-[-0.02em] sm:text-5xl">
                Autism Sensory Simulator
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 opacity-75">
                A minimal, technical walkthrough of how a situation can feel
                internally—thoughts, sensory input, emotions, and likely actions—
                grounded in neurodiversity research.
              </p>

              <div className="mt-10 grid max-w-xl grid-cols-1 gap-4">
                <label className="grid gap-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                    Name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground/40"
                    placeholder="Enter name"
                    autoComplete="name"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                      Age
                    </span>
                    <input
                      value={String(age)}
                      onChange={(e) => setAge(Number(e.target.value))}
                      type="number"
                      min={5}
                      max={120}
                      className="h-11 rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground/40"
                      placeholder="22"
                      inputMode="numeric"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                      Gender
                    </span>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="h-11 rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground/40"
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </label>
                </div>

                {error ? (
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">
                    err: {error}
                  </div>
                ) : (
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                    note: data saved locally (this browser only)
                  </div>
                )}

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={onStart}
                    className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-[11px] uppercase tracking-[0.22em] text-background hover:opacity-90"
                  >
                    Start Experience
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-foreground/20 px-5 text-[11px] uppercase tracking-[0.22em] hover:border-foreground/35"
                  >
                    Open Dashboard
                  </button>
                </div>
              </div>
            </section>

            <aside className="border-t border-foreground/15 md:border-l md:border-t-0">
              <div className="px-5 py-6 sm:px-8 sm:py-10">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                  framing
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 opacity-75">
                  <p>
                    This simulator is not a diagnosis tool. It is an empathy and
                    education interface.
                  </p>
                  <p>
                    The output will emphasize sensory processing differences and
                    mutual misunderstanding in “cross-neurotype” interactions.
                  </p>
                </div>

                <div className="mt-8 border-t border-foreground/15 pt-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                    modules
                  </div>
                  <div className="mt-3 grid gap-2 text-[11px] leading-5 opacity-75">
                    <div>- internal monologue</div>
                    <div>- sensory channels (audio/visual/touch)</div>
                    <div>- emotion + regulation load</div>
                    <div>- likely actions / coping</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
