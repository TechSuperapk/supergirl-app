import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationType =
  | 'like' | 'comment' | 'reply' | 'group_message'
  | 'event_reminder' | 'subscription_expiry'
  | 'journal_reminder' | 'tracker_reminder' | 'planner_reminder';

export interface AppNotification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  data?:     Record<string, string>;
  isRead:    boolean;
  createdAt: string;
}

interface NotificationsState {
  items:         AppNotification[];
  unreadCount:   number;
  fcmToken:      string | null;
  permissionGranted: boolean;
}

const initialState: NotificationsState = {
  items:             [],
  unreadCount:       0,
  fcmToken:          null,
  permissionGranted: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFcmToken(state, a: PayloadAction<string>)         { state.fcmToken = a.payload; },
    setPermissionGranted(state, a: PayloadAction<boolean>){ state.permissionGranted = a.payload; },
    setNotifications(state, a: PayloadAction<AppNotification[]>) {
      state.items       = a.payload;
      state.unreadCount = a.payload.filter(n => !n.isRead).length;
    },
    prependNotification(state, a: PayloadAction<AppNotification>) {
      state.items.unshift(a.payload);
      if (!a.payload.isRead) state.unreadCount += 1;
    },
    markAllRead(state) {
      state.items       = state.items.map(n => ({ ...n, isRead: true }));
      state.unreadCount = 0;
    },
    markRead(state, a: PayloadAction<string>) {
      const n = state.items.find(n => n.id === a.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
  },
});

export const {
  setFcmToken, setPermissionGranted,
  setNotifications, prependNotification, markAllRead, markRead,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
