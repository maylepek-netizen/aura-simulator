"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    backgroundMusic: HTMLAudioElement;
  }
}

// Resumes background music on every page navigation.
// Audio is first created in app/page.tsx on BEGIN click.
export function BackgroundMusic() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const music = window.backgroundMusic;
    if (!music) return;

    // On result page the simulation itself handles music — don't auto-resume there
    if (pathname === "/result") return;

    if (music.paused) {
      music.volume = 0.35;
      music.play().catch(() => {});
    }
  }, [pathname]);

  return null;
}
