"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "../TransitionProvider";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";

function capitalizeFirst(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function QuestionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Friend");
  const [transitioning, setTransitioning] = useState(false);

  // ui opacity: 1 = visible, 0 = faded out
  const [uiOpacity, setUiOpacity] = useState(1);
  // Dark overlay stays constant now — it never brightens/reveals the video, so
  // there is no zoom or brightness change during the transition. The screen
  // simply fades the UI out and cross-dissolves (black) to the chat page.
  const overlayOpacity = 0.45;

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

    // Simple smooth fade only — no reveal-the-clear-video choreography (that
    // caused the screen to brighten), no zoom. The UI fades out over 0.8s, then
    // we navigate; TransitionProvider handles the black cross-dissolve into the
    // chat screen.
    setUiOpacity(0);

    setTimeout(() => {
      navigate("/chat");
    }, 800);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0d0a08" }}>

        {/* Background video */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1784382507/%D7%A1%D7%A8%D7%98%D7%95%D7%9F_%D7%A1%D7%95%D7%A4%D7%99_yxy2di.mp4"
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            transform: "scale(1.05)",
            // No blur/focus and no zoom — the video is always clear. The dark
            // overlay above it is what dissolves.
          }}
        />

        {/* Black overlay — the only thing that animates: a simple 1.2s opacity
            dissolve to reveal / re-cover the clear video. */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#000",
          opacity: overlayOpacity,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }} />

        {/* Radial gradient — fades with overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
          opacity: overlayOpacity > 0.1 ? 1 : 0,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }} />

        {/* ── ALL UI — fades out on transition (simple 0.8s opacity fade) ── */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: uiOpacity,
          transition: "opacity 0.8s ease",
          pointerEvents: transitioning ? "none" : "auto",
        }}>

          {/* LEFT SIDEBAR */}
          <AppSidebar />

          {/* TOP HEADER */}
          <AppHeader step="STEP 02 / BEFORE WE BEGIN" />

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
            position: "absolute", top: 0, bottom: 0, left: 80, right: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 56, zIndex: 5,
            padding: "0 60px",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <h1 style={{
                fontFamily: "'Amiri', serif",
                // Font reduced 15% (×0.85) and line-height 25% (×0.75) from the
                // previous clamp(2.2rem, 4vw, 3.4rem) / 1.3.
                fontSize: "clamp(1.87rem, 3.4vw, 2.89rem)",
                color: "#FFC99D",
                textAlign: "center",
                lineHeight: 0.975,
                fontWeight: 400,
                margin: 0,
                maxWidth: 820,
              }}>
                {capitalizeFirst(name)}, what if the world around you felt different than it does today
              </h1>

              <p style={{
                fontFamily: "var(--font-assistant), 'assistant', sans-serif",
                fontStyle: "normal",
                fontSize: "clamp(1.1rem, 2vw, 1.6rem)",
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
                fontWeight: 400,
                margin: 0,
                maxWidth: 820,
              }}>
                Are you ready to explore that possibility?
              </p>
            </div>

            <div style={{ display: "flex" }}>
              <button
                type="button"
                onClick={() => answer("yes")}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; }}
                style={{
                  background: "#FFC99D",
                  color: "#1c0e00",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 64px",
                  fontSize: 15, letterSpacing: "0.08em",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: 0.8,
                  transition: "all 0.2s ease",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
