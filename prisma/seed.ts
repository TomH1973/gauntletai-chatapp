import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.$transaction([
    prisma.messageReaction.deleteMany(),
    prisma.messageEdit.deleteMany(),
    prisma.message.deleteMany(),
    prisma.threadParticipant.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        profileImage: 'https://api.dicebear.com/7.x/avatars/svg?seed=admin',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mod@example.com',
        username: 'moderator',
        firstName: 'Moderator',
        lastName: 'User',
        role: 'MODERATOR',
        profileImage: 'https://api.dicebear.com/7.x/avatars/svg?seed=mod',
      },
    }),
    prisma.user.create({
      data: {
        email: 'user1@example.com',
        username: 'user1',
        firstName: 'Test',
        lastName: 'User1',
        role: 'USER',
        profileImage: 'https://api.dicebear.com/7.x/avatars/svg?seed=user1',
      },
    }),
    prisma.user.create({
      data: {
        email: 'user2@example.com',
        username: 'user2',
        firstName: 'Test',
        lastName: 'User2',
        role: 'USER',
        profileImage: 'https://api.dicebear.com/7.x/avatars/svg?seed=user2',
      },
    }),
  ]);

  // Create test threads
  const threads = await Promise.all([
    prisma.thread.create({
      data: {
        title: 'Welcome Thread',
        participants: {
          create: users.map((user, index) => ({
            userId: user.id,
            role: index === 0 ? 'OWNER' : 'MEMBER',
          })),
        },
      },
    }),
    prisma.thread.create({
      data: {
        title: 'Development Discussion',
        participants: {
          create: [
            { userId: users[0].id, role: 'OWNER' },
            { userId: users[1].id, role: 'ADMIN' },
            { userId: users[2].id, role: 'MEMBER' },
          ],
        },
      },
    }),
  ]);

  // Create test messages
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        content: 'Welcome to the chat application! 👋',
        userId: users[0].id,
        threadId: threads[0].id,
        status: 'DELIVERED',
      },
    }),
    prisma.message.create({
      data: {
        content: 'Thanks for having me here!',
        userId: users[2].id,
        threadId: threads[0].id,
        status: 'DELIVERED',
      },
    }),
    prisma.message.create({
      data: {
        content: 'Let\'s discuss the new features',
        userId: users[0].id,
        threadId: threads[1].id,
        status: 'DELIVERED',
      },
    }),
  ]);

  // Add some reactions
  await Promise.all([
    prisma.messageReaction.create({
      data: {
        messageId: messages[0].id,
        userId: users[1].id,
        emoji: '👍',
      },
    }),
    prisma.messageReaction.create({
      data: {
        messageId: messages[0].id,
        userId: users[2].id,
        emoji: '❤️',
      },
    }),
  ]);

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 