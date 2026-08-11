'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { useThemeRipple } from '@/contexts/ThemeRippleContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { triggerRipple } = useThemeRipple();
  const [mounted, setMounted] = useState(false);
  const prefersReduced = useReducedMotion();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        className={cn('opacity-0', className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  function handleClick() {
    if (prefersReduced) {
      // Skip ripple, switch instantly
      setTheme(isDark ? 'light' : 'dark');
      return;
    }

    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      triggerRipple({
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      });
    }
  }

  return (
    <Button
      ref={btnRef}
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className}
      onClick={handleClick}
    >
      <motion.span
        key={resolvedTheme}
        initial={prefersReduced ? false : { opacity: 0, rotate: -30, scale: 0.8 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="flex items-center justify-center"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </motion.span>
    </Button>
  );
}
