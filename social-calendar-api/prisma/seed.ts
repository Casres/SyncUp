/**
 * ============================================================================
 *  SyncUp — Development Seed Data
 * ============================================================================
 *
 *  ⚠️  DELETE THIS FILE BEFORE PRODUCTION DEPLOY  ⚠️
 *
 *  This file populates the database with development-only fixture data.
 *  It must NEVER run against a production database.
 *
 *  Per LEAD_MANAGER.md Decision #4 (Seed Data Spec, locked 2026-05-02):
 *  - This file (prisma/seed.ts) MUST be removed before any production deploy.
 *  - The `prisma.seed` entry in package.json MUST be removed at the same time.
 *  - The DevOps Railway Deploy checklist (DEPLOY_CHECKLIST.md) gates on both.
 *
 *  How to identify seed rows for a manual purge:
 *      SELECT * FROM "Event"        WHERE id LIKE 'seed-%';
 *      SELECT * FROM "SocialGroup"  WHERE id LIKE 'seed-%';
 *      SELECT * FROM "User"         WHERE "clerkId" LIKE 'seed_clerk_%';
 *      ... (every seed row uses the 'seed-' / 'seed_clerk_' prefix.)
 *
 *  How to run (development only):
 *      cd social-calendar-api
 *      npx prisma db seed
 *
 *  Spec source of truth: LEAD_MANAGER.md → "Seed Data Spec (Decision #4)"
 * ============================================================================
 */

import {
  PrismaClient,
  FriendshipStatus,
  SocialGroupRole,
  EventOrganiserRole,
  EventExceptionType,
  InviteStatus,
  Recurrence,
} from '@prisma/client';

const prisma = new PrismaClient();

const NOW = new Date();
function daysFromNow(d: number, hours = 0): Date {
  const t = new Date(NOW);
  t.setDate(t.getDate() + d);
  t.setHours(hours, 0, 0, 0);
  return t;
}

// ─── 1. Users ────────────────────────────────────────────────────────────────

async function seedUsers(): Promise<Record<string, string>> {
  const alice = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_alice' },
    update: { displayName: 'Alice Anderson', username: 'alice', bio: 'Rooftop dinners and good company.' },
    create: {
      clerkId: 'seed_clerk_alice',
      username: 'alice',
      displayName: 'Alice Anderson',
      bio: 'Rooftop dinners and good company.',
    },
  });

  const bob = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_bob' },
    update: { displayName: 'Bob Brown', username: 'bob', bio: 'Always down for trivia night.' },
    create: {
      clerkId: 'seed_clerk_bob',
      username: 'bob',
      displayName: 'Bob Brown',
      bio: 'Always down for trivia night.',
    },
  });

  const carol = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_carol' },
    update: { displayName: 'Carol Chen', username: 'carol', bio: null },
    create: {
      clerkId: 'seed_clerk_carol',
      username: 'carol',
      displayName: 'Carol Chen',
    },
  });

  const dan = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_dan' },
    update: { displayName: 'Dan Davies', username: 'dan', bio: null },
    create: {
      clerkId: 'seed_clerk_dan',
      username: 'dan',
      displayName: 'Dan Davies',
    },
  });

  const eve = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_eve' },
    update: { displayName: 'Eve Edwards', username: 'eve', bio: 'Book club founder. Monthly meets.' },
    create: {
      clerkId: 'seed_clerk_eve',
      username: 'eve',
      displayName: 'Eve Edwards',
      bio: 'Book club founder. Monthly meets.',
    },
  });

  return {
    alice: alice.id,
    bob: bob.id,
    carol: carol.id,
    dan: dan.id,
    eve: eve.id,
  };
}

// ─── 2. Friendships + Labels ─────────────────────────────────────────────────

