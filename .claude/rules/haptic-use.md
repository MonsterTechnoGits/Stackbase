# Haptic Feedback Architecture

## Overview

This app runs inside an **Android WebView**. Haptic feedback is implemented via a two-priority bridge:

1. **`window.AndroidBridge.vibrate(ms)`** — primary path. The native Android `JavaScriptBridge.java` registers this interface via `webView.addJavascriptInterface(jsBridge, "AndroidBridge")`. Works reliably inside WebView without a direct user gesture restriction.
2. **`navigator.vibrate(pattern)`** — fallback for browser/PWA contexts outside WebView.

> iOS is intentionally **not supported**. Do not add webkit bridge code.

---

## Files

| File | Role |
|---|---|
| `src/lib/haptic.ts` | Pure utility — no React. Core logic, bridge calls, vibration patterns. |
| `src/hooks/use-haptic.ts` | Thin React hook. Components always import from here, never from `lib/haptic` directly. |

---

## Haptic Types

```ts
enum HapticFeedbackType {
  LIGHT     = 'light'      // 10ms  — nav tap, back button, info action
  MEDIUM    = 'medium'     // 20ms  — submit, state change, confirm
  HEAVY     = 'heavy'      // 30ms  — destructive action (delete, remove)
  SUCCESS   = 'success'    // 10-50-10ms pattern — operation confirmed
  WARNING   = 'warning'    // 20-50-20ms pattern — pre-destructive warning
  ERROR     = 'error'      // 30-100-30ms pattern — failure feedback
  SELECTION = 'selection'  // 5ms   — chip/toggle/radio/filter selection
}
```

---

## Usage in Components

```ts
import { useHaptic, HapticFeedbackType } from '@/hooks/use-haptic';

function MyComponent() {
  const { haptic } = useHaptic();

  return (
    <Button onClick={() => { haptic(HapticFeedbackType.MEDIUM); doSomething(); }}>
      Submit
    </Button>
  );
}
```

---

## When to Use Each Type

| Action | Type |
|---|---|
| Back button, info tap, nav item | `LIGHT` |
| Submit form, confirm action | `MEDIUM` |
| Delete, destructive confirm | `HEAVY` |
| Scan success, operation confirmed | `SUCCESS` |
| Logout button trigger, open delete dialog (pre-warning) | `WARNING` |
| Error toasts (handled automatically via ToastContext) | `ERROR` |
| Filter chip, toggle, radio | `SELECTION` |

---

## Centralized Wiring (already done — do not re-add)

These components fire haptic internally, so **all their usages get haptic automatically**:

| Component | Type | Covers |
|---|---|---|
| `contexts/ToastContext.tsx` | per-type map | All toasts app-wide |
| `components/scanner/scanner-screen.tsx` | `SUCCESS` / `ERROR` | Scan result feedback |

---

## Adding Haptic to a New Feature

1. Import `useHaptic` and `HapticFeedbackType` from `@/hooks/use-haptic`.
2. Call `haptic(type)` **before** the action (so feedback is immediate, not delayed by async work).
3. Prefer wiring haptic **inside reusable components** rather than at every call site.
4. Do **not** wire haptic on `type="submit"` form events — add an `onClick` guard instead (check `canSubmit` before firing).
5. Never import from `src/lib/haptic` directly in component files — always go through the hook.
6. Check the centralized table above before adding haptic to a new component — it may already be covered.

---

# Barcode Scanner Integration

## Current hardware — U4-B Bluetooth/USB (keyboard-wedge mode)

No native work needed. The scanner sends HID keystrokes to the focused WebView input. Already working.

## Future hardware — Zebra SE4710 / SE55 (datawedge-intent mode)

Everything is already implemented in the Android project. Zero manual device configuration needed.

### Files added

| File | Role |
|---|---|
| `android/.../scanner/DataWedgeConfigurator.java` | Sends DataWedge profile setup intents on first launch. Auto-creates the profile, disables keystroke output, enables intent broadcast. |
| `android/.../scanner/ScanBroadcastReceiver.java` | Listens for `com.roitech.scanner.SCAN` broadcast, calls `window.__onBarcodeScan(barcode)` in the WebView. |

### To activate (two changes total)

**1. AppConfig.java** — flip one flag:
```java
public static final boolean ENABLE_ZEBRA_DATAWEDGE = true;  // was false
```

**2. scanner-screen.tsx** — flip one source:
```ts
{ source: "datawedge-intent" }  // was "keyboard-wedge"
```

That's it. On next app launch the DataWedge profile is created automatically. No one touches the DataWedge UI on the device.

### How it works end-to-end

```
Zebra trigger pulled
      ↓
DataWedge (pre-installed) reads SE4710/SE55
      ↓  broadcasts "com.roitech.scanner.SCAN"
ScanBroadcastReceiver.onReceive()
      ↓  webView.evaluateJavascript(...)
window.__onBarcodeScan(barcode)   ← set by useBarcodeScanner hook
      ↓
handleScan(barcode) in ScannerScreen
```

> The JS function name `window.__onBarcodeScan` must not be renamed — it is set/unset by `useBarcodeScanner` automatically when `source === "datawedge-intent"`.
