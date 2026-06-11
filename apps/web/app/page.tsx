"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Screen = "idle" | "landing" | "intro";

export default function LandingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("landing");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScreen = useRef<Screen>("landing");

  function wakeUp() {
    if (currentScreen.current === "idle") setScreen("landing");
  }

  function resetIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (currentScreen.current === "idle") return;
    idleTimer.current = setTimeout(() => setScreen("idle"), 45_000);
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
          src="https://res.cloudinary.com/duhsqezo3/video/upload/v1781117441/%D7%9C%D7%90_%D7%A6%D7%A8%D7%99%D7%9A_%D7%9C%D7%94%D7%99%D7%95%D7%AA_%D7%9E%D7%A1%D7%95%D7%9B%D7%9F_%D7%90%D7%95_%D7%9E%D7%91%D7%99%D7%9A_%D7%A4%D7%A9_wo1ecc.mp4"
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
            <span className="aura-breathe" style={{
              fontFamily: "'Amiri', serif",
              fontSize: "clamp(3rem, 7vw, 5rem)",
              color: "rgba(255,255,255,0.32)",
              letterSpacing: "0.55em",
              lineHeight: 1,
              userSelect: "none",
              position: "relative", zIndex: 2,
            }}>
              AURA
            </span>
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
              <img
                src="/icons/Exeprience.svg"
                alt="Eye icon"
                className="begin-icon"
                style={{ width: 52 }}
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
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1 }} />

            {/* Left sidebar */}
            <div style={{
              position: "fixed", left: 0, top: 0,
              width: 135, height: "100vh", padding: "8px 0",
              background: "rgba(0,0,0,0.38)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              zIndex: 3,
              display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center",
              gap: 613,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <img src="/icons/Exeprience.svg" alt="Experience" style={{ width: 28 }} />
                <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.9)" }}>Experience</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <img src="/icons/bank.svg" alt="Bank" style={{ width: 33, opacity: 0.45 }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)" }}>Bank</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <img src="/icons/insights.svg" alt="Insights" style={{ width: 30, opacity: 0.45 }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)" }}>Insights</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <img src="/icons/sensory-channels.svg" alt="Sensory Channels" style={{ width: 27, opacity: 0.45 }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.3 }}>Sensory<br />Channels</span>
                </div>
                <img src="/icons/Exeprience.svg" alt="" style={{ width: 28, opacity: 0.35 }} />
              </div>
            </div>

            {/* Top header */}
            <div style={{
              position: "absolute", top: 0, left: 135, right: 0, height: 60,
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
              position: "absolute", top: 0, bottom: 0, left: 135, right: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20, zIndex: 2,
            }}>
              <img src="/logo.svg" alt="Aura" style={{ height: 40 }} />

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
                Enter another perception
              </p>

              <button
                type="button"
                onClick={() => router.push("/onboard")}
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
