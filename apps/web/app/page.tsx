"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "./TransitionProvider";

type Screen = "idle" | "landing" | "intro";

export default function LandingPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("landing");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScreen = useRef<Screen>("landing");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio once — do not play yet
  useEffect(() => {
    audioRef.current = new Audio('https://res.cloudinary.com/duhsqezo3/video/upload/v1781351439/background_music_lhjybz.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.35;
    if (typeof window !== "undefined") {
      window.backgroundMusic = audioRef.current;
    }
    return () => {
      audioRef.current?.pause();
    };
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
      `}</style>

      <div
        style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}
        onClick={screen === "idle" ? wakeUp : undefined}
      >
        {/* Background video — always present */}
        <video
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781884444/%D7%90%D7%A0%D7%99_%D7%A8%D7%95%D7%A6%D7%94_%D7%A9%D7%96%D7%94_%D7%99%D7%94%D7%99%D7%94_%D7%AA%D7%A7%D7%A8%D7%99%D7%91%D7%99%D7%9D_%D7%A9%D7%9C_%D7%94_6_jpwuhs.mp4"
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
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1 }} />
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
              <svg
                className="begin-icon"
                width="52" height="28" viewBox="0 0 55 30" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M31.1464 18.6903C32.2377 17.7283 32.8508 16.4237 32.8508 15.0633C32.8508 13.703 32.2377 12.3983 31.1464 11.4364C30.0551 10.4745 28.575 9.93408 27.0317 9.93408C25.4884 9.93408 24.0083 10.4745 22.917 11.4364C21.8257 12.3983 21.2127 13.703 21.2127 15.0633C21.2127 16.4237 21.8257 17.7283 22.917 18.6903C24.0083 19.6522 25.4884 20.1926 27.0317 20.1926C28.575 20.1926 30.0551 19.6522 31.1464 18.6903Z" stroke="#FFC99D" strokeOpacity="0.6" strokeWidth="2.06349" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.63492 15.0635C10.7384 8.05862 17.9851 3.09521 27.0317 3.09521C36.0784 3.09521 43.3251 8.05862 46.4286 15.0635C43.3251 22.0683 36.0784 27.0317 27.0317 27.0317C17.9851 27.0317 10.7384 22.0683 7.63492 15.0635Z" stroke="#FFC99D" strokeOpacity="0.6" strokeWidth="2.06349" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M45.1905 1.03174C49.5211 1.03174 53.0317 4.54239 53.0317 8.87301V20.8413C53.0317 25.1719 49.5211 28.6825 45.1905 28.6825" stroke="#FFC99D" strokeOpacity="0.6" strokeWidth="2.06349"/>
                <path d="M8.87302 28.6826C4.5424 28.6826 1.03175 25.172 1.03175 20.8413L1.03175 8.87308C1.03175 4.54247 4.54241 1.03182 8.87302 1.03182" stroke="#FFC99D" strokeOpacity="0.6" strokeWidth="2.06349"/>
              </svg>
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
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1 }} />

            {/* Left sidebar */}
            <div style={{
              position: "fixed", left: 0, top: 0,
              width: 80, height: "100vh", padding: "8px 0",
              background: "transparent",
              zIndex: 3,
              display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center",
              gap: 613,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img src="/icons/experience.svg" alt="Experience" style={{ width: 32, filter: "invert(1) sepia(1) saturate(2) hue-rotate(340deg)", opacity: 0.6 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                <img src="/icons/bank.svg" alt="Bank" style={{ width: 33, opacity: 0.45 }} />
                <img src="/icons/insights.svg" alt="Insights" style={{ width: 30, opacity: 0.45 }} />
                <img src="/icons/sensory-channels.svg" alt="Sensory Channels" style={{ width: 27, opacity: 0.45 }} />
                <img src="/icons/eye.svg" alt="" style={{ width: 28, opacity: 0.35 }} />
              </div>
            </div>

            {/* Top header */}
            <div style={{
              position: "absolute", top: 0, left: 80, right: 0, height: 60,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 28px", zIndex: 3,
            }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                  STEP 00 / INTRODUCTION
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                  Autism Simulator Experience
                </div>
              </div>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: "rgba(255,255,255,0.7)" }}>
                Simulation&nbsp;|&nbsp;<span style={{ textDecoration: "underline", cursor: "pointer" }}>Exit</span>
              </div>
            </div>

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
              position: "absolute", top: 0, bottom: 0, left: 80, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20, zIndex: 2,
            }}>
              <img src="/logo.svg" alt="Aura" style={{ width: 52, filter: "invert(75%) sepia(40%) saturate(500%) hue-rotate(335deg) brightness(105%)", opacity: 0.6 }} />

              <h1 style={{
                fontFamily: "'Amiri', serif",
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                color: "white", margin: 0,
                textAlign: "center", lineHeight: 1.15, fontWeight: 400,
              }}>
                Aura Simulator
              </h1>

              <p style={{
                fontSize: 14, letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.7)",
                margin: 0, textAlign: "center",
              }}>
                A simulation of the autistic perception
              </p>

              <button
                type="button"
                className="aura-btn"
                onClick={() => navigate("/onboard")}
                style={{
                  marginTop: 24,
                  background: "#FFC99D", color: "#000",
                  border: "none", borderRadius: 50,
                  padding: "16px 48px",
                  fontSize: 13, letterSpacing: "0.12em",
                  fontWeight: 600, cursor: "pointer",
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
