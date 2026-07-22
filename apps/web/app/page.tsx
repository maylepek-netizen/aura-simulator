"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "./TransitionProvider";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";

type Screen = "idle" | "landing" | "intro";

export default function LandingPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("landing");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScreen = useRef<Screen>("landing");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blinkRef = useRef<HTMLDivElement | null>(null);

  // Initialize audio once — do not play yet
  useEffect(() => {
    audioRef.current = new Audio('https://res.cloudinary.com/duhsqezo3/video/upload/v1781351439/background_music_lhjybz.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.35;
    if (typeof window !== "undefined") {
      window.backgroundMusic = audioRef.current;
    }
    // Do NOT pause on unmount — the music is global (window.backgroundMusic) and
    // must keep playing through onboard, the question screen, and into chat.
    // It fades out deliberately only when a situation is sent (chat) or the
    // simulation begins (result).
  }, []);

  // Play only when user clicks BEGIN (screen → "intro")
  useEffect(() => {
    if (screen === "intro") {
      audioRef.current?.play().catch(() => {});
    }
  }, [screen]);

  function wakeUp() {
    if (currentScreen.current === "idle") setScreen("landing");
  }

  function resetIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (currentScreen.current === "idle") return;
    idleTimer.current = setTimeout(() => setScreen("idle"), 600_000);
  }

  useEffect(() => {
    currentScreen.current = screen;
  }, [screen]);

  useEffect(() => {
    resetIdleTimer();
    const events = ["mousemove", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const overlay = blinkRef.current;
    if (!video || !overlay) return;
    let closing = false;

    function onTimeUpdate() {
      if (!video || !overlay) return;
      const { currentTime, duration } = video;
      if (!duration) return;
      if (!closing && currentTime > duration - 0.4) {
        closing = true;
        overlay.style.opacity = "1";
      }
      if (closing && currentTime < 0.5) {
        closing = false;
        overlay.style.opacity = "0";
      }
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');

        @keyframes breathe {
          0%, 100% { opacity: 0.28; }
          50%       { opacity: 0.55; }
        }
        @keyframes breatheDelay {
          0%, 100% { opacity: 0.16; }
          50%       { opacity: 0.32; }
        }
        @keyframes scanline {
          0%   { top: -4%; }
          100% { top: 104%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .aura-breathe       { animation: breathe 4s ease-in-out infinite; }
        .aura-breathe-delay { animation: breatheDelay 4s ease-in-out 0.6s infinite; }
        .aura-scanline      { position: absolute; left: 0; right: 0; height: 2px;
                              background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent);
                              animation: scanline 7s linear infinite;
                              pointer-events: none; }
        .aura-fade-in       { animation: fadeIn 0.6s ease forwards; }

        .begin-btn { transition: opacity 0.2s ease; }
        .begin-btn:hover { opacity: 0.7; }
        .begin-btn:hover .begin-icon {
          filter: drop-shadow(0 0 10px rgba(255,201,157,0.55));
        }
        .begin-icon { transition: filter 0.2s ease; }

        /* Intro logo — icon + heading scale together from --logo-w (74 / 56 / 50 / 16 gap) */
        .intro-logo {
          --logo-w: clamp(45px, 6vw, 74px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: calc(var(--logo-w) * 16 / 74);
        }
        .intro-logo-icon {
          width: var(--logo-w);
          height: calc(var(--logo-w) * 112 / 148);
          background-color: #FFC99D;
          opacity: 1;
          -webkit-mask: url('/icons/New_logo_eye.svg') no-repeat center / contain;
          mask: url('/icons/New_logo_eye.svg') no-repeat center / contain;
        }
        .intro-logo-heading {
          font-family: 'Amiri', serif;
          font-size: calc(var(--logo-w) * 100 / 148);
          color: #FFC99D;
          margin: 0;
          text-align: center;
          line-height: 1.15;
          font-weight: 400;
        }
      `}</style>

      <div
        style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}
        onClick={screen === "idle" ? wakeUp : undefined}
      >
        {/* Background video — always present */}
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1783453521/mp4_te2ppo.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            transition: "filter 1.2s ease, opacity 1.2s ease",
            filter: screen === "idle" ? "blur(8px) brightness(0.22)" : "none",
            opacity: screen === "idle" ? 0.38 : 1,
          }}
        />

        {/* Blink overlay — masks the video loop cut point */}
        <div
          id="blink-overlay"
          ref={blinkRef}
          style={{
            position: "absolute", inset: 0,
            backgroundColor: "black",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 2,
            transition: "opacity 0.4s ease-in-out",
          }}
        />

        {/* Vignette overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.52) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* ── SCREEN 00 — IDLE ── */}
        {screen === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16, cursor: "pointer",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1 }} />
            <div className="aura-scanline" style={{ zIndex: 2 }} />
            <svg
              className="aura-breathe"
              width="52" height="28" viewBox="0 0 55 30" fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: "relative", zIndex: 2, userSelect: "none" }}
            >
              <path d="M31.1464 18.6903C32.2377 17.7283 32.8508 16.4237 32.8508 15.0633C32.8508 13.703 32.2377 12.3983 31.1464 11.4364C30.0551 10.4745 28.575 9.93408 27.0317 9.93408C25.4884 9.93408 24.0083 10.4745 22.917 11.4364C21.8257 12.3983 21.2127 13.703 21.2127 15.0633C21.2127 16.4237 21.8257 17.7283 22.917 18.6903C24.0083 19.6522 25.4884 20.1926 27.0317 20.1926C28.575 20.1926 30.0551 19.6522 31.1464 18.6903Z" stroke="white" strokeOpacity="0.6" strokeWidth="2.06349" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.63492 15.0635C10.7384 8.05862 17.9851 3.09521 27.0317 3.09521C36.0784 3.09521 43.3251 8.05862 46.4286 15.0635C43.3251 22.0683 36.0784 27.0317 27.0317 27.0317C17.9851 27.0317 10.7384 22.0683 7.63492 15.0635Z" stroke="white" strokeOpacity="0.6" strokeWidth="2.06349" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M45.1905 1.03174C49.5211 1.03174 53.0317 4.54239 53.0317 8.87301V20.8413C53.0317 25.1719 49.5211 28.6825 45.1905 28.6825" stroke="white" strokeOpacity="0.6" strokeWidth="2.06349"/>
              <path d="M8.87302 28.6826C4.5424 28.6826 1.03175 25.172 1.03175 20.8413L1.03175 8.87308C1.03175 4.54247 4.54241 1.03182 8.87302 1.03182" stroke="white" strokeOpacity="0.6" strokeWidth="2.06349"/>
            </svg>
            <span className="aura-breathe-delay" style={{
              fontSize: 9,
              letterSpacing: "0.45em",
              color: "rgba(255,255,255,0.16)",
              textTransform: "uppercase",
              userSelect: "none",
              position: "relative", zIndex: 2,
            }}>
              move to begin
            </span>
          </div>
        )}

        {/* ── SCREEN 01 — LANDING: eye icon + BEGIN only, no sidebar ── */}
        {screen === "landing" && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            position: "fixed", inset: 0,
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1 }} />
            <button
              type="button"
              className="begin-btn aura-fade-in"
              onClick={() => setScreen("intro")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, background: "none", border: "none", cursor: "pointer",
                padding: 0, position: "relative", zIndex: 2,
              }}
            >
              <div
                className="begin-icon"
                style={{
                  width: 37, height: 28,
                  backgroundColor: "#FFC99D",
                  opacity: 1,
                  WebkitMask: "url('/icons/New_logo_eye.svg') no-repeat center / contain",
                  mask: "url('/icons/New_logo_eye.svg') no-repeat center / contain",
                }}
              />
              <span style={{
                fontSize: 10, letterSpacing: "0.4em", fontWeight: 300,
                textTransform: "uppercase", color: "white",
              }}>
                BEGIN
              </span>
            </button>
          </div>
        )}

        {/* ── SCREEN 02 — INTRO: sidebar + heading + CTA ── */}
        {screen === "intro" && (
          <div className="aura-fade-in" style={{ position: "absolute", inset: 0 }}>

            {/* Dark overlay */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1 }} />

            {/* Left sidebar */}
            <AppSidebar />

            {/* Top header */}
            <AppHeader step="STEP 00 / INTRODUCTION" position="absolute" />

            {/* Bottom-right serial */}
            <div style={{
              position: "absolute", bottom: 20, right: 24,
              fontSize: 12, letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.35)", zIndex: 3,
            }}>
              Simulation NO. 792734-04
            </div>

            {/* Center content */}
            <div style={{
              position: "fixed", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20, zIndex: 2,
            }}>
              <div className="intro-logo">
                <div className="intro-logo-icon" role="img" aria-label="Aura" />

                <h1 className="intro-logo-heading">
                  AURA SIMULATOR
                </h1>
              </div>

              <p style={{
                fontSize: 14, letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.7)",
                margin: 0, textAlign: "center",
              }}>
                A simulation of the autistic perception
              </p>

              <button
                type="button"
                onClick={() => navigate("/onboard")}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,201,157,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = "none"; }}
                style={{
                  marginTop: 24,
                  background: "#FFC99D", color: "#000",
                  border: "none", borderRadius: 3,
                  padding: "16px 48px",
                  fontSize: 13, letterSpacing: "0.12em",
                  fontWeight: 600, cursor: "pointer",
                  opacity: 0.8,
                  transition: "all 0.2s ease",
                }}
              >
                Begin Experience
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
