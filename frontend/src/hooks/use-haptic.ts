'use client';

import { triggerHaptic, triggerHapticSequence, isHapticSupported } from '@/lib/haptic';
export { HapticFeedbackType } from '@/lib/haptic';

export function useHaptic() {
  return {
    haptic: triggerHaptic,
    hapticSequence: triggerHapticSequence,
    isSupported: isHapticSupported,
  };
}
