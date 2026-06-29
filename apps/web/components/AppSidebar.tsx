"use client";

import { useRouter } from "next/navigation";

export default function AppSidebar() {
  const router = useRouter();
  return (
    <div style={{
      position: "fixed", left: 0, top: 0,
      width: 80, height: "100vh",
      background: "transparent",
      zIndex: 10,
    }}>
      {/* Top icon — vertically centered within the 60px header row */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img
          src="/logo-orange.svg"
          alt="Home"
          onClick={() => router.push("/")}
          style={{ width: 28, opacity: 0.6, cursor: "pointer", transition: "opacity 0.2s", display: "block" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.6"; }}
        />
      </div>

      {/* Bottom icon group */}
      <div style={{
        position: "absolute", bottom: 28, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 32,
      }}>
        <img src="/icons/bank.svg" alt="Bank" style={{ width: 33, opacity: 0.45 }} />
        <img src="/icons/insights.svg" alt="Insights" style={{ width: 30, opacity: 0.45 }} />
        <img src="/icons/sensory-channels.svg" alt="Sensory Channels" style={{ width: 27, opacity: 0.45 }} />
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
