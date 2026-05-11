import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_APP: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ── Explore / third-party APIs ──────────────────────────────────────────
  // Optional — Explore returns empty results when absent so dev still works.
  // Set both in production before enabling the Explore tab for real users.
  EVENTBRITE_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // Per-user feed rate limit (requests / hour). Default 30.
  EXPLORE_RATE_LIMIT: z.coerce.number().int().positive().default(30),

  // Radius for Google Places Nearby Search, in metres. Default 5 km.
  EXPLORE_RADIUS_METRES: z.coerce.number().int().positive().default(5000),
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
