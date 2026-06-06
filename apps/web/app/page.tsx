"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<"landing" | "intro">("landing");

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      {/* Background video */}
      <video
        src="/videos/mp4.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Vignette overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
        pointerEvents: "none",
      }} />

      {/* SCREEN 1 — Landing */}
      {screen === "landing" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <button
            type="button"
            onClick={() => setScreen("intro")}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 8, background: "none", border: "none", cursor: "pointer",
            }}
          >
            {/* Eye SVG */}
            <svg width="44" height="30" viewBox="0 0 44 30" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Left bracket arc */}
              <path d="M4 15 C4 7 10 2 22 2" />
              {/* Right bracket arc */}
              <path d="M40 15 C40 7 34 2 22 2" />
              {/* Bottom arcs */}
              <path d="M4 15 C4 23 10 28 22 28" />
              <path d="M40 15 C40 23 34 28 22 28" />
              {/* Outer eye ellipse */}
              <ellipse cx="22" cy="15" rx="10" ry="10" />
              {/* Inner iris circle */}
              <circle cx="22" cy="15" r="4" />
            </svg>
            <span style={{
              fontSize: 10, letterSpacing: "0.35em", fontWeight: 300,
              textTransform: "uppercase", color: "white",
            }}>
              BEGIN
            </span>
          </button>
        </div>
      )}

      {/* SCREEN 2 — Intro */}
      {screen === "intro" && (
        <>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');`}</style>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 32, padding: "0 24px",
          }}>
            {/* Logo */}
            <img src="/logo.svg" alt="Aura" style={{ height: 40 }} />

            {/* Heading */}
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

            {/* Subtitle */}
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.7)",
              textAlign: "center", lineHeight: 1.7, maxWidth: 480, margin: 0,
            }}>
              An immersive simulation of the autistic sensory experience — grounded in peer-reviewed research.
            </p>

            {/* CTA */}
            <button
              type="button"
              onClick={() => router.push("/onboard")}
              style={{
                background: "#FFC99D", color: "#000",
                border: "none", borderRadius: 8,
                padding: "14px 40px",
                fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase",
                fontWeight: 500, cursor: "pointer",
              }}
            >
              Enter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
