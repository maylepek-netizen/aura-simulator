"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigate } from "../TransitionProvider";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import {
  loadProfile,
  saveExperienceDraft,
  type ExperienceDraft,
} from "@/lib/experienceStorage";

declare global {
  interface Window { backgroundMusic: HTMLAudioElement; }
}

function nowIso() {
  return new Date().toISOString();
}

const HELP_QUESTIONS = [
  "What did you do yesterday at noon?",
  "Where were you this morning?",
  "Think of a place that felt overwhelming recently.",
  "Was there a moment this week that felt too loud or too much?",
  "When did you last feel misunderstood?",
  "Think of a routine you do every day — what does it feel like?",
  "Where do you go that makes you feel anxious?",
  "What was the last crowded place you visited?",
];

function generateSituation(age: number, gender: string): string {
  const g = gender.toLowerCase();
  if (age >= 5 && age <= 12) {
    const child = g === "female"
      ? ["a birthday party with classmates", "school lunch in a noisy cafeteria", "a crowded playground at recess"]
      : ["football practice with the team", "a school assembly in the gym", "a crowded birthday party"];
    return child[Math.floor(Math.random() * child.length)];
  }
  if (age >= 13 && age <= 17) {
    const teen = g === "female"
      ? ["shopping at the mall with friends", "a loud school hallway between classes", "a house party with unfamiliar people"]
      : ["football training after school", "a crowded school corridor", "a gaming session that got interrupted"];
    return teen[Math.floor(Math.random() * teen.length)];
  }
  if (age >= 18 && age <= 30) {
    const young = g === "female"
      ? ["grocery shopping at a busy supermarket", "commuting on a packed train", "a work meeting with many people"]
      : ["commuting on a crowded subway", "a noisy open-plan office", "a social gathering at a bar"];
    return young[Math.floor(Math.random() * young.length)];
  }
  const adult = g === "female"
    ? ["a family dinner with many relatives", "waiting at a busy doctor's office", "a school pick-up in crowded traffic"]
    : ["a business conference with strangers", "waiting in a long queue at the bank", "a crowded sports event"];
  return adult[Math.floor(Math.random() * adult.length)];
}

// Age/gender-aware example situations.
//   age < 15  → school, friends, family
//   age 15-20 → school, social events, parties
//   age > 20  → work, bars, dating, adult scenarios
function getExamples(age: number, gender: string): string[] {
  const g = gender.toLowerCase();

  if (age < 15) {
    const base = [
      "Sudden fire alarm at school",
      "Supermarket with bright fluorescent lights",
      "Family dinner with relatives visiting",
      "Waiting at a crowded doctor's office",
    ];
    return g === "female"
      ? ["Noisy school cafeteria", "Group project with classmates", "Sleepover at a friend's house", ...base]
      : ["Crowded school hallway", "PE class with lots of shouting", "Playing outside with neighbourhood kids", ...base];
  }

  if (age <= 20) {
    const base = [
      "House party with loud music",
      "Crowded school hallway between classes",
      "Exam hall with clocks ticking",
      "Bus ride home packed with students",
    ];
    return g === "female"
      ? ["Noisy school cafeteria", "Getting ready with friends before a party", "Group project with classmates", ...base]
      : ["Football practice in the rain", "Concert with friends", "Substitute teacher unexpectedly", ...base];
  }

  const base = [
    "Open office with many sounds",
    "Commuting on a packed train",
    "Unexpected phone call from an unknown number",
    "Plans cancelled at the last minute",
  ];
  return g === "female"
    ? ["First date at a busy restaurant", "Crowded bar on a Friday night", "Work meeting with many speakers", ...base]
    : ["Crowded bar on a Friday night", "First date at a noisy restaurant", "Networking event with colleagues", ...base];
}

