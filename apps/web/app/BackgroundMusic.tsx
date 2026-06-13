"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    backgroundMusic: HTMLAudioElement;
  }
}

// Audio is initialized in app/page.tsx on BEGIN click and stored on window.backgroundMusic
// This component is kept as a mount point for the global Window type declaration only
export function BackgroundMusic() {
  return null;
}
