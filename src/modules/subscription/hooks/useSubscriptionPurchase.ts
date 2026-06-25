import { useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  purchasePremium,
  restorePurchases,
  fetchSubscription,
  isSubscriptionActive,
} from '../services/subscriptionService';
import {
  setSubscription,
  setLoading,
  setError,
} from '../store/subscriptionSlice';
import {
  setSubscriptionPremium,
  setSubscriptionFree,
} from '../../auth/store/authSlice';

export function useSubscriptionPurchase() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const subState = useSelector((s: RootState) => s.subscription);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const activate = (expiresAt: string, provider: string) => {
    dispatch(setSubscriptionPremium({ expiresAt }));
    dispatch(setSubscription({
      status: 'active',
      plan: 'yearly',
      expiresAt,
      provider: provider as any,
    }));
  };

  const buy = async () => {
    if (!user) return;
    setBuying(true);
    dispatch(setLoading('loading'));
    try {
      const result = await purchasePremium(user.id, user.phone);
      if (result.success) {
        activate(result.expiresAt, result.provider);
        Alert.alert(
          '🎉 Welcome to Premium!',
          'You now have full access to Journal, Fits, Trackers, and Boards.',
          [{ text: "Let's go!" }],
        );
      } else {
        dispatch(setError(result.error ?? 'Purchase failed'));
        Alert.alert('Purchase failed', result.error ?? 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      dispatch(setError(err?.message ?? 'Unknown error'));
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    } finally {
      setBuying(false);
      dispatch(setLoading('idle'));
    }
  };

  const restore = async () => {
    if (!user) return;
    setRestoring(true);
    try {
      const result = await restorePurchases(user.id);
      if (result && result.success) {
        activate(result.expiresAt, result.provider);
        Alert.alert('✅ Purchases Restored', 'Your Premium subscription has been restored.');
      } else {
        Alert.alert(
          'No active subscription found',
          'We could not find an active subscription linked to this account.',
        );
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  /** Called on app launch — sync subscription state from Firestore */
  const syncFromFirestore = async () => {
    if (!user) return;
    try {
      const data = await fetchSubscription(user.id);
      if (data && isSubscriptionActive(data.expiresAt)) {
        activate(data.expiresAt, data.provider);
      } else {
        dispatch(setSubscriptionFree());
        dispatch(setSubscription({ status: 'expired', plan: null, expiresAt: null, provider: null }));
      }
    } catch {
      // Fail silently — no internet
    }
  };

  return { buy, restore, syncFromFirestore, buying, restoring, subState };
}
