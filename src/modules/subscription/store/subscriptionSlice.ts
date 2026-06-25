import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';

type SubscriptionStatus = 'idle' | 'active' | 'expired' | 'cancelled';
type SubscriptionProvider = 'ios_iap' | 'android_iap' | 'razorpay' | null;

interface SubscriptionState {
  status:     SubscriptionStatus;
  plan:       'yearly' | null;
  expiresAt:  string | null;
  provider:   SubscriptionProvider;
  loading:    LoadingState;
  error:      string | null;
}

const initialState: SubscriptionState = {
  status:    'idle',
  plan:      null,
  expiresAt: null,
  provider:  null,
  loading:   'idle',
  error:     null,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setLoading(state, a: PayloadAction<LoadingState>) { state.loading = a.payload; },
    setError(state, a: PayloadAction<string | null>)  { state.error = a.payload; },
    setSubscription(
      state,
      a: PayloadAction<{
        status:    SubscriptionStatus;
        plan:      'yearly' | null;
        expiresAt: string | null;
        provider:  SubscriptionProvider;
      }>,
    ) {
      state.status    = a.payload.status;
      state.plan      = a.payload.plan;
      state.expiresAt = a.payload.expiresAt;
      state.provider  = a.payload.provider;
    },
    clearSubscription(state) {
      state.status    = 'idle';
      state.plan      = null;
      state.expiresAt = null;
      state.provider  = null;
    },
  },
});

export const {
  setLoading, setError, setSubscription, clearSubscription,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
