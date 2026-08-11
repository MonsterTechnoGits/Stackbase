'use client';

import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';
import type { ReactNode } from 'react';

// ─── Shared variant definitions ─────────────────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const errorShake: Variants = {
  shake: { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.3 } },
};

// ─── Shared transition presets ───────────────────────────────────────────────

export const transition = {
  default: { duration: 0.2, ease: 'easeOut' },
  spring: { type: 'spring', stiffness: 400, damping: 17 } as const,
  slow: { duration: 0.35, ease: 'easeOut' },
} as const;

// ─── Tap / hover spring (use on every interactive element) ───────────────────

export const tapSpring = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: transition.spring,
} as const;

// ─── Primitive components ─────────────────────────────────────────────────────

type MotionFadeProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  duration?: number;
};

export function MotionFade({ children, duration = 0.2, ...props }: MotionFadeProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={reduced ? {} : fadeIn}
      transition={{ duration: reduced ? 0 : duration }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionFadeUpProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  duration?: number;
};

export function MotionFadeUp({ children, duration = 0.25, ...props }: MotionFadeUpProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={reduced ? {} : fadeInUp}
      transition={{ duration: reduced ? 0 : duration, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerProps = {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
};

export function MotionStagger({ children, staggerDelay = 0.05, className }: MotionStaggerProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={
        reduced
          ? {}
          : {
              visible: { transition: { staggerChildren: staggerDelay } },
            }
      }
    >
      {children}
    </motion.div>
  );
}

type MotionStaggerItemProps = HTMLMotionProps<'div'> & { children: ReactNode };

export function MotionStaggerItem({ children, ...props }: MotionStaggerItemProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div variants={reduced ? {} : fadeInUp} {...props}>
      {children}
    </motion.div>
  );
}

// Re-export framer-motion primitives so consumers don't import framer-motion directly
export { motion, AnimatePresence, useReducedMotion };