async function seedFriendships(userIds: Record<string, string>): Promise<void> {
  // Alice → Bob (ACCEPTED)
  await prisma.friendship.upsert({
    where: { id: 'friendship-alice-bob' },
    update: { status: FriendshipStatus.ACCEPTED },
    create: {
      id: 'friendship-alice-bob',
      initiatorId: userIds.alice,
      receiverId: userIds.bob,
      status: FriendshipStatus.ACCEPTED,
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-bob', ownerId: userIds.alice } },
    update: { label: 'BFF' },
    create: {
      id: 'label-alice-friendship-bob',
      friendshipId: 'friendship-alice-bob',
      ownerId: userIds.alice,
      label: 'BFF',
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-bob', ownerId: userIds.bob } },
    update: { label: 'friend' },
    create: {
      id: 'label-bob-friendship-alice',
      friendshipId: 'friendship-alice-bob',
      ownerId: userIds.bob,
      label: 'friend',
    },
  });

  // Alice → Carol (ACCEPTED)
  await prisma.friendship.upsert({
    where: { id: 'friendship-alice-carol' },
    update: { status: FriendshipStatus.ACCEPTED },
    create: {
      id: 'friendship-alice-carol',
      initiatorId: userIds.alice,
      receiverId: userIds.carol,
      status: FriendshipStatus.ACCEPTED,
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-carol', ownerId: userIds.alice } },
    update: { label: 'coworker' },
    create: {
      id: 'label-alice-friendship-carol',
      friendshipId: 'friendship-alice-carol',
      ownerId: userIds.alice,
      label: 'coworker',
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-carol', ownerId: userIds.carol } },
    update: { label: 'coworker' },
    create: {
      id: 'label-carol-friendship-alice',
      friendshipId: 'friendship-alice-carol',
      ownerId: userIds.carol,
      label: 'coworker',
    },
  });

  // Alice → Dan (ACCEPTED)
  await prisma.friendship.upsert({
    where: { id: 'friendship-alice-dan' },
    update: { status: FriendshipStatus.ACCEPTED },
    create: {
      id: 'friendship-alice-dan',
      initiatorId: userIds.alice,
      receiverId: userIds.dan,
      status: FriendshipStatus.ACCEPTED,
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-dan', ownerId: userIds.alice } },
    update: { label: 'family' },
    create: {
      id: 'label-alice-friendship-dan',
      friendshipId: 'friendship-alice-dan',
      ownerId: userIds.alice,
      label: 'family',
    },
  });
  await prisma.friendshipLabel.upsert({
    where: { friendshipId_ownerId: { friendshipId: 'friendship-alice-dan', ownerId: userIds.dan } },
    update: { label: 'family' },
    create: {
      id: 'label-dan-friendship-alice',
      friendshipId: 'friendship-alice-dan',
      ownerId: userIds.dan,
      label: 'family',
    },
  });

  // Eve → Alice (PENDING — no labels)
  await prisma.friendship.upsert({
    where: { id: 'friendship-eve-alice' },
    update: { status: FriendshipStatus.PENDING },
    create: {
      id: 'friendship-eve-alice',
      initiatorId: userIds.eve,
      receiverId: userIds.alice,
      status: FriendshipStatus.PENDING,
    },
  });
}

// ─── 3. AvailabilityBlock ────────────────────────────────────────────────────

async function seedAvailabilityBlocks(userIds: Record<string, string>): Promise<void> {
  await prisma.availabilityBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userIds.dan, blockedId: userIds.alice } },
    update: {},
    create: {
      id: 'block-dan-alice',
      blockerId: userIds.dan,
      blockedId: userIds.alice,
    },
  });
}

// ─── 4. SocialGroups + Members ───────────────────────────────────────────────

async function seedSocialGroups(userIds: Record<string, string>): Promise<void> {
  // Group 1: Weekend Crew — Alice is ADMIN
  await prisma.$transaction(async (tx) => {
    await tx.socialGroup.upsert({
      where: { id: 'seed-group-1' },
      update: { name: 'Weekend Crew', description: 'Whoever\'s free this weekend.' },
      create: {
        id: 'seed-group-1',
        name: 'Weekend Crew',
        description: 'Whoever\'s free this weekend.',
        avatarUrl: null,
      },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-1', userId: userIds.alice } },
      update: { role: SocialGroupRole.ADMIN },
      create: { id: 'seed-member-1-alice', socialGroupId: 'seed-group-1', userId: userIds.alice, role: SocialGroupRole.ADMIN },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-1', userId: userIds.bob } },
      update: { role: SocialGroupRole.MEMBER },
      create: { id: 'seed-member-1-bob', socialGroupId: 'seed-group-1', userId: userIds.bob, role: SocialGroupRole.MEMBER },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-1', userId: userIds.carol } },
      update: { role: SocialGroupRole.MEMBER },
      create: { id: 'seed-member-1-carol', socialGroupId: 'seed-group-1', userId: userIds.carol, role: SocialGroupRole.MEMBER },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-1', userId: userIds.dan } },
      update: { role: SocialGroupRole.MEMBER },
      create: { id: 'seed-member-1-dan', socialGroupId: 'seed-group-1', userId: userIds.dan, role: SocialGroupRole.MEMBER },
    });
  });

  // Group 2: Book Club — Eve is ADMIN, Alice is regular MEMBER
  await prisma.$transaction(async (tx) => {
    await tx.socialGroup.upsert({
      where: { id: 'seed-group-2' },
      update: { name: 'Book Club', description: 'Monthly meets — TBD on each book.' },
      create: {
        id: 'seed-group-2',
        name: 'Book Club',
        description: 'Monthly meets — TBD on each book.',
        avatarUrl: null,
      },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-2', userId: userIds.eve } },
      update: { role: SocialGroupRole.ADMIN },
      create: { id: 'seed-member-2-eve', socialGroupId: 'seed-group-2', userId: userIds.eve, role: SocialGroupRole.ADMIN },
    });
    await tx.socialGroupMember.upsert({
      where: { socialGroupId_userId: { socialGroupId: 'seed-group-2', userId: userIds.alice } },
      update: { role: SocialGroupRole.MEMBER },
      create: { id: 'seed-member-2-alice', socialGroupId: 'seed-group-2', userId: userIds.alice, role: SocialGroupRole.MEMBER },
    });
  });
}

// ─── 5. Events + Organisers + Invites + Exceptions ──────────────────────────

async function seedEvents(userIds: Record<string, string>): Promise<void> {
  // Event 1: Rooftop Dinner (upcoming — full RSVP spread)
  await prisma.$transaction(async (tx) => {
    await tx.event.upsert({
      where: { id: 'seed-event-upcoming' },
      update: {
        title: 'Rooftop Dinner',
        startsAt: daysFromNow(7, 19),
        endsAt: daysFromNow(7, 22),
        location: '5th Ave Rooftop',
        description: 'Bring a dish to share.',
      },
      create: {
        id: 'seed-event-upcoming',
        creatorId: userIds.alice,
        title: 'Rooftop Dinner',
        startsAt: daysFromNow(7, 19),
        endsAt: daysFromNow(7, 22),
        location: '5th Ave Rooftop',
        description: 'Bring a dish to share.',
        recurrence: Recurrence.NONE,
        allowSuggestionVoting: false,
      },
    });
    await tx.eventOrganiser.upsert({
      where: { eventId_userId: { eventId: 'seed-event-upcoming', userId: userIds.alice } },
      update: { role: EventOrganiserRole.CREATOR },
      create: {
        id: 'seed-org-upcoming-alice-creator',
        eventId: 'seed-event-upcoming',
        userId: userIds.alice,
        role: EventOrganiserRole.CREATOR,
      },
    });
  });

  // Invites for Event 1
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-upcoming', recipientId: userIds.bob } },
    update: { status: InviteStatus.ACCEPTED },
    create: { id: 'seed-invite-upcoming-bob', eventId: 'seed-event-upcoming', recipientId: userIds.bob, status: InviteStatus.ACCEPTED },
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-upcoming', recipientId: userIds.carol } },
    update: { status: InviteStatus.MAYBE },
    create: { id: 'seed-invite-upcoming-carol', eventId: 'seed-event-upcoming', recipientId: userIds.carol, status: InviteStatus.MAYBE },
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-upcoming', recipientId: userIds.dan } },
    update: { status: InviteStatus.DECLINED },
    create: { id: 'seed-invite-upcoming-dan', eventId: 'seed-event-upcoming', recipientId: userIds.dan, status: InviteStatus.DECLINED },
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-upcoming', recipientId: userIds.eve } },
    update: { status: InviteStatus.PENDING },
    create: { id: 'seed-invite-upcoming-eve', eventId: 'seed-event-upcoming', recipientId: userIds.eve, status: InviteStatus.PENDING },
  });

  // Event 2: Coffee Catchup (past)
  await prisma.$transaction(async (tx) => {
    await tx.event.upsert({
      where: { id: 'seed-event-past' },
      update: {
        title: 'Coffee Catchup',
        startsAt: daysFromNow(-7, 10),
        endsAt: daysFromNow(-7, 11),
        location: 'Bow Bridge, Central Park',
      },
      create: {
        id: 'seed-event-past',
        creatorId: userIds.alice,
        title: 'Coffee Catchup',
        startsAt: daysFromNow(-7, 10),
        endsAt: daysFromNow(-7, 11),
        location: 'Bow Bridge, Central Park',
        recurrence: Recurrence.NONE,
        allowSuggestionVoting: false,
      },
    });
    await tx.eventOrganiser.upsert({
      where: { eventId_userId: { eventId: 'seed-event-past', userId: userIds.alice } },
      update: { role: EventOrganiserRole.CREATOR },
      create: {
        id: 'seed-org-past-alice-creator',
        eventId: 'seed-event-past',
        userId: userIds.alice,
        role: EventOrganiserRole.CREATOR,
      },
    });
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-past', recipientId: userIds.bob } },
    update: { status: InviteStatus.ACCEPTED },
    create: { id: 'seed-invite-past-bob', eventId: 'seed-event-past', recipientId: userIds.bob, status: InviteStatus.ACCEPTED },
  });

  // Event 3: Weekly Standup (recurring — created by Eve)
  await prisma.$transaction(async (tx) => {
    await tx.event.upsert({
      where: { id: 'seed-event-recurring' },
      update: {
        title: 'Weekly Standup',
        startsAt: daysFromNow(-14, 9),
        endsAt: daysFromNow(-14, 10),
        location: 'Zoom',
        recurrence: Recurrence.WEEKLY,
      },
      create: {
        id: 'seed-event-recurring',
        creatorId: userIds.eve,
        title: 'Weekly Standup',
        startsAt: daysFromNow(-14, 9),
        endsAt: daysFromNow(-14, 10),
        location: 'Zoom',
        recurrence: Recurrence.WEEKLY,
        recurrenceRuleRaw: null,
        allowSuggestionVoting: false,
      },
    });
    await tx.eventOrganiser.upsert({
      where: { eventId_userId: { eventId: 'seed-event-recurring', userId: userIds.eve } },
      update: { role: EventOrganiserRole.CREATOR },
      create: {
        id: 'seed-org-recurring-eve-creator',
        eventId: 'seed-event-recurring',
        userId: userIds.eve,
        role: EventOrganiserRole.CREATOR,
      },
    });
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-recurring', recipientId: userIds.alice } },
    update: { status: InviteStatus.ACCEPTED },
    create: { id: 'seed-invite-recurring-alice', eventId: 'seed-event-recurring', recipientId: userIds.alice, status: InviteStatus.ACCEPTED },
  });

  // EventExceptions for recurring event
  await prisma.eventException.upsert({
    where: { eventId_originalDate: { eventId: 'seed-event-recurring', originalDate: daysFromNow(0, 9) } },
    update: { type: EventExceptionType.CANCELLED },
    create: {
      id: 'seed-exception-recurring-cancelled',
      eventId: 'seed-event-recurring',
      originalDate: daysFromNow(0, 9),
      type: EventExceptionType.CANCELLED,
      title: null,
      description: null,
      location: null,
      startsAt: null,
      endsAt: null,
    },
  });
  await prisma.eventException.upsert({
    where: { eventId_originalDate: { eventId: 'seed-event-recurring', originalDate: daysFromNow(7, 9) } },
    update: {
      type: EventExceptionType.RESCHEDULED,
      startsAt: daysFromNow(8, 14),
      endsAt: daysFromNow(8, 15),
      title: null,
      description: null,
      location: null,
    },
    create: {
      id: 'seed-exception-recurring-rescheduled',
      eventId: 'seed-event-recurring',
      originalDate: daysFromNow(7, 9),
      type: EventExceptionType.RESCHEDULED,
      startsAt: daysFromNow(8, 14),
      endsAt: daysFromNow(8, 15),
      title: null,
      description: null,
      location: null,
    },
  });

  // Event 4: Trivia Night (co-host — Bob is creator, Alice is CO_HOST)
  await prisma.$transaction(async (tx) => {
    await tx.event.upsert({
      where: { id: 'seed-event-cohost' },
      update: {
        title: 'Trivia Night',
        startsAt: daysFromNow(14, 20),
        endsAt: daysFromNow(14, 22),
        location: 'The Brass Tap',
      },
      create: {
        id: 'seed-event-cohost',
        creatorId: userIds.bob,
        title: 'Trivia Night',
        startsAt: daysFromNow(14, 20),
        endsAt: daysFromNow(14, 22),
        location: 'The Brass Tap',
        recurrence: Recurrence.NONE,
        allowSuggestionVoting: false,
      },
    });
    await tx.eventOrganiser.upsert({
      where: { eventId_userId: { eventId: 'seed-event-cohost', userId: userIds.bob } },
      update: { role: EventOrganiserRole.CREATOR },
      create: {
        id: 'seed-org-cohost-bob-creator',
        eventId: 'seed-event-cohost',
        userId: userIds.bob,
        role: EventOrganiserRole.CREATOR,
      },
    });
    await tx.eventOrganiser.upsert({
      where: { eventId_userId: { eventId: 'seed-event-cohost', userId: userIds.alice } },
      update: { role: EventOrganiserRole.CO_HOST },
      create: {
        id: 'seed-org-cohost-alice-cohost',
        eventId: 'seed-event-cohost',
        userId: userIds.alice,
        role: EventOrganiserRole.CO_HOST,
      },
    });
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-cohost', recipientId: userIds.carol } },
    update: { status: InviteStatus.PENDING },
    create: { id: 'seed-invite-cohost-carol', eventId: 'seed-event-cohost', recipientId: userIds.carol, status: InviteStatus.PENDING },
  });
  await prisma.eventInvite.upsert({
    where: { eventId_recipientId: { eventId: 'seed-event-cohost', recipientId: userIds.dan } },
    update: { status: InviteStatus.PENDING },
    create: { id: 'seed-invite-cohost-dan', eventId: 'seed-event-cohost', recipientId: userIds.dan, status: InviteStatus.PENDING },
  });
}

