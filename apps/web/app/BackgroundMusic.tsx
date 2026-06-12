"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    backgroundMusic: HTMLAudioElement;
  }
}

export function BackgroundMusic() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.backgroundMusic) return; // already mounted (StrictMode double-invoke guard)

    const audio = new Audio("/sounds/background%20music%20.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    window.backgroundMusic = audio;

    audio.play().catch(() => {
      document.addEventListener("click", () => audio.play(), { once: true });
    });

    return () => {
      // Don't destroy on unmount — layout never unmounts during navigation
    };
  }, []);

  return null;
}
