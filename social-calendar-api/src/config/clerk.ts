import { createClerkClient, type ClerkClient } from '@clerk/backend';
import { env } from './env.js';

export const clerk: ClerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});
