export default function AppSidebar() {
  return (
    <div style={{
      position: "fixed", left: 0, top: 0,
      width: 80, height: "100vh", padding: "8px 0",
      background: "transparent",
      zIndex: 10,
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      gap: 613,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/logo.svg" alt="Experience" style={{ width: 32, opacity: 0.6 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <img src="/icons/bank.svg" alt="Bank" style={{ width: 33, opacity: 0.45 }} />
        <img src="/icons/insights.svg" alt="Insights" style={{ width: 30, opacity: 0.45 }} />
        <img src="/icons/sensory-channels.svg" alt="Sensory Channels" style={{ width: 27, opacity: 0.45 }} />
        <img src="/logo.svg" alt="" style={{ width: 28, opacity: 0.6 }} />
      </div>
    </div>
  );
}
