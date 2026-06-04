import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_APP: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  // ── Cloudinary — signed, server-mediated media uploads ───────────────────
  // Required at boot. Signing avatar uploads happens server-side; the client
  // never sees the API secret.
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ── Explore / third-party APIs ──────────────────────────────────────────
  // Optional — Explore returns empty results when absent so dev still works.
  // Set both in production before enabling the Explore tab for real users.
  EVENTBRITE_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // Per-user feed rate limit (requests / hour). Default 20 (spec: 20 req/hr).
  EXPLORE_RATE_LIMIT: z.coerce.number().int().positive().default(20),

  // Burst allowance inside the hourly window (requests / 60 s). Default 5.
  EXPLORE_RATE_LIMIT_BURST: z.coerce.number().int().positive().default(5),

  // Explore feed cache TTL (seconds). Default 600 (10 min) — matches mobile staleTime.
  EXPLORE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),

  // Radius for Google Places Nearby Search, in metres. Default 5 km.
  EXPLORE_RADIUS_METRES: z.coerce.number().int().positive().default(5000),

  // ── EXPLORE Phase C — Cron pre-warmer + GCP billing alerts ───────────────
  // Comma-separated city slugs to pre-warm every cron tick.
  EXPLORE_PREWARM_CITIES: z.string().default('nyc,sf,la,chi,sea,atx'),

  // Cron expression for the pre-warmer. Default: every 2 hours.
  // Must be ≤ EXPLORE_CACHE_TTL_SECONDS to keep the cache always warm.
  EXPLORE_PREWARM_CRON: z.string().default('0 */2 * * *'),

  // ── Messaging — event-chat archival sweep (R18 B6) ───────────────────────
  // Cron expression for the worker that sets `archivedAt` on one-time EVENT
  // conversations 48h after the event ends. Default: hourly.
  MESSAGING_ARCHIVE_CRON: z.string().default('0 * * * *'),

  // GCP project and billing account — optional in dev, required in production
  // for the Terraform billing-alert IaC to apply.
  GCP_PROJECT_ID: z.string().optional(),
  GCP_BILLING_ACCOUNT_ID: z.string().optional(),

  // Comma-separated billing alert thresholds in USD. Production MUST contain
  // exactly "25,50,100". Default matches the spec; do not change in prod.
  GCP_BILLING_ALERT_THRESHOLDS_USD: z.string().default('25,50,100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
