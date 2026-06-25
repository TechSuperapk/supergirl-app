/**
 * notificationService.ts
 *
 * Handles:
 *  - Push permission request
 *  - Expo push token registration + Firestore persistence
 *  - Foreground notification handling
 *  - Notification tap navigation routing
 *  - Local notification scheduling (reminders)
 *
 * Uses expo-notifications (already available in Expo SDK 54).
 * For FCM data messages on Android, configure google-services.json.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { AppNotification, NotificationType } from '../store/notificationsSlice';

// ── Configure foreground behaviour ────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── Register for push ─────────────────────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[FCM] Skipping push registration — not a physical device');
    return null;
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[FCM] Push permission not granted');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2979FF',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'super-bae', // matches your Firebase project ID — update if changed
  });

  const token = tokenData.data;

  // Persist to Firestore
  try {
    await updateDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      pushPlatform: Platform.OS,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[FCM] Could not persist push token:', err);
  }

  return token;
}

// ── Parse notification data into AppNotification ──────────────────────────────
export function parseNotification(
  notification: Notifications.Notification,
): AppNotification {
  const data = notification.request.content.data ?? {};
  const type = (data.type as NotificationType) ?? 'like';

  return {
    id: notification.request.identifier,
    type,
    title: notification.request.content.title ?? '',
    body: notification.request.content.body ?? '',
    data: data as Record<string, string>,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

// ── Navigation routing from notification tap ──────────────────────────────────
export interface NavTarget {
  screen: string;
  params?: Record<string, string>;
}

export function resolveNavTarget(notif: AppNotification): NavTarget | null {
  const { type, data } = notif;

  switch (type) {
    case 'like':
    case 'comment':
    case 'reply':
      if (data?.postId) return { screen: 'PostDetail', params: { postId: data.postId } };
      return { screen: 'ClubFeed' };

    case 'group_message':
      if (data?.groupId) return { screen: 'GroupChat', params: { groupId: data.groupId } };
      return { screen: 'GroupsList' };

    case 'event_reminder':
      if (data?.eventId) return { screen: 'EventDetail', params: { eventId: data.eventId } };
      return { screen: 'EventsList' };

    case 'subscription_expiry':
      return { screen: 'Subscription' };

    case 'journal_reminder':
      return { screen: 'Journal' };

    case 'tracker_reminder':
      return { screen: 'TrackersHome' };

    case 'planner_reminder':
      return { screen: 'WeeklyPlanner' };

    default:
      return null;
  }
}

// ── Local scheduled notifications ─────────────────────────────────────────────
export async function scheduleDailyReminder(
  identifier: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
  channelId: string = 'reminders',
): Promise<void> {
  // Cancel existing with same identifier first
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => { });

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: 'default',
      data: { type: 'journal_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelReminder(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => { });
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Badge count ───────────────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ── Default reminder identifiers ──────────────────────────────────────────────
export const REMINDER_IDS = {
  JOURNAL: 'reminder_journal_daily',
  TRACKER: 'reminder_tracker_daily',
  PLANNER: 'reminder_planner_morning',
} as const;

// ── Schedule default reminders on first launch ────────────────────────────────
export async function scheduleDefaultReminders(): Promise<void> {
  await scheduleDailyReminder(
    REMINDER_IDS.JOURNAL,
    '📓 Time to journal',
    'Take 5 minutes to reflect on your day.',
    21, 0,
    'reminders',
  );

  await scheduleDailyReminder(
    REMINDER_IDS.TRACKER,
    '📊 Daily check-in',
    'Log your mood, sleep, and habits.',
    8, 30,
    'reminders',
  );

  await scheduleDailyReminder(
    REMINDER_IDS.PLANNER,
    '👗 Today\'s outfit',
    'Check what you\'ve planned to wear today.',
    7, 30,
    'reminders',
  );
}
