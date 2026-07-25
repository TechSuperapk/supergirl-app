/**
 * paymentService — client gateway to the Razorpay backend (order + verify).
 * Reuses the authed apiClient (session JWT). The order is created server-side
 * so the amount can't be tampered with; verification is server-side too.
 */
import { apiClient } from '../../../services/apiClient';

export interface RzpOrder {
  orderId: string;
  amount: number;    // paise
  currency: string;
  keyId: string;     // public Razorpay key for the checkout
}

/** Create an order for `amountRupees` (₹). */
export function createOrder(amountRupees: number, receipt?: string): Promise<RzpOrder> {
  return apiClient.post<RzpOrder>('/payments/order', { amount: amountRupees, receipt });
}

/** Verify the checkout callback. Throws if the signature is invalid. */
export function verifyPayment(p: { orderId: string; paymentId: string; signature: string }): Promise<{ verified: boolean }> {
  return apiClient.post<{ verified: boolean }>('/payments/verify', p);
}
