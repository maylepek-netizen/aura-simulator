"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SummaryPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

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
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781117441/%D7%9C%D7%90_%D7%A6%D7%A8%D7%99%D7%9A_%D7%9C%D7%94%D7%99%D7%95%D7%AA_%D7%9E%D7%A1%D7%95%D7%9B%D7%9F_%D7%90%D7%95_%D7%9E%D7%91%D7%99%D7%9A_%D7%A4%D7%A9_wo1ecc.mp4"
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
          padding: "0 60px",
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
            fontWeight: 400,
            lineHeight: 1.2,
          }}>
            Every perception tells a different story.
          </h1>

          {/* Main statement */}
          <p style={{
            fontFamily: "'Amiri', serif",
            fontSize: "clamp(1.6rem, 3.2vw, 2.6rem)",
            color: "white",
            textAlign: "center",
            lineHeight: 1.35,
            fontWeight: 400,
            margin: "0 0 56px",
            maxWidth: 820,
          }}>
            What you experienced was only one possible<br />interpretation of the world.
          </p>

          {/* Subtitle */}
          <p style={{
            fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            margin: "0 0 64px",
            fontWeight: 400,
          }}>
            Would you like to explore another perspective?
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <button
              type="button"
              className="aura-btn"
              onClick={() => router.push("/")}
              style={{
                background: "#FFC99D",
                color: "#1a0f00",
                border: "none",
                borderRadius: 50,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              New Simulation
            </button>

            <button
              type="button"
              className="aura-btn"
              onClick={() => router.push("/bank")}
              style={{
                background: "transparent",
                color: "white",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 50,
                padding: "16px 52px",
                fontSize: 14,
                letterSpacing: "0.06em",
                fontWeight: 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Simulation Bank
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
