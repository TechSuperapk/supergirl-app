/**
 * paymentController — Razorpay order creation + signature verification for
 * Club event ticket booking. JWT-protected (see paymentRoutes).
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { createOrder as rzpCreateOrder, verifySignature } from '../services/razorpayService';

const orderSchema = z.object({
  amount: z.number().positive(),          // rupees (server converts to paise)
  receipt: z.string().max(40).optional(),
});
const verifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

function parse<T>(schema: { safeParse: (v: unknown) => any }, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new AppError(422, r.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data as T;
}

// POST /api/payments/order  { amount, receipt? } → { orderId, amount, currency, keyId, testMode }
export async function createOrder(req: Request, res: Response) {
  const { amount, receipt } = parse<{ amount: number; receipt?: string }>(orderSchema, req.body);
  const paise = Math.round(amount * 100);

  // Test mode: no Razorpay keys configured → return a mock order (empty keyId).
  // The client recognises the empty keyId and simulates a successful payment,
  // so the whole booking flow can be exercised end-to-end without a Razorpay
  // account. Set RAZORPAY_KEY_ID/SECRET to switch to real payments.
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    res.json({ orderId: `order_test_${Date.now()}`, amount: paise, currency: 'INR', keyId: '', testMode: true });
    return;
  }

  const order = await rzpCreateOrder(paise, receipt ?? `rcpt_${Date.now()}`);
  res.json({
    orderId: order.id,
    amount: order.amount,        // paise — passed straight to the checkout
    currency: order.currency,
    keyId: env.razorpayKeyId,    // public key for the client checkout
    testMode: false,
  });
}

// POST /api/payments/verify  { orderId, paymentId, signature } → { verified }
export async function verify(req: Request, res: Response) {
  const { orderId, paymentId, signature } = parse<{ orderId: string; paymentId: string; signature: string }>(verifySchema, req.body);
  const ok = verifySignature(orderId, paymentId, signature);
  if (!ok) throw new AppError(400, 'Payment verification failed');
  res.json({ verified: true });
}
