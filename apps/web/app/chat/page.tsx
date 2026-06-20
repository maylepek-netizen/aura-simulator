"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigate } from "../TransitionProvider";
import AppSidebar from "@/components/AppSidebar";
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
          font-size: 15px;
          line-height: 1.7;
          font-family: inherit;
        }
        .chat-textarea::placeholder { color: rgba(255,255,255,0.3); }

        .helper-btn {
          width: 199px; height: 41px;
          padding: 9px 17px 8px 13px;
          display: flex; flex-direction: row;
          justify-content: center; align-items: center;
          gap: 10px;
          border-radius: 8px;
          background: transparent;
          font-size: 13px; letter-spacing: 0.04em;
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
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781856804/%D7%90%D7%A0%D7%99_%D7%A8%D7%95%D7%A6%D7%94_%D7%A9%D7%96%D7%94_%D7%99%D7%94%D7%99%D7%94_%D7%AA%D7%A7%D7%A8%D7%99%D7%91%D7%99%D7%9D_%D7%A9%D7%9C_%D7%94_1_nlathf.mp4"
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
        <div style={{
          position: "fixed", top: 0, left: 80, right: 0, height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", zIndex: 10,
        }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              STEP 3 / SIMULATOR CHAT
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button className="sim-bank-btn" type="button" onClick={() => navigate("/bank")}>
              <img src="/icons/bank.svg" alt="" style={{ width: 16, filter: "brightness(0) saturate(100%) invert(83%) sepia(19%) saturate(800%) hue-rotate(330deg)" }} />
              Simulation Bank
            </button>
            <div style={{ fontSize: 12, letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)" }}>
              Simulation&nbsp;|&nbsp;<span style={{ textDecoration: "underline", cursor: "pointer" }}>Exit</span>
            </div>
          </div>
        </div>

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
          zIndex: 5, gap: 0,
        }}>

          {/* Eye icon + subtitle + heading */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <img src="/icons/eye.svg" alt="" style={{ width: 48 }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/icons/eye.svg"; }} />
            <p style={{ fontSize: 13, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", margin: 0 }}>
              STEP 03 / BUILD YOUR SIMULATION
            </p>
            <h1 style={{
              fontFamily: "'Amiri', serif",
              fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
              color: "white", margin: 0,
              fontWeight: 400, lineHeight: 1.1,
              textAlign: "center", maxWidth: 700,
            }}>
              Define the Experience
            </h1>
            <p style={{
              fontSize: 13, letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.5)",
              textAlign: "center", maxWidth: 620,
              margin: 0, lineHeight: 1.7,
            }}>
              Describe a real-life moment, place, or interaction. The simulation will reinterpret it through an autistic sensory and social perspective, informed by research, first-hand accounts, and documented autistic experiences.
            </p>
          </div>

          {/* Textarea card */}
          <div style={{
            width: "100%", maxWidth: 680,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "20px 24px 16px",
          }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
              Situation
            </div>
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
              paddingTop: 12, marginTop: 4,
            }}>
              <div style={{ width: 80, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <button
                type="button"
                disabled={processing || !input.trim()}
                onClick={() => void sendSituation(input)}
                style={{
                  background: processing ? "rgba(255,201,157,0.5)" : "#FFC99D",
                  color: "#1a0f00",
                  border: "none", borderRadius: 10,
                  padding: "10px 32px",
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
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
              marginTop: 12, maxWidth: 680, width: "100%",
              fontSize: 13, letterSpacing: "0.08em",
              color: "rgba(255,201,157,0.8)",
              textAlign: "center",
            }}>
              💭 {helpHint}
            </div>
          )}

          {/* Helper buttons — in flow, left-aligned with textarea */}
          <div style={{
            width: "100%", maxWidth: 680,
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: 12, marginTop: 60,
          }}>
            <span style={{ fontSize: 12, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}>
              Need help?
            </span>
            <div style={{ display: "flex", flexDirection: "row", gap: 8, height: 32 }}>
              <button className="helper-btn" type="button" onClick={handleHelpMe}
                style={{ border: "1px solid #FFC1BB", color: "#FFC1BB" }}>
                <img src="/icons/brain.svg" alt="" style={{ width: 18 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                Suggest a situation
              </button>

              <button className="helper-btn" type="button" onClick={handleWriteForMe}
                style={{ border: "1px solid #BCC2FF", color: "#BCC2FF" }}>
                <img src="/icons/pen.svg" alt="" style={{ width: 13 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                Write one for me
              </button>

              <button
                className="helper-btn"
                type="button"
                onClick={() => { setShowExamples((v) => !v); setHelpHint(null); }}
                style={{ border: "1px solid #FFC99D", color: "#FFC99D" }}
              >
                Show example scenarios
                <img src="/icons/Vector.svg" alt="" style={{ width: 6 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </button>
            </div>

            {/* Examples list */}
            {showExamples && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 680 }}>
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