// ─── 6. GroupPoll + PollOption + PollVote ────────────────────────────────────

async function seedPolls(userIds: Record<string, string>): Promise<void> {
  await prisma.groupPoll.upsert({
    where: { id: 'seed-poll-closed' },
    update: {
      question: 'Where should we eat after?',
      closedAt: daysFromNow(-1),
    },
    create: {
      id: 'seed-poll-closed',
      socialGroupId: 'seed-group-1',
      eventId: 'seed-event-upcoming',
      createdById: userIds.alice,
      question: 'Where should we eat after?',
      closedAt: daysFromNow(-1),
    },
  });

  await prisma.pollOption.upsert({
    where: { id: 'seed-poll-closed-option-1' },
    update: { text: 'Pizza place on 6th', order: 0 },
    create: {
      id: 'seed-poll-closed-option-1',
      pollId: 'seed-poll-closed',
      text: 'Pizza place on 6th',
      order: 0,
    },
  });
  await prisma.pollOption.upsert({
    where: { id: 'seed-poll-closed-option-2' },
    update: { text: 'Taco truck', order: 1 },
    create: {
      id: 'seed-poll-closed-option-2',
      pollId: 'seed-poll-closed',
      text: 'Taco truck',
      order: 1,
    },
  });
  await prisma.pollOption.upsert({
    where: { id: 'seed-poll-closed-option-3' },
    update: { text: 'Skip food, more drinks', order: 2 },
    create: {
      id: 'seed-poll-closed-option-3',
      pollId: 'seed-poll-closed',
      text: 'Skip food, more drinks',
      order: 2,
    },
  });

  // Votes: Option 1 (Pizza) — Alice + Bob; Option 2 (Taco) — Carol; Option 3 (Skip) — Dan
  await prisma.pollVote.upsert({
    where: { pollOptionId_userId: { pollOptionId: 'seed-poll-closed-option-1', userId: userIds.alice } },
    update: {},
    create: { id: 'seed-vote-closed-pizza-alice', pollOptionId: 'seed-poll-closed-option-1', userId: userIds.alice },
  });
  await prisma.pollVote.upsert({
    where: { pollOptionId_userId: { pollOptionId: 'seed-poll-closed-option-1', userId: userIds.bob } },
    update: {},
    create: { id: 'seed-vote-closed-pizza-bob', pollOptionId: 'seed-poll-closed-option-1', userId: userIds.bob },
  });
  await prisma.pollVote.upsert({
    where: { pollOptionId_userId: { pollOptionId: 'seed-poll-closed-option-2', userId: userIds.carol } },
    update: {},
    create: { id: 'seed-vote-closed-taco-carol', pollOptionId: 'seed-poll-closed-option-2', userId: userIds.carol },
  });
  await prisma.pollVote.upsert({
    where: { pollOptionId_userId: { pollOptionId: 'seed-poll-closed-option-3', userId: userIds.dan } },
    update: {},
    create: { id: 'seed-vote-closed-skip-dan', pollOptionId: 'seed-poll-closed-option-3', userId: userIds.dan },
  });
}

// ─── 7. EventSuggestion ──────────────────────────────────────────────────────

async function seedSuggestions(userIds: Record<string, string>): Promise<void> {
  await prisma.eventSuggestion.upsert({
    where: { id: 'seed-suggestion-1' },
    update: {
      title: 'Move dinner to Friday?',
      description: 'Saturday is packed.',
      proposedDate: daysFromNow(6, 19),
    },
    create: {
      id: 'seed-suggestion-1',
      socialGroupId: 'seed-group-1',
      eventId: 'seed-event-upcoming',
      suggestedById: userIds.bob,
      title: 'Move dinner to Friday?',
      description: 'Saturday is packed.',
      proposedDate: daysFromNow(6, 19),
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 [seed] starting');
  const userIds = await seedUsers();
  await seedFriendships(userIds);
  await seedAvailabilityBlocks(userIds);
  await seedSocialGroups(userIds);
  await seedEvents(userIds);
  await seedPolls(userIds);
  await seedSuggestions(userIds);
  console.log('🌱 [seed] complete');
  console.log('   primary user: alice (clerkId=seed_clerk_alice)');
  console.log('   try: GET /events/seed-event-upcoming');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
