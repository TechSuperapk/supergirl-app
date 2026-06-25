/**
 * subscriptionService.ts
 *
 * Handles purchase flow for:
 *  - Android  → Google Play Billing (react-native-iap)
 *  - iOS      → Apple In-App Purchase (react-native-iap)
 *  - Fallback → Razorpay (web checkout via Linking)
 *
 * NOTE: react-native-iap must be added to package.json and
 *       linked via expo-dev-client (bare workflow) or a custom
 *       Expo config plugin. Until then the RazorpayFallback
 *       flow works in Expo Go / managed builds.
 */
import { Platform, Alert, Linking } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// ── Constants ─────────────────────────────────────────────────────────────────
export const YEARLY_PRICE_INR = 999;
export const YEARLY_PRICE_DISPLAY = '₹999';
export const PRODUCT_ID_ANDROID = 'com.supergirl.premium.yearly';
export const PRODUCT_ID_IOS     = 'com.supergirl.premium.yearly';

export type SubscriptionProvider = 'ios_iap' | 'android_iap' | 'razorpay';

export interface PurchaseResult {
  success:    boolean;
  provider:   SubscriptionProvider;
  expiresAt:  string;
  receiptData?: string;
  error?:     string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function yearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/** Persist subscription record to Firestore */
async function persistSubscription(
  uid:        string,
  provider:   SubscriptionProvider,
  expiresAt:  string,
  receiptData?: string,
): Promise<void> {
  await setDoc(doc(db, 'subscriptions', uid), {
    userId:       uid,
    plan:         'yearly',
    status:       'active',
    provider,
    expiresAt,
    receiptData:  receiptData ?? null,
    updatedAt:    new Date().toISOString(),
  }, { merge: true });
}

/** Fetch existing subscription from Firestore */
export async function fetchSubscription(uid: string) {
  const snap = await getDoc(doc(db, 'subscriptions', uid));
  return snap.exists() ? snap.data() : null;
}

/** Check if subscription is still valid */
export function isSubscriptionActive(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

// ── Platform purchase flows ───────────────────────────────────────────────────

/**
 * Android: Google Play Billing
 * Requires react-native-iap installed + dev client build.
 * Stub provided — fill in when dev-client build is set up.
 */
async function purchaseAndroid(uid: string): Promise<PurchaseResult> {
  try {
    /*
     * Full implementation with react-native-iap:
     *
     * import * as RNIap from 'react-native-iap';
     * await RNIap.initConnection();
     * const products = await RNIap.getSubscriptions({ skus: [PRODUCT_ID_ANDROID] });
     * await RNIap.requestSubscription({ sku: PRODUCT_ID_ANDROID });
     * const purchases = await RNIap.getAvailablePurchases();
     * const receipt = purchases[0]?.transactionReceipt;
     * await RNIap.finishTransaction({ purchase: purchases[0] });
     * await RNIap.endConnection();
     */

    // TODO: swap stub for real IAP call above when dev-client build is ready
    const expiresAt = yearFromNow();
    await persistSubscription(uid, 'android_iap', expiresAt);

    return { success: true, provider: 'android_iap', expiresAt };
  } catch (err: any) {
    return { success: false, provider: 'android_iap', expiresAt: '', error: err?.message };
  }
}

/**
 * iOS: Apple In-App Purchase
 * Requires react-native-iap + dev client build.
 */
async function purchaseIOS(uid: string): Promise<PurchaseResult> {
  try {
    /*
     * Full implementation with react-native-iap:
     *
     * import * as RNIap from 'react-native-iap';
     * await RNIap.initConnection();
     * await RNIap.requestSubscription({ sku: PRODUCT_ID_IOS });
     * const purchases = await RNIap.getAvailablePurchases();
     * const receipt = purchases[0]?.transactionReceipt;
     * await RNIap.finishTransaction({ purchase: purchases[0] });
     * await RNIap.endConnection();
     */

    const expiresAt = yearFromNow();
    await persistSubscription(uid, 'ios_iap', expiresAt);

    return { success: true, provider: 'ios_iap', expiresAt };
  } catch (err: any) {
    return { success: false, provider: 'ios_iap', expiresAt: '', error: err?.message };
  }
}

/**
 * Razorpay web checkout via Linking (works in Expo Go / managed builds)
 * Replace RAZORPAY_KEY_ID with your live key.
 * On success, your backend webhook should call persistSubscription.
 *
 * For a native in-app flow use: razorpay-react-native package.
 */
const RAZORPAY_KEY_ID = 'rzp_live_REPLACE_WITH_YOUR_KEY';

async function purchaseRazorpay(uid: string, userPhone: string): Promise<PurchaseResult> {
  try {
    /*
     * Option A — Native Razorpay (when razorpay-react-native is installed):
     *
     * import RazorpayCheckout from 'razorpay-react-native';
     * const options = {
     *   key: RAZORPAY_KEY_ID,
     *   amount: YEARLY_PRICE_INR * 100,
     *   currency: 'INR',
     *   name: 'SuperGirl Premium',
     *   description: '1 Year Subscription',
     *   prefill: { contact: userPhone },
     * };
     * const data = await RazorpayCheckout.open(options);
     * // data.razorpay_payment_id, data.razorpay_subscription_id
     */

    // Fallback: open Razorpay payment link in browser
    // Replace with a real payment link generated from your backend
    const paymentUrl = `https://rzp.io/l/supergirl-premium?contact=${userPhone}&notes[userId]=${uid}`;
    const supported  = await Linking.canOpenURL(paymentUrl);
    if (supported) {
      await Linking.openURL(paymentUrl);
    } else {
      throw new Error('Cannot open payment link');
    }

    // In production: listen for webhook callback and activate subscription
    // For now, return optimistic success (replace with webhook-confirmed flow)
    const expiresAt = yearFromNow();
    await persistSubscription(uid, 'razorpay', expiresAt);

    return { success: true, provider: 'razorpay', expiresAt };
  } catch (err: any) {
    return { success: false, provider: 'razorpay', expiresAt: '', error: err?.message };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Main entry point — routes to the correct payment provider
 * based on platform. Call this from SubscriptionScreen.
 */
export async function purchasePremium(
  uid:       string,
  userPhone: string,
): Promise<PurchaseResult> {
  if (Platform.OS === 'android') {
    return purchaseAndroid(uid);
  } else if (Platform.OS === 'ios') {
    return purchaseIOS(uid);
  } else {
    return purchaseRazorpay(uid, userPhone);
  }
}

/**
 * Restore purchases (iOS) or re-validate (Android).
 * Call when user reinstalls or switches device.
 */
export async function restorePurchases(uid: string): Promise<PurchaseResult | null> {
  try {
    /*
     * react-native-iap:
     * const purchases = await RNIap.getAvailablePurchases();
     * if (purchases.length > 0) { validate + persist }
     */
    const existing = await fetchSubscription(uid);
    if (existing && isSubscriptionActive(existing.expiresAt)) {
      return {
        success:   true,
        provider:  existing.provider,
        expiresAt: existing.expiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}
