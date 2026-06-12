"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

type Navigate = (href: string) => void;

const TransitionCtx = createContext<Navigate>(() => {});

export function useNavigate() {
  return useContext(TransitionCtx);
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const pendingHref = useRef<string | null>(null);
  const animating = useRef(false);

  // When the route actually changes, fade the overlay back out
  useEffect(() => {
    if (overlayOpacity > 0) {
      // Small delay so the new page has mounted before we reveal it
      const t = setTimeout(() => {
        setOverlayOpacity(0);
        animating.current = false;
      }, 80);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      if (animating.current) return;
      animating.current = true;
      pendingHref.current = href;
      setOverlayOpacity(1);
      // Wait for fade-out to complete, then navigate
      setTimeout(() => {
        router.push(href);
      }, 1100);
    },
    [router]
  );

  return (
    <TransitionCtx.Provider value={navigate}>
      {children}

      {/* Full-screen dissolve overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: overlayOpacity,
          pointerEvents: overlayOpacity > 0 ? "all" : "none",
          transition: overlayOpacity === 1
            ? "opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1)"
            : "opacity 1.6s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 9999,
        }}
      />
    </TransitionCtx.Provider>
  );
}
