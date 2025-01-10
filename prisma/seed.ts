import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
    },
  });

  // Create threads with participants
  const aliceBobThread = await prisma.thread.create({
    data: {
      participants: {
        create: [
          {
            user: { connect: { id: alice.id } },
            role: 'member',
          },
          {
            user: { connect: { id: bob.id } },
            role: 'member',
          },
        ],
      },
    },
  });

  const aliceCharlieThread = await prisma.thread.create({
    data: {
      participants: {
        create: [
          {
            user: { connect: { id: alice.id } },
            role: 'member',
          },
          {
            user: { connect: { id: charlie.id } },
            role: 'member',
          },
        ],
      },
    },
  });

  // Create messages
  const threads = [aliceBobThread, aliceCharlieThread];
  const users = [alice, bob, charlie];

  for (const thread of threads) {
    for (const user of users) {
      const isParticipant = await prisma.thread.findFirst({
        where: {
          id: thread.id,
          participants: {
            some: {
              userId: user.id,
            },
          },
        },
      });

      if (isParticipant) {
        await prisma.message.create({
          data: {
            content: `Hello from ${user.email}!`,
            user: { connect: { id: user.id } },
            thread: { connect: { id: thread.id } },
            status: 'SENT',
          },
        });
      }
    }
  }

  console.log('Database has been seeded. 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 