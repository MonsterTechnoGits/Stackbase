'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';

type Origin = { x: number; y: number };
type ThemeRippleContextValue = { triggerRipple: (origin: Origin) => void };

const ThemeRippleContext = createContext<ThemeRippleContextValue | null>(null);

export function useThemeRipple() {
  const ctx = useContext(ThemeRippleContext);
  if (!ctx) throw new Error('useThemeRipple must be used inside ThemeRippleProvider');
  return ctx;
}

type RippleState = {
  origin: Origin;
  nextTheme: string;
  maxRadius: number;
  phase: 'expanding' | 'fading';
};

// Injected during expand so no element flickers before the overlay fully covers the screen.
// Removed before fade-out so content transitions smoothly as the overlay disappears.
function setTransitionsBlocked(blocked: boolean) {
  const id = '__theme-ripple-no-transition__';
  if (blocked) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
      '*:not([data-theme-ripple]), *:not([data-theme-ripple])::before, *:not([data-theme-ripple])::after { transition: none !important; }';
    document.head.appendChild(s);
  } else {
    document.getElementById(id)?.remove();
  }
}

export function ThemeRippleProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [ripple, setRipple] = useState<RippleState | null>(null);
  const animatingRef = useRef(false);

  const triggerRipple = useCallback(
    (origin: Origin) => {
      if (animatingRef.current) return;
      animatingRef.current = true;

      const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
      const maxRadius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y),
      );

      // Block transitions so nothing flickers while the ripple is still expanding
      setTransitionsBlocked(true);
      setRipple({ origin, nextTheme, maxRadius, phase: 'expanding' });
    },
    [resolvedTheme],
  );

  const handleAnimationEnd = useCallback(() => {
    if (!ripple) return;

    if (ripple.phase === 'expanding') {
      // Overlay fully covers screen — switch the theme (invisible under overlay)
      setTheme(ripple.nextTheme);
      // Re-enable transitions BEFORE fade-out so content smoothly reveals
      setTransitionsBlocked(false);
      setRipple((r) => r && { ...r, phase: 'fading' });
    } else {
      // Fade-out complete — remove overlay
      setRipple(null);
      animatingRef.current = false;
    }
  }, [ripple, setTheme]);

  return (
    <ThemeRippleContext.Provider value={{ triggerRipple }}>
      {children}

      {ripple && (
        <>
          <style>{`
            @keyframes theme-ripple-expand {
              from { clip-path: circle(0px at ${ripple.origin.x}px ${ripple.origin.y}px); }
              to   { clip-path: circle(${ripple.maxRadius}px at ${ripple.origin.x}px ${ripple.origin.y}px); }
            }
            @keyframes theme-ripple-fade {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
          `}</style>
          <div
            aria-hidden
            data-theme-ripple
            onAnimationEnd={handleAnimationEnd}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              pointerEvents: 'none',
              background: ripple.nextTheme === 'dark' ? 'oklch(0.148 0.004 228.8)' : 'oklch(1 0 0)',
              ...(ripple.phase === 'expanding'
                ? {
                    clipPath: `circle(0px at ${ripple.origin.x}px ${ripple.origin.y}px)`,
                    animation: 'theme-ripple-expand 550ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
                  }
                : {
                    clipPath: `circle(${ripple.maxRadius}px at ${ripple.origin.x}px ${ripple.origin.y}px)`,
                    animation: 'theme-ripple-fade 350ms ease-out forwards',
                  }),
            }}
          />
        </>
      )}
    </ThemeRippleContext.Provider>
  );
}
