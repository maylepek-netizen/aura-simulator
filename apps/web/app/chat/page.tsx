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

function getExamples(age: number, gender: string): string[] {
  const g = gender.toLowerCase();
  const base = [
    "Waiting at a crowded doctor's office",
    "Sudden fire alarm at school",
    "Supermarket with bright fluorescent lights",
    "Birthday party with strangers",
    "Unexpected phone call from an unknown number",
    "Plans cancelled at the last minute",
  ];
  if (age <= 17) {
    return g === "female"
      ? ["Noisy school cafeteria", "Group project with classmates", "PE class with lots of shouting", ...base]
      : ["Football practice in the rain", "Crowded school hallway", "Substitute teacher unexpectedly", ...base];
  }
  return g === "female"
    ? ["Commuting on a packed bus", "Open office with many sounds", "Shopping mall on a weekend", ...base]
    : ["Crowded sports stadium", "Noisy restaurant with colleagues", "Late-night city street", ...base];
}

export default function ChatPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [helpHint, setHelpHint] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ age: number; gender: string } | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.replace("/"); return; }
    setProfile({ age: p.age, gender: p.gender });
  }, [router]);

  async function sendSituation(situation: string) {
    const trimmed = situation.trim();
    if (!trimmed || processing) return;
    setProcessing(true);
    const draft: ExperienceDraft = { situation: trimmed, createdAtIso: nowIso() };
    saveExperienceDraft(draft);

    // Fade out background music over 3 seconds
    if (typeof window !== "undefined" && window.backgroundMusic) {
      const fadeOut = setInterval(() => {
        if (window.backgroundMusic && window.backgroundMusic.volume > 0.02) {
          window.backgroundMusic.volume -= 0.02;
        } else {
          clearInterval(fadeOut);
          window.backgroundMusic?.pause();
        }
      }, 100);
    }

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

        .example-chip {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 50px;
          padding: 8px 16px;
          color: rgba(255,255,255,0.7);
          font-size: 12px; letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
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
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1782549070/%D7%9E%D7%A2%D7%95%D7%9C%D7%94_%D7%90%D7%91%D7%9C_%D7%96%D7%94_%D7%A2%D7%9C_%D7%A1%D7%99%D7%98%D7%95%D7%90%D7%A6%D7%99%D7%94_%D7%99%D7%95%D7%AA%D7%A8_1__5_geqkz8.mp4"
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
          position: "absolute", top: 60, bottom: 0, left: 80, right: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 60px 40px",
          zIndex: 5,
        }}>

          {/* Logo icon */}
          <img src="/logo.svg" alt="" style={{ width: 60, marginBottom: 12, display: "block" }} />

          {/* Subtitle / step label */}
          <p style={{ fontSize: 12, letterSpacing: "0.24em", color: "rgba(255,255,255,0.5)", margin: "0 0 6px", textTransform: "uppercase" }}>
            BUILD YOUR SIMULATION
          </p>

          {/* Main heading */}
          <h1 style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(3rem, 5.5vw, 4.8rem)",
            color: "white", margin: "0 0 10px",
            fontWeight: 400, lineHeight: 1.05,
            textAlign: "center", maxWidth: 760,
          }}>
            Define the Experience
          </h1>

          {/* Description — above textarea */}
          <p style={{
            marginTop: 16, marginBottom: 16, maxWidth: 640,
            fontSize: 18, letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.35)",
            textAlign: "center", lineHeight: 1.3,
          }}>
            Describe a real-life moment, place, or interaction. The simulation will reinterpret it through an autistic sensory and social perspective, informed by research, first-hand accounts, and documented autistic experiences.
          </p>

          {/* Textarea card */}
          <div style={{
            width: "100%", maxWidth: 680,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "24px 28px 16px",
          }}>
            <textarea
              className="chat-textarea"
              rows={5}
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
            {/* Divider + send row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 14, marginTop: 8,
            }}>
              <div style={{ width: 100, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <button
                type="button"
                disabled={processing || !input.trim()}
                onClick={() => void sendSituation(input)}
                style={{
                  background: processing ? "rgba(255,201,157,0.5)" : "#FFC99D",
                  color: "#1a0f00",
                  border: "none", borderRadius: 10,
                  padding: "11px 36px",
                  fontSize: 18, fontWeight: 600, letterSpacing: "0.04em",
                  cursor: processing || !input.trim() ? "not-allowed" : "pointer",
                  opacity: processing || !input.trim() ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {processing ? "Generating…" : "Generate Simulation"}
              </button>
            </div>
          </div>

          {/* Help hint */}
          {helpHint && (
            <div style={{
              marginTop: 14, maxWidth: 680, width: "100%",
              fontSize: 13, letterSpacing: "0.08em",
              color: "rgba(255,201,157,0.8)",
              textAlign: "center",
            }}>
              💭 {helpHint}
            </div>
          )}

          {/* ── Help buttons ── */}
          <div style={{ position: "relative", marginTop: 16, width: "100%", maxWidth: 680 }}>
            <p style={{ fontSize: 18, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              Need help?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="helper-btn" type="button" onClick={handleHelpMe}
                style={{ border: "1px solid #FFC1BB", color: "#FFC1BB" }}>
                Help me think
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.5 2a6 6 0 0 1 5 9.5M9.5 2a6 6 0 0 0-5 9.5M9.5 2v1M14.5 11.5a6 6 0 0 1-5 9.5M14.5 11.5a6 6 0 0 0-5 9.5M9.5 21v-1M3 7h1M16 7h1M3 17h1M16 17h1"/>
                </svg>
              </button>
              <button className="helper-btn" type="button" onClick={handleWriteForMe}
                style={{ border: "1px solid #BCC2FF", color: "#BCC2FF" }}>
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

            {/* Examples list — expands downward */}
            {showExamples && (
              <div style={{
                marginTop: 8,
                display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 640,
              }}>
                {examples.map((ex) => (
                  <button
                    key={ex}
                    className="example-chip"
                    type="button"
                    onClick={() => { setInput(ex); setShowExamples(false); }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
