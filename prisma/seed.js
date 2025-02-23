import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create test users
  const user1 = await prisma.user.create({
    data: {
      name: 'Test User 1',
      email: 'test1@example.com',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Test User 2',
      email: 'test2@example.com',
    },
  });

  // Create a test thread
  const thread = await prisma.thread.create({
    data: {
      name: 'Test Thread',
      participants: {
        create: [
          {
            userId: user1.id,
          },
          {
            userId: user2.id,
          },
        ],
      },
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
