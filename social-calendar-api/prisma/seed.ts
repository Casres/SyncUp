import { PrismaClient, EventOrganiserRole, InviteStatus } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_EVENT_ID = 'seed-event-1';

async function main() {
  const creator = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_creator' },
    update: {},
    create: {
      clerkId: 'seed_clerk_creator',
      username: 'alice',
      displayName: 'Alice Anderson',
    },
  });

  const invitee = await prisma.user.upsert({
    where: { clerkId: 'seed_clerk_invitee' },
    update: {},
    create: {
      clerkId: 'seed_clerk_invitee',
      username: 'bob',
      displayName: 'Bob Brown',
    },
  });

  await prisma.event.upsert({
    where: { id: SEED_EVENT_ID },
    update: {},
    create: {
      id: SEED_EVENT_ID,
      creatorId: creator.id,
      title: 'Coffee at the park',
      description: 'Bring a blanket.',
      location: 'Central Park, Bow Bridge',
      startsAt: new Date('2026-05-10T15:00:00.000Z'),
      endsAt: new Date('2026-05-10T17:00:00.000Z'),
      organisers: {
        create: { userId: creator.id, role: EventOrganiserRole.CREATOR },
      },
      invites: {
        create: { recipientId: invitee.id, status: InviteStatus.PENDING },
      },
    },
  });

  console.log(`Seed complete. Try: GET /events/${SEED_EVENT_ID}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
