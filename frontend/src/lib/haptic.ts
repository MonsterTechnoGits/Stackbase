export enum HapticFeedbackType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection',
}

const getVibrationPattern = (type: HapticFeedbackType): number | number[] => {
  switch (type) {
    case HapticFeedbackType.LIGHT:
      return 10;
    case HapticFeedbackType.MEDIUM:
      return 20;
    case HapticFeedbackType.HEAVY:
      return 30;
    case HapticFeedbackType.SUCCESS:
      return [10, 50, 10];
    case HapticFeedbackType.WARNING:
      return [20, 50, 20];
    case HapticFeedbackType.ERROR:
      return [30, 100, 30];
    case HapticFeedbackType.SELECTION:
      return 5;
    default:
      return 10;
  }
};

export const triggerHaptic = (type: HapticFeedbackType = HapticFeedbackType.LIGHT): void => {
  if (typeof window === 'undefined') return;

  // In Android WebView, navigator.vibrate is unreliable (blocked without direct user gesture).
  // Always prefer the native bridge when available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const androidBridge = (window as any).AndroidBridge;
  if (androidBridge?.vibrate) {
    try {
      const ms = getVibrationPattern(type);
      androidBridge.vibrate(Array.isArray(ms) ? ms[0] : ms);
      return;
    } catch {
      // fall through to Vibration API
    }
  }

  // Fallback: Web Vibration API (browser / PWA context outside WebView)
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(getVibrationPattern(type));
    } catch {
      // not supported
    }
  }
};

export const triggerHapticSequence = async (
  sequence: Array<{ type: HapticFeedbackType; delay?: number }>,
): Promise<void> => {
  for (const { type, delay = 0 } of sequence) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    triggerHaptic(type);
  }
};

export const isHapticSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const androidBridge = (window as any).AndroidBridge;
  // Prefer bridge check — navigator.vibrate exists in WebView but is often blocked
  return !!androidBridge?.vibrate || 'vibrate' in navigator;
};
