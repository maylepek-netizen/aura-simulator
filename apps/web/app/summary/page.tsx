"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "../TransitionProvider";
import { getReflectionText } from "@/lib/reflectionText";

export default function SummaryPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  // Gender drives Hebrew agreement in the reflection copy. Default to the
  // neutral/plural form if no profile is stored.
  const [gender, setGender] = useState("Prefer not to say");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("aura.profile.v1") || "{}");
      if (p.gender) setGender(p.gender);
    } catch {}
  }, []);

  const t = getReflectionText(gender);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
      `}</style>

      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", background: "#000",
        opacity: visible ? 1 : 0, transition: "opacity 1.5s ease-in-out",
      }}>

        {/* Background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781856804/%D7%90%D7%A0%D7%99_%D7%A8%D7%95%D7%A6%D7%94_%D7%A9%D7%96%D7%94_%D7%99%D7%94%D7%99%D7%94_%D7%AA%D7%A7%D7%A8%D7%99%D7%91%D7%99%D7%9D_%D7%A9%D7%9C_%D7%94_1_nlathf.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            filter: "blur(24px) brightness(0.35)",
            transform: "scale(1.05)",
          }}
        />

        {/* Black overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />

        {/* Radial gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }} />

        {/* Centered content */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 var(--gutter)",
          gap: 0,
        }}>

          {/* Italic headline */}
          <h1 style={{
            fontFamily: "'Amiri', serif",
            fontStyle: "italic",
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            color: "#FFC99D",
            margin: "0 0 8px",
            textAlign: "center",
            direction: "rtl",
            fontWeight: 400,
            lineHeight: 1.2,
          }}>
            {t.headline}
          </h1>

          {/* Main statement */}
          <p style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(0.96rem, 1.92vw, 1.56rem)",
            color: "white",
            textAlign: "center",
            direction: "rtl",
            lineHeight: 1.35,
            fontWeight: 400,
            margin: "0 0 56px",
            maxWidth: 820,
          }}>
            {t.statement}
          </p>

          {/* Subtitle */}
          <p style={{
            fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            direction: "rtl",
            margin: "0 0 64px",
            fontWeight: 400,
          }}>
            {t.subtitle}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => navigate("/bank")}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; }}
              style={{
                background: "#FFC99D",
                color: "#1a0f00",
                border: "none",
                borderRadius: 3,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: 0.8,
                transition: "all 0.2s ease",
                direction: "rtl", textAlign: "center",
              }}
            >
              {t.bankButton}
            </button>

            <button
              type="button"
              className="aura-btn"
              onClick={() => navigate("/chat")}
              style={{
                background: "transparent",
                color: "white",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 3,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                direction: "rtl", textAlign: "center",
              }}
            >
              {t.newButton}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
