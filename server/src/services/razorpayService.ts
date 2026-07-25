/**
 * razorpayService — creates Razorpay orders and verifies payment signatures.
 * The key_secret lives ONLY here (server-side); the client never sees it.
 * Uses the Razorpay REST API directly (no SDK dependency) + Node crypto for
 * the HMAC signature check.
 */
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const BASE = 'https://api.razorpay.com/v1';

function assertConfigured() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError(503, 'Razorpay is not configured on the server');
  }
}

function authHeader(): string {
  const token = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
  return `Basic ${token}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;   // paise
  currency: string;
  receipt: string;
  status: string;
}

/** Creates an order. `amountPaise` must be an integer number of paise. */
export async function createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  assertConfigured();
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `Razorpay order failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<RazorpayOrder>;
}

/** Verifies the checkout callback: HMAC_SHA256(order_id|payment_id, secret). */
export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  assertConfigured();
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false; // length mismatch etc.
  }
}
