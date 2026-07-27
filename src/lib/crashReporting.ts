// Central crash reporting — Firebase Crashlytics.
//
// IMPORTANT: this module must never crash the app it's supposed to be
// monitoring. @react-native-firebase packages validate their native module
// at IMPORT time — a static `import crashlytics from '...'` throws
// "Native module RNFBAppModule not found" the moment the JS bundle
// evaluates in any binary that doesn't include the Firebase native code
// (Expo Go, or a dev client built before the dependency was added). So the
// package is loaded lazily inside a try/catch, and every call no-ops when
// it isn't available. Native crash capture (SIGSEGV etc.) is automatic
// once the module is in the binary; everything here covers the JS side.

type CrashlyticsModule = {
  log: (msg: string) => void;
  recordError: (err: Error) => void;
  setUserId: (id: string) => Promise<null> | void;
};

let cached: CrashlyticsModule | null | undefined; // undefined = not tried yet

function instance(): CrashlyticsModule | null {
  // Firebase Crashlytics has been removed (migrated off Firebase). Crash
  // reporting is a no-op for now; a Sentry integration can replace it later.
  // Keeping this function so the rest of the module's API is unchanged.
  return null;
}

/** Record a caught, non-fatal JS error with an optional context tag. */
export function recordError(error: unknown, context?: string): void {
  const c = instance();
  if (!c) return;
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context) c.log(`[${context}] ${err.message}`);
    c.recordError(err);
  } catch { /* never let reporting crash the app */ }
}

/** Breadcrumb log attached to the next crash report. */
export function logBreadcrumb(message: string): void {
  try { instance()?.log(message); } catch { }
}

/** Tag reports with the signed-in user so crashes are traceable per user. */
export function setCrashUser(userId: string | null): void {
  const c = instance();
  if (!c) return;
  try { c.setUserId(userId ?? ''); } catch { }
}

/**
 * Install global JS error hooks. Call once at startup.
 * - ErrorUtils global handler: fatal JS errors (red-screen class) are
 *   recorded before RN's default handler shows/kills the app.
 * - Unhandled promise rejections: recorded as non-fatals.
 */
export function initCrashReporting(): void {
  try {
    // Fatal JS errors
    const ErrorUtils = (global as any).ErrorUtils;
    if (ErrorUtils?.getGlobalHandler) {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        recordError(error, isFatal ? 'FATAL' : 'GLOBAL');
        defaultHandler?.(error, isFatal);
      });
    }

    // Unhandled promise rejections (Hermes exposes this hook)
    const g = global as any;
    if (typeof g.HermesInternal?.enablePromiseRejectionTracker === 'function') {
      g.HermesInternal.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (_id: number, rejection: unknown) => {
          recordError(rejection, 'UNHANDLED_REJECTION');
        },
        onHandled: () => { },
      });
    }

    logBreadcrumb('crashReporting initialized');
  } catch { /* reporting must never break startup */ }
}
