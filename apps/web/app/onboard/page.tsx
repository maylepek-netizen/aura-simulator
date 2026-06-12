"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Gender, OnboardingProfile } from "@/lib/experienceStorage";
import { saveProfile, clearExperienceDraft } from "@/lib/experienceStorage";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function OnboardingPage() {
  const router = useRouter();

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
    router.push("/question");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');

        .onboard-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.25);
          color: white;
          font-size: 14px;
          letter-spacing: 0.06em;
          padding: 10px 0;
          width: 100%;
          outline: none;
        }
        .onboard-input::placeholder { color: rgba(255,255,255,0.35); }
        .onboard-input:focus { border-bottom-color: rgba(255,255,255,0.6); }
        .onboard-select {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          letter-spacing: 0.06em;
          padding: 10px 0;
          width: 100%;
          outline: none;
          appearance: none;
          cursor: pointer;
        }
        .onboard-select:focus { border-bottom-color: rgba(255,255,255,0.6); }
        .onboard-select option { background: #1a1410; color: white; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0d0a08" }}>

        {/* Blurred background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781117441/%D7%9C%D7%90_%D7%A6%D7%A8%D7%99%D7%9A_%D7%9C%D7%94%D7%99%D7%95%D7%AA_%D7%9E%D7%A1%D7%95%D7%9B%D7%9F_%D7%90%D7%95_%D7%9E%D7%91%D7%99%D7%9A_%D7%A4%D7%A9_wo1ecc.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(24px) brightness(0.6)",
            transform: "scale(1.05)",
          }}
        />

        {/* Black overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />

        {/* Radial gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
          pointerEvents: "none",
        }} />

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          position: "fixed", left: 0, top: 0,
          width: 105, height: "100vh", padding: "8px 0",
          background: "rgba(0,0,0,0.38)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          zIndex: 10,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          gap: 613,
        }}>
          {/* Experience — active */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <img src="/icons/eye.svg" alt="Experience" style={{ width: 28 }} />
            <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.9)" }}>Experience</span>
          </div>
          {/* Bottom group */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img src="/icons/bank.svg" alt="Bank" style={{ width: 28, opacity: 0.4 }} />
              <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Bank</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img src="/icons/insights.svg" alt="Insights" style={{ width: 28, opacity: 0.4 }} />
              <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Insights</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img src="/icons/sensory-channels.svg" alt="Sensory Channels" style={{ width: 27, opacity: 0.4 }} />
              <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.3 }}>Sensory<br />Channels</span>
            </div>
            <img src="/icons/eye.svg" alt="" style={{ width: 28, opacity: 0.3 }} />
          </div>
        </div>

        {/* ── TOP HEADER ── */}
        <div style={{
          position: "fixed", top: 0, left: 105, right: 0, height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 40px", zIndex: 10,
        }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              STEP 01 / WHO ARE YOU?
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              Autism Simulator Experience
            </div>
          </div>
          <div style={{ fontSize: 12, letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)" }}>
            Simulation&nbsp;|&nbsp;<span style={{ textDecoration: "underline", cursor: "pointer" }}>Exit</span>
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
          position: "absolute", top: 0, bottom: 0, left: 105, right: 0,
          display: "flex", alignItems: "center",
          padding: "80px 40px 40px 60px",
          zIndex: 5,
        }}>

          {/* LEFT — heading + description */}
          <div style={{ flex: "0 0 48%", paddingRight: 40 }}>
            {/* Eye icon */}
            <img src="/icons/eye.svg" alt="" style={{ width: 44, marginBottom: 32, opacity: 0.85 }} />

            {/* Heading */}
            <h1 style={{
              fontFamily: "'Amiri', serif",
              fontSize: "clamp(2.6rem, 4.5vw, 4rem)",
              color: "white", margin: 0,
              lineHeight: 1.15, fontWeight: 400,
            }}>
              Before we step<br />into another<br />
              <em style={{ color: "#FFC99D", fontStyle: "italic" }}>perception</em><br />
              who are you?
            </h1>

            {/* Divider */}
            <div style={{ width: 80, height: 1, background: "rgba(255,201,157,0.4)", margin: "28px 0" }} />

            {/* Description */}
            <p style={{
              fontSize: 13, letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.8, margin: 0, maxWidth: 380,
            }}>
              Before we begin, we&apos;d like to learn a little about you. Every experience is shaped by who we are, our memories, and the way we see the world.
            </p>
          </div>

          {/* RIGHT — form */}
          <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column", gap: 40 }}>

            {/* Name */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
                WHAT SHOULD WE CALL YOU?
              </div>
              <input
                className="onboard-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                autoComplete="name"
              />
            </div>

            {/* Gender */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
                HOW DO YOU IDENTIFY
              </div>
              <select
                className="onboard-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
                HOW OLD ARE YOU?
              </div>
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

            {/* CTA */}
            <button
              type="button"
              onClick={onStart}
              style={{
                alignSelf: "flex-start",
                background: "#FFC99D", color: "#1a0f00",
                border: "none", borderRadius: 50,
                padding: "16px 52px",
                fontSize: 13, letterSpacing: "0.12em",
                fontWeight: 600, cursor: "pointer",
                marginTop: 8,
              }}
            >
              Begin Experience
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
