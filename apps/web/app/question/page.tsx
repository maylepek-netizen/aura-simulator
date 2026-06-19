"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "../TransitionProvider";

export default function QuestionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Friend");
  const [transitioning, setTransitioning] = useState(false);

  // ui opacity: 1 = visible, 0 = faded out
  const [uiOpacity, setUiOpacity] = useState(1);
  // overlay opacity: 0.45 = default, 0 = fully transparent
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  // video blur: 24 = blurred, 0 = clear
  const [videoBlur, setVideoBlur] = useState(24);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("aura.profile.v1") || "{}");
      if (profile.name) setName(profile.name.trim().split(" ")[0]);
    } catch {}
  }, []);

  function answer(value: "yes" | "no") {
    if (transitioning) return;
    try {
      localStorage.setItem("aura_question_overstimulated", value);
    } catch {}

    setTransitioning(true);

    // Phase 1 (0→1s): UI fades out
    setUiOpacity(0);

    // Phase 2 (1→4s): overlay fades out, blur lifts
    setTimeout(() => {
      setOverlayOpacity(0);
      setVideoBlur(0);
    }, 1000);

    // Phase 3 (4→7s): clean video — nothing to set, state holds

    // Phase 4 (7→9s): overlay and blur fade back in
    setTimeout(() => {
      setOverlayOpacity(0.45);
      setVideoBlur(24);
    }, 7000);

    // Phase 5 (9→10s): navigate
    setTimeout(() => {
      navigate("/chat");
    }, 9000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0d0a08" }}>

        {/* Background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781856804/%D7%90%D7%A0%D7%99_%D7%A8%D7%95%D7%A6%D7%94_%D7%A9%D7%96%D7%94_%D7%99%D7%94%D7%99%D7%94_%D7%AA%D7%A7%D7%A8%D7%99%D7%91%D7%99%D7%9D_%D7%A9%D7%9C_%D7%94_1_nlathf.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            transform: "scale(1.05)",
            filter: `blur(${videoBlur}px) brightness(${videoBlur === 0 ? 1 : 0.6})`,
            transition: "filter 1.5s ease-in-out",
          }}
        />

        {/* Black overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: `rgba(0,0,0,${overlayOpacity})`,
          transition: "background 1.5s ease-in-out",
          pointerEvents: "none",
        }} />

        {/* Radial gradient — fades with overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
          opacity: overlayOpacity > 0.1 ? 1 : 0,
          transition: "opacity 1.5s ease-in-out",
          pointerEvents: "none",
        }} />

        {/* ── ALL UI — fades out on transition ── */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: uiOpacity,
          transition: "opacity 1s ease-in-out",
          pointerEvents: transitioning ? "none" : "auto",
        }}>

          {/* LEFT SIDEBAR */}
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
              <img src="/icons/eye.svg" alt="Experience" style={{ width: 28 }} />
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
              <img src="/icons/eye.svg" alt="" style={{ width: 28, opacity: 0.3 }} />
            </div>
          </div>

          {/* TOP HEADER */}
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

          {/* BOTTOM RIGHT SERIAL */}
          <div style={{
            position: "fixed", bottom: 20, right: 28,
            fontSize: 12, letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.3)", zIndex: 10,
          }}>
            Simulation NO. 792734-04
          </div>

          {/* CENTER CONTENT */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: 105, right: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 56, zIndex: 5,
            padding: "0 60px",
          }}>
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

            <div style={{ display: "flex", gap: 24 }}>
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
      </div>
    </>
  );
}
