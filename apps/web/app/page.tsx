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
        {/* Background video */}
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
        }} />

        {/* ── SCREEN 00 — IDLE ── */}
        {screen === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16, cursor: "pointer",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1,
            }} />
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

        {/* ── SCREEN 01 — LANDING ── */}
        {screen === "landing" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* Dark overlay */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1,
            }} />

            {/* Left sidebar */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: 105,
              background: "rgba(0,0,0,0.38)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              zIndex: 3,
              display: "flex", flexDirection: "column",
              alignItems: "center",
              paddingTop: 24, paddingBottom: 24,
              gap: 8,
            }}>
              {/* Top: experience icon + label (active) */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, padding: "10px 0", width: "100%", cursor: "default",
              }}>
                <img src="/icons/experience.svg" alt="Experience" style={{ width: 28, opacity: 1 }} />
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>Experience</span>
              </div>

              {/* Bank */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, padding: "10px 0", width: "100%", cursor: "default",
              }}>
                <img src="/icons/bank.svg" alt="Bank" style={{ width: 28, opacity: 0.45 }} />
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Bank</span>
              </div>

              {/* Insights */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, padding: "10px 0", width: "100%", cursor: "default",
              }}>
                <img src="/icons/insights.svg" alt="Insights" style={{ width: 28, opacity: 0.45 }} />
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Insights</span>
              </div>

              {/* Sensory Channels */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, padding: "10px 0", width: "100%", cursor: "default",
              }}>
                <img src="/icons/sensory channeles.svg" alt="Sensory Channels" style={{ width: 28, opacity: 0.45 }} />
                <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.3 }}>Sensory<br/>Channels</span>
              </div>

              {/* Bottom: experience icon again (footer) */}
              <div style={{ marginTop: "auto" }}>
                <img src="/icons/experience.svg" alt="" style={{ width: 28, opacity: 0.35 }} />
              </div>
            </div>

            {/* Top header */}
            <div style={{
              position: "absolute", top: 0, left: 105, right: 0,
              height: 56,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 28px",
              zIndex: 3,
            }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                  STEP 00 /&nbsp;
                </span>
                <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                  INTRODUCTION
                </span>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                  Autism Simulator Experience
                </div>
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.7)" }}>
                Simulation&nbsp;|&nbsp;<span style={{ textDecoration: "underline", cursor: "pointer" }}>Exit</span>
              </div>
            </div>

            {/* Bottom-right serial */}
            <div style={{
              position: "absolute", bottom: 20, right: 24,
              fontSize: 11, letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.35)",
              zIndex: 3,
            }}>
              Simulation NO. 792734-04
            </div>

            {/* Center content */}
            <button
              type="button"
              className="begin-btn aura-fade-in"
              onClick={() => setScreen("intro")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, background: "none", border: "none", cursor: "pointer",
                padding: 0, zIndex: 2, position: "relative",
                marginLeft: 105,
              }}
            >
              <img
                src="/icons/experience.svg"
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

        {/* ── SCREEN 02 — INTRO ── */}
        {screen === "intro" && (
          <div className="aura-fade-in" style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 32, padding: "0 24px",
          }}>
            <img src="/logo.svg" alt="Aura" style={{ height: 40 }} />

            <h1 style={{
              fontFamily: "'Amiri', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "white",
              textAlign: "center",
              lineHeight: 1.2,
              margin: 0,
              maxWidth: 640,
            }}>
              What does the world feel like from the inside?
            </h1>

            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.7)",
              textAlign: "center", lineHeight: 1.7,
              maxWidth: 480, margin: 0,
            }}>
              An immersive simulation of the autistic sensory experience — grounded in peer-reviewed research.
            </p>

            <button
              type="button"
              onClick={() => router.push("/onboard")}
              style={{
                background: "#FFC99D", color: "#000",
                border: "none", borderRadius: 8,
                padding: "14px 40px",
                fontSize: 11, letterSpacing: "0.25em",
                textTransform: "uppercase",
                fontWeight: 500, cursor: "pointer",
              }}
            >
              Enter
            </button>
          </div>
        )}
      </div>
    </>
  );
}
