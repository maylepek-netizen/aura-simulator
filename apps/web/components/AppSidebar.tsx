"use client";

import { useRouter } from "next/navigation";

export default function AppSidebar() {
  const router = useRouter();
  return (
    <div style={{
      // Anchored to the left edge; its icons are pushed inward by the shared
      // --gutter (via padding-left on the icon rows) so the logo and bottom
      // icons share the same left margin as the header and page content.
      position: "fixed", left: 0, top: 0,
      width: "auto", height: "100vh",
      background: "transparent",
      zIndex: 10,
    }}>
      {/* Top icon — vertically centered within the 60px header row, inset by the
          gutter so it lines up with the header's step label. */}
      <div style={{
        position: "absolute", top: 0, left: 0, height: 60,
        paddingLeft: "var(--gutter)",
        display: "flex", alignItems: "center",
      }}>
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
        position: "absolute", bottom: 28, left: 0,
        paddingLeft: "var(--gutter)",
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 32,
      }}>
        <img
          src="/icons/bank.svg"
          alt="Bank"
          onClick={() => router.push("/bank")}
          style={{ width: 33, opacity: 0.45, cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.45"; }}
        />
        <img
          src="/icons/insights.svg"
          alt="Research"
          onClick={() => router.push("/research")}
          style={{ width: 26, opacity: 0.6, cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.6"; }}
        />
      </div>
    </div>
  );
}
