import { configureStore } from '@reduxjs/toolkit';
import journalReducer       from '../modules/journaling/store/journalSlice';
import authReducer          from '../modules/auth/store/authSlice';
import clubReducer          from '../modules/club/store/clubSlice';
import fitsReducer          from '../modules/fits/store/fitsSlice';
import trackersReducer      from '../modules/trackers/store/trackersSlice';
import boardsReducer        from '../modules/boards/store/boardsSlice';
import subscriptionReducer  from '../modules/subscription/store/subscriptionSlice';
import notificationsReducer from '../modules/notifications/store/notificationsSlice';
import { attachAutoSave, hydrateFromCache } from './offlineCache';

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    journal:       journalReducer,
    club:          clubReducer,
    fits:          fitsReducer,
    trackers:      trackersReducer,
    boards:        boardsReducer,
    subscription:  subscriptionReducer,
    notifications: notificationsReducer,
  },
  middleware: (g) => g({ serializableCheck: false }),
});

// Local offline backup: persist on change, hydrate on launch.
attachAutoSave(store);
hydrateFromCache(store);

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
