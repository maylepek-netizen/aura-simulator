"use client";

interface AppHeaderProps {
  step: string;
  showBank?: boolean;
  onBankClick?: () => void;
  position?: "fixed" | "absolute";
}

export default function AppHeader({ step, showBank = false, onBankClick, position = "fixed" }: AppHeaderProps) {
  return (
    <div style={{
      position, top: 0, left: 80, right: 0, height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", zIndex: 10,
      lineHeight: 1,
    }}>
      {/* LEFT: step label */}
      <div style={{
        display: "flex", alignItems: "center",
        fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.9)", fontWeight: 500,
        lineHeight: 1,
      }}>
        {step}
      </div>

      {/* RIGHT: optional bank button + nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, lineHeight: 1 }}>
        {showBank && (
          <button
            type="button"
            onClick={onBankClick}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "transparent",
              border: "1px solid rgba(255,201,157,0.35)",
              borderRadius: 8,
              padding: "7px 16px",
              color: "rgba(255,201,157,0.85)",
              fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", lineHeight: 1,
            }}
          >
            <img
              src="/icons/bank.svg"
              alt=""
              style={{ width: 16, display: "block", filter: "brightness(0) saturate(100%) invert(83%) sepia(19%) saturate(800%) hue-rotate(330deg)" }}
            />
            Simulation Bank
          </button>
        )}
        <div style={{
          fontSize: 12, letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1,
        }}>
          Simulation&nbsp;|&nbsp;<span style={{ textDecoration: "underline", cursor: "pointer" }}>Exit</span>
        </div>
      </div>
    </div>
  );
}
