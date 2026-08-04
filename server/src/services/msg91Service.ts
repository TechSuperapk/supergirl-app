import { env } from '../config/env';

const MSG91_TIMEOUT_MS = 10_000;

// Sends the OTP via MSG91's Flow API (v5). MSG91 handles India DLT, so no
// AWS SNS registration is needed. Your MSG91 OTP template must contain one
// variable (its name goes in MSG91_OTP_VAR, default "otp").
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const mobiles = phone.replace(/^\+/, ''); // MSG91 wants country code, no "+"
  const varName = env.msg91OtpVar || 'otp';

  const recipient: Record<string, string> = { mobiles };
  recipient[varName] = code;

  const body: Record<string, any> = {
    template_id: env.msg91TemplateId,
    recipients: [recipient],
  };
  if (env.msg91SenderId) body.sender = env.msg91SenderId;

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: env.msg91AuthKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MSG91_TIMEOUT_MS),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.type === 'error') {
    throw new Error(`MSG91 send failed: ${json?.message ?? `HTTP ${res.status}`}`);
  }
}
