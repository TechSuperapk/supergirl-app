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

  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '',

  // ── AWS SNS phone OTP (replaces Firebase phone auth) ──────────────────────
  awsRegion:      process.env.AWS_REGION ?? 'ap-south-1',
  snsSenderId:    process.env.SNS_SENDER_ID ?? '',      // optional, where supported
  otpTtlMinutes:  parseInt(process.env.OTP_TTL_MINUTES ?? '5', 10),

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
