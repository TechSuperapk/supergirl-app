import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  setFcmToken,
  setPermissionGranted,
  prependNotification,
  markAllRead,
  setNotifications,
} from '../store/notificationsSlice';
import {
  registerForPushNotifications,
  parseNotification,
  resolveNavTarget,
  setBadgeCount,
  clearBadge,
  scheduleDefaultReminders,
} from '../services/notificationService';

export function useNotifications(navigationRef?: React.RefObject<any>) {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount);
  const permGranted = useSelector((s: RootState) => s.notifications.permissionGranted);

  const notifListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  // ── Register ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications(user.id)
      .then(token => {
        if (token) {
          dispatch(setFcmToken(token));
          dispatch(setPermissionGranted(true));
          scheduleDefaultReminders();
        }
      })
      .catch(err => console.warn('[useNotifications] register error:', err));
  }, [user?.id]);

  // ── Foreground notification listener ──────────────────────────────────────
  useEffect(() => {
    notifListener.current = Notifications.addNotificationReceivedListener(notif => {
      const parsed = parseNotification(notif);
      dispatch(prependNotification(parsed));
    });

    return () => {
      if (notifListener.current)
        notifListener.current.remove();
    };
  }, [dispatch]);

  // ── Tap response listener → navigate ─────────────────────────────────────
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const parsed = parseNotification(response.notification);
        dispatch(prependNotification(parsed));

        if (navigationRef?.current) {
          const target = resolveNavTarget(parsed);
          if (target) {
            try {
              navigationRef.current.navigate(target.screen, target.params);
            } catch { }
          }
        }
      },
    );

    return () => {
      if (responseListener.current)
        responseListener.current.remove();
    };
  }, [dispatch, navigationRef]);

  // ── Sync badge count ──────────────────────────────────────────────────────
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

  // ── Clear badge when app comes to foreground ──────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') clearBadge();
    });
    return () => sub.remove();
  }, []);

  const markRead = useCallback(() => {
    dispatch(markAllRead());
    clearBadge();
  }, [dispatch]);

  return { permGranted, unreadCount, markRead };
}
