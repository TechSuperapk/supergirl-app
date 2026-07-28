import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? '*',

  mongoUri: required('MONGODB_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',

  // ── AWS SNS phone OTP (replaces Firebase phone auth) ──────────────────────
  awsRegion:      process.env.AWS_REGION ?? 'ap-south-1',
  snsSenderId:    process.env.SNS_SENDER_ID ?? '',      // DLT-approved 6-char header (e.g. SUPBAE)
  otpTtlMinutes:  parseInt(process.env.OTP_TTL_MINUTES ?? '5', 10),
  // India DLT (TRAI) — required to send SMS to Indian numbers in production.
  snsEntityId:    process.env.SNS_ENTITY_ID ?? '',      // Principal Entity ID from the DLT portal
  snsTemplateId:  process.env.SNS_TEMPLATE_ID ?? '',    // registered OTP template ID

  // ── MSG91 SMS (India) — DLT is handled inside MSG91, so this is the easy
  // path for Indian OTP. When MSG91_AUTHKEY is set, OTP texts go via MSG91
  // instead of AWS SNS.
  msg91AuthKey:    process.env.MSG91_AUTHKEY ?? '',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID ?? '',  // DLT-approved OTP flow/template id in MSG91
  msg91SenderId:   process.env.MSG91_SENDER_ID ?? '',    // 6-char header, e.g. SUPBAE (optional if in template)
  msg91OtpVar:     process.env.MSG91_OTP_VAR ?? 'otp',   // the variable name used in your MSG91 template

  // ── AWS S3 media storage (replaces Firebase Storage) ──────────────────────
  s3Bucket:        process.env.S3_BUCKET ?? '',
  // Optional CloudFront/base URL; if empty we build the standard S3 URL.
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',

  // ── AI Digital Wardrobe (Milestone 2) ─────────────────────────────────────
  // Kept server-side ONLY — never shipped to the RN client. All wardrobe AI /
  // weather calls go through this proxy so the keys can't be extracted.
  openaiApiKey:     process.env.OPENAI_API_KEY ?? '',
  openaiModel:      process.env.OPENAI_MODEL ?? 'gpt-4o',
  geminiApiKey:     process.env.GEMINI_API_KEY ?? '',        // optional fallback
  removeBgApiKey:   process.env.REMOVEBG_API_KEY ?? '',
  removeBgProvider: (process.env.REMOVEBG_PROVIDER ?? 'removebg') as 'removebg' | 'clipdrop',
  clipdropApiKey:   process.env.CLIPDROP_API_KEY ?? '',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',

  // Scheduled "Outfit of the Day" batch (00 06 * * * by default). Off unless enabled.
  ootdCronEnabled:  (process.env.OOTD_CRON_ENABLED ?? 'false') === 'true',
  ootdCronSchedule: process.env.OOTD_CRON_SCHEDULE ?? '0 6 * * *',

  // ── Razorpay (Club event ticket payments) ─────────────────────────────────
  // key_id is public (used by the checkout on the client); key_secret is
  // server-only and used to create orders + verify the payment signature.
  razorpayKeyId:     process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
};
