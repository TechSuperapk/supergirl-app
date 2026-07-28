// Central crash / error reporting — now Sentry (replaces Firebase Crashlytics).
// Sentry.init() runs once in App.tsx; these helpers are safe no-ops when Sentry
// is disabled (no DSN configured).
import * as Sentry from '@sentry/react-native';

/** Record a caught, non-fatal error with an optional context tag. */
export function recordError(error: unknown, context?: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    Sentry.captureException(err, context ? { tags: { context } } : undefined);
  } catch { /* never let reporting crash the app */ }
}

/** Breadcrumb attached to the next error report. */
export function logBreadcrumb(message: string): void {
  try { Sentry.addBreadcrumb({ message }); } catch { }
}

/** Tag reports with the signed-in user so errors are traceable per user. */
export function setCrashUser(userId: string | null): void {
  try { Sentry.setUser(userId ? { id: userId } : null); } catch { }
}

/**
 * Install global JS error hooks. Sentry's React Native SDK already captures
 * fatal JS errors and native crashes automatically once Sentry.init runs, so
 * this only adds unhandled-promise-rejection capture as a non-fatal.
 */
export function initCrashReporting(): void {
  try {
    const g = global as any;
    if (typeof g.HermesInternal?.enablePromiseRejectionTracker === 'function') {
      g.HermesInternal.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (_id: number, rejection: unknown) => recordError(rejection, 'UNHANDLED_REJECTION'),
        onHandled: () => { },
      });
    }
    logBreadcrumb('crashReporting initialized (Sentry)');
  } catch { /* reporting must never break startup */ }
}
