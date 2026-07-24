"use client";

import { useRouter } from "next/navigation";

export default function AppSidebar() {
  const router = useRouter();
  return (
    <div style={{
      // Fixed left strip, inset from the edges by the shared safe area:
      // var(--gutter) from the left, top and bottom. The strip is a fixed 33px
      // wide (widest icon) column so its children never collapse; the logo sits
      // at the top aligned with the header row, the bank/research icons at the
      // bottom.
      position: "fixed",
      left: "var(--gutter)",
      top: "var(--gutter)",
      bottom: "var(--gutter)",
      width: 33,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "flex-start",
      background: "transparent",
      zIndex: 10,
    }}>
      {/* Top icon — sits in the header row height (32px) so it lines up with the
          step label on the right. */}
      <div style={{ height: 32, display: "flex", alignItems: "center" }}>
        <img
          src="/icons/New_logo_eye.svg"
          alt="Home"
          onClick={() => router.push("/")}
          style={{ width: 28, opacity: 0.6, cursor: "pointer", transition: "opacity 0.2s", display: "block" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.6"; }}
        />
      </div>

      {/* Bottom icon group */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 32,
      }}>
        <img
          src="/icons/bank.svg"
          alt="Bank"
          onClick={() => router.push("/bank")}
          style={{ width: 33, opacity: 0.45, cursor: "pointer", transition: "opacity 0.2s", display: "block" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.45"; }}
        />
        <img
          src="/icons/insights.svg"
          alt="Research"
          onClick={() => router.push("/research")}
          style={{ width: 26, opacity: 0.6, cursor: "pointer", transition: "opacity 0.2s", display: "block" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.6"; }}
        />
      </div>
    </div>
  );
}
