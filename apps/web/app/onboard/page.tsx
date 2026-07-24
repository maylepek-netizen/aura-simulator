"use client";

import { useState } from "react";
import { useNavigate } from "../TransitionProvider";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import type { Gender, OnboardingProfile } from "@/lib/experienceStorage";
import { saveProfile, clearExperienceDraft } from "@/lib/experienceStorage";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-binary", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();

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
    navigate("/question");
  }

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 18,
    letterSpacing: "0.01em",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
    fontFamily: "inherit",
    fontWeight: 400,
  };

  const fieldValueStyle: React.CSSProperties = {
    fontSize: 18,
    color: "white",
    paddingBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    width: "100%",
    fontFamily: "inherit",
    fontWeight: 400,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');

        .onboard-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 18px;
          letter-spacing: 0.01em;
          padding: 0 0 12px;
          width: 100%;
          outline: none;
          font-family: inherit;
          font-weight: 400;
        }
        .onboard-input::placeholder { color: rgba(255,255,255,0.6); }
        .onboard-input:focus { border-bottom-color: rgba(255,201,157,0.5); }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#1a1410" }}>

        {/* Blurred background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1783453521/mp4_te2ppo.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(24px) brightness(0.45)",
            transform: "scale(1.05)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 60% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }} />

        {/* ── LEFT SIDEBAR ── */}
        <AppSidebar />

        {/* ── TOP HEADER ── */}
        <AppHeader step="STEP 01 / WHO ARE YOU?" />

        {/* ── BOTTOM RIGHT SERIAL ── */}
        <div style={{
          position: "fixed", bottom: 20, right: 28,
          fontSize: 11, letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.25)", zIndex: 10,
        }}>
          Simulation NO. 792734-04
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          position: "absolute", top: 60, bottom: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 30px",
          zIndex: 5,
        }}>
          <div style={{
            width: "100%", maxWidth: 1080,
            display: "flex",
            gap: 48,
            alignItems: "stretch",
          }}>

            {/* LEFT COLUMN */}
            <div style={{ flex: "0 0 55%", display: "flex", flexDirection: "column" }}>

              <h1 style={{
                fontFamily: "'Amiri', serif",
                fontSize: "clamp(44px, 5.5vw, 68px)",
                color: "white",
                margin: "-0.12em 0 32px",
                lineHeight: 1.1,
                fontWeight: 400,
                letterSpacing: "-0.5px",
              }}>
                Before exploring an<br />
                <span style={{ fontStyle: "italic", color: "#FFC99D" }}>Autistic Perspective,</span><br />
                tell us a little about yourself.
              </h1>

              {/* Divider — same max-width as paragraph below */}
              <div style={{
                width: "100%", maxWidth: 340, height: 1,
                background: "rgba(255,201,157,0.3)",
                marginBottom: 24,
              }} />

              {/* Description */}
              <p style={{
                fontSize: 18,
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.3,
                margin: 0,
                marginTop: "auto",
                maxWidth: 340,
              }}>
                Before starting the autism simulation, please tell us a little about yourself. These details help personalize the experience and adapt it to your perspective.
              </p>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 36,
            }}>

              {/* Name */}
              <div>
                <div style={fieldLabelStyle}>What should we call you?</div>
                <input
                  className="onboard-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              {/* Gender */}
              <div>
                <div style={fieldLabelStyle}>How do you identify?</div>
                {/* Transparent field with only a bottom border, so it matches
                    the name/age inputs exactly when closed. The dropdown list
                    itself is dark (see the `select option` rule in globals.css). */}
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  style={{
                    background: 'transparent',
                    color: 'white',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 0,
                    padding: '10px 0',
                    width: '100%',
                    cursor: 'pointer',
                    outline: 'none',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    // Hide the native dropdown arrow so the closed field looks
                    // identical to the name/age text inputs.
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <div style={fieldLabelStyle}>How old are you?</div>
                <input
                  className="onboard-input"
                  type="number"
                  min={5} max={120}
                  value={String(age)}
                  onChange={(e) => setAge(Number(e.target.value))}
                  placeholder="Your Age?"
                  inputMode="numeric"
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,100,100,0.8)", textTransform: "uppercase" }}>
                  {error}
                </div>
              )}

              {/* CTA — pushed to bottom to align with paragraph bottom on left */}
              <button
                type="button"
                onClick={onStart}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; }}
                style={{
                  background: "#FFC99D",
                  color: "#1c0e00",
                  border: "none",
                  borderRadius: 3,
                  padding: "16px 0",
                  width: "100%",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "auto",
                  opacity: 0.8,
                  transition: "all 0.2s ease",
                }}
              >
                Begin Experience
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
