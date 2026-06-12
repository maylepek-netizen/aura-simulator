"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuestionPage() {
  const router = useRouter();
  const [name, setName] = useState("Friend");

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("aura.profile.v1") || "{}");
      if (profile.name) setName(profile.name.trim().split(" ")[0]);
    } catch {}
  }, []);

  function answer(value: "yes" | "no") {
    try {
      localStorage.setItem("aura_question_overstimulated", value);
    } catch {}
    router.push("/chat");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <img src="/icons/Exeprience.svg" alt="Experience" style={{ width: 28 }} />
            <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.9)" }}>Experience</span>
          </div>
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
            <img src="/icons/Exeprience.svg" alt="" style={{ width: 28, opacity: 0.3 }} />
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

        {/* ── CENTER CONTENT ── */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 105, right: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 56, zIndex: 5,
          padding: "0 60px",
        }}>
          {/* Question */}
          <h1 style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)",
            color: "white",
            textAlign: "center",
            lineHeight: 1.3,
            fontWeight: 400,
            margin: 0,
            maxWidth: 820,
          }}>
            {name}, Have you ever felt overstimulated,<br />
            misunderstood, or emotionally overwhelmed?
          </h1>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 24 }}>
            {/* Yes — outlined */}
            <button
              type="button"
              onClick={() => answer("yes")}
              style={{
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 50,
                padding: "16px 64px",
                fontSize: 15, letterSpacing: "0.08em",
                fontWeight: 500, color: "white",
                cursor: "pointer",
                fontFamily: "'Amiri', serif",
              }}
            >
              Yes
            </button>

            {/* No — dark filled */}
            <button
              type="button"
              onClick={() => answer("no")}
              style={{
                background: "rgba(40,28,18,0.85)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 50,
                padding: "16px 64px",
                fontSize: 15, letterSpacing: "0.08em",
                fontWeight: 500, color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontFamily: "'Amiri', serif",
              }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
