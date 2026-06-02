import { Prisma } from '@prisma/client';

/**
 * The safe-to-leak-publicly subset of `User` fields embedded in every
 * repository's friend / member / recipient / organiser / suggester payload.
 *
 * Used across `events`, `friends`, `groups`, and `friendGroups` repositories
 * via `select: publicProfileSelect`. Anything outside this set — email,
 * phone, push tokens, raw timestamps, soft-delete flags, Clerk IDs — must
 * NOT leak through these embeds.
 *
 * Originally duplicated in each repository (Wave 1/2). Consolidated here
 * once a fourth domain (Friend Groups) repeated the same shape. New
 * domains should import from this module rather than redefining.
 *
 * `satisfies Prisma.UserSelect` (rather than a typed annotation) preserves
 * the literal `true` values so `typeof publicProfileSelect` works as a
 * type-level select in `Prisma.*GetPayload<{ include: ... }>` derivations.
 */
export const publicProfileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;