export default function ChatPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [helpHint, setHelpHint] = useState<string | null>(null);
  // Bumped when "Write for me" fills the textarea, to re-trigger the dissolve.
  const [inputDissolveKey, setInputDissolveKey] = useState(0);
  const [profile, setProfile] = useState<{ age: number; gender: string } | null>(null);
  // Drives the subtle fade-in transition on the helper buttons.
  const [helpersVisible, setHelpersVisible] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.replace("/"); return; }
    setProfile({ age: p.age, gender: p.gender });
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setHelpersVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  async function sendSituation(situation: string) {
    const trimmed = situation.trim();
    if (!trimmed || processing) return;

    const fadeOutMusic = () => {
      const music = (window as unknown as { backgroundMusic?: HTMLAudioElement }).backgroundMusic;
      if (!music || music.paused) return;
      const fadeInterval = setInterval(() => {
        if (music.volume > 0.05) {
          music.volume = Math.max(0, music.volume - 0.05);
        } else {
          music.volume = 0;
          music.pause();
          clearInterval(fadeInterval);
        }
      }, 100);
    };
    fadeOutMusic();

    setProcessing(true);
    const draft: ExperienceDraft = { situation: trimmed, createdAtIso: nowIso() };
    saveExperienceDraft(draft);

    await new Promise((r) => setTimeout(r, 600));
    navigate("/result");
  }

  function handleHelpMe() {
    const q = HELP_QUESTIONS[Math.floor(Math.random() * HELP_QUESTIONS.length)];
    setHelpHint(q);
    setShowExamples(false);
  }

  function handleWriteForMe() {
    if (!profile) return;
    const situation = generateSituation(profile.age, profile.gender);
    setInput(situation);
    setHelpHint(null);
    setShowExamples(false);
    // Dissolve the newly written text in rather than having it pop.
    setInputDissolveKey((k) => k + 1);
  }

  const examples = profile ? getExamples(profile.age, profile.gender) : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');

        .chat-textarea {
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          resize: none;
          color: white;
          font-size: 18px;
          line-height: 1.7;
          font-family: inherit;
        }
        .chat-textarea::placeholder { color: rgba(255,255,255,0.3); }

        .helper-btn {
          padding: 10px 15px;
          display: flex; flex-direction: row;
          justify-content: center; align-items: center;
          gap: 8px;
          border-radius: 7px;
          background: transparent;
          font-size: 18px; letter-spacing: 0.04em;
          font-weight: 400;
          cursor: pointer;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .helper-btn:hover { opacity: 0.75; }

        /* Examples container — wider than the textarea so 4 chips fit on row 1 */
        .examples-wrap {
          width: max-content;
          max-width: 90vw;
        }
        @media (max-width: 640px) {
          .examples-wrap { max-width: 100%; width: 100%; }
        }

        /* Dissolve for content revealed by the helper buttons — fade only, no motion */
        @keyframes revealDissolve {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .reveal-dissolve { animation: revealDissolve 0.6s ease; }

        .example-chip {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 50px;
          padding: 8px 16px;
          color: rgba(255,255,255,0.7);
          font-size: 12px; letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
          width: auto;
          height: auto;
          flex: 0 0 auto;
        }
        .example-chip:hover { background: rgba(255,255,255,0.12); color: white; }

        .sim-bank-btn {
          display: flex; align-items: center; gap: 8px;
          background: transparent;
          border: 1px solid rgba(255,201,157,0.35);
          border-radius: 8px;
          padding: 8px 16px;
          color: rgba(255,201,157,0.85);
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .sim-bank-btn:hover { border-color: rgba(255,201,157,0.7); color: #FFC99D; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0d0a08" }}>

        {/* Background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1784382507/%D7%A1%D7%A8%D7%98%D7%95%D7%9F_%D7%A1%D7%95%D7%A4%D7%99_yxy2di.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(24px) brightness(0.6)",
            transform: "scale(1.05)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
          pointerEvents: "none",
        }} />

        {/* ── LEFT SIDEBAR ── */}
        <AppSidebar />

        {/* ── TOP HEADER ── */}
        <AppHeader step="STEP 03 / SIMULATOR CHAT" showBank onBankClick={() => navigate("/bank")} />

        {/* ── BOTTOM RIGHT SERIAL ── */}
        <div style={{
          position: "fixed", bottom: 20, right: 28,
          fontSize: 12, letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.3)", zIndex: 10,
        }}>
          Simulation NO. 792734-04
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          position: "absolute", top: 60, bottom: 0, left: 0, right: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 60px 40px",
          zIndex: 5,
        }}>

          {/* Fixed-height inner block — its height never changes (examples open as absolute
              overlay), so the flex centering above never re-computes and nothing shifts. */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            width: "100%",
          }}>

          {/* Eye icon above heading */}
          <div
            aria-hidden
            style={{
              width: 42, height: 32,
              backgroundColor: "#FFC99D",
              opacity: 1,
              marginBottom: 12,
              WebkitMask: "url('/icons/New_logo_eye.svg') no-repeat center / contain",
              mask: "url('/icons/New_logo_eye.svg') no-repeat center / contain",
            }}
          />

          {/* Main heading */}
          <h1 style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(2rem, 3.6vw, 3.1rem)",
            color: "white", margin: "0 0 7px",
            fontWeight: 400, lineHeight: 1.05,
            textAlign: "center", maxWidth: 760,
          }}>
            Build Your Simulation
          </h1>

          {/* Description — directly below heading */}
          <p style={{
            marginTop: 0, marginBottom: 25, maxWidth: 600,
            fontSize: 14, letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.35)",
            textAlign: "center", lineHeight: 1.3,
          }}>
            Describe a real-life moment, place, or interaction. The simulation will reinterpret it through an autistic sensory and social perspective, informed by research, first-hand accounts, and documented autistic experiences.
          </p>

          {/* Textarea card */}
          <div style={{
            width: "100%", maxWidth: 600,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "24px 28px 16px",
          }}>
            <textarea
              key={inputDissolveKey}
              className="chat-textarea reveal-dissolve"
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={processing}
              placeholder="Describe your situation..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void sendSituation(input);
                }
              }}
            />
            {/* Bottom row: send button right-aligned inside card */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 14, marginTop: 8,
            }}>
              <button
                type="button"
                disabled={processing || !input.trim()}
                onClick={() => void sendSituation(input)}
                onMouseEnter={(e) => { if (!processing && input.trim()) { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; } }}
                onMouseLeave={(e) => { if (!processing && input.trim()) { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; } }}
                style={{
                  background: processing ? "rgba(255,201,157,0.5)" : "#FFC99D",
                  color: "#1a0f00",
                  border: "none", borderRadius: 12,
                  padding: "11px 28px",
                  fontSize: 18, fontWeight: 600, letterSpacing: "0.04em",
                  cursor: processing || !input.trim() ? "not-allowed" : "pointer",
                  opacity: processing || !input.trim() ? 0.6 : 0.8,
                  transition: "all 0.2s ease",
                }}
              >
                {processing ? "Generating…" : "Send"}
              </button>
            </div>

          </div>

          {/* ── Help buttons — spread across the full card width ── */}
          <div style={{ position: "relative", marginTop: 30, width: "100%", maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="helper-btn" type="button" onClick={handleHelpMe}
                style={{
                  border: "1px solid #FFC1BB", color: "#FFC1BB",
                  opacity: helpersVisible ? 1 : 0,
                  transform: helpersVisible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                }}>
                Help me think
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.5 2a6 6 0 0 1 5 9.5M9.5 2a6 6 0 0 0-5 9.5M9.5 2v1M14.5 11.5a6 6 0 0 1-5 9.5M14.5 11.5a6 6 0 0 0-5 9.5M9.5 21v-1M3 7h1M16 7h1M3 17h1M16 17h1"/>
                </svg>
              </button>
              <button className="helper-btn" type="button" onClick={handleWriteForMe}
                style={{
                  border: "1px solid #BCC2FF", color: "#BCC2FF",
                  opacity: helpersVisible ? 1 : 0,
                  transform: helpersVisible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.5s ease 0.08s, transform 0.5s ease 0.08s",
                }}>
                Write for me
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button
                className="helper-btn"
                type="button"
                onClick={() => { setShowExamples((v) => !v); setHelpHint(null); }}
                style={{ border: "1px solid #FFC99D", color: "#FFC99D" }}
              >
                Show me examples <span>›</span>
              </button>
            </div>

            {/* Examples — two centered rows (4 then 3) in a container wider than
                the textarea. On mobile each row wraps naturally. */}
            <div className="examples-wrap" style={{
              position: "absolute", top: "100%", left: "50%",
              transform: "translateX(-50%)",
              marginTop: 12,
              maxHeight: showExamples ? 260 : 0,
              opacity: showExamples ? 1 : 0,
              overflowY: "auto",
              pointerEvents: showExamples ? "auto" : "none",
              transition: "max-height 0.45s ease-out, opacity 0.45s ease-out",
              display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
            }}>
              {[examples.slice(0, 4), examples.slice(4, 7)].map((row, rowIdx) => (
                <div key={rowIdx} style={{
                  display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
                }}>
                  {row.map((ex, i) => {
                    const delay = showExamples ? (rowIdx * 4 + i) * 0.06 : 0;
                    return (
                      <button
                        key={ex}
                        className="example-chip"
                        type="button"
                        onClick={() => { setInput(ex); setShowExamples(false); }}
                        style={{
                          opacity: showExamples ? 1 : 0,
                          transform: showExamples ? "translateY(0)" : "translateY(-4px)",
                          transition: `opacity 0.4s ease-out ${delay}s, transform 0.4s ease-out ${delay}s`,
                        }}
                      >
                        {ex}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Help hint — absolutely positioned so showing it never pushes
                the buttons or any other element. Dissolves in place. */}
            {helpHint && (
              <div key={helpHint} className="reveal-dissolve" style={{
                position: "absolute",
                top: "100%", left: 0, right: 0,
                marginTop: 14,
                fontSize: 13, letterSpacing: "0.08em",
                color: "rgba(255,201,157,0.8)",
                textAlign: "center",
                pointerEvents: "none",
              }}>
                💭 {helpHint}
              </div>
            )}
          </div>

          </div>{/* end fixed-height inner block */}

        </div>
      </div>
    </>
  );
}
