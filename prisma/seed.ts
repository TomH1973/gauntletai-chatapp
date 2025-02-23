import { PrismaClient, User, Thread, Message, MessageStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create test users
    const users: User[] = [];
    for (let i = 0; i < 20; i++) {
      const user = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          image: faker.image.avatar(),
          isActive: true,
          lastSeen: new Date(),
        }
      });
      users.push(user);
    }
    console.log('Created test users');

    // Create test threads
    const threads: Thread[] = [];
    for (let i = 0; i < 5; i++) {
      const thread = await prisma.thread.create({
        data: {
          name: faker.lorem.words(3),
          title: faker.lorem.sentence(),
          lastMessageAt: new Date(),
          participants: {
            create: users.slice(0, 5).map(user => ({
              userId: user.id,
            }))
          },
          settings: {
            create: {
              isPrivate: false,
              allowReactions: true,
              allowReplies: true,
              allowAttachments: true,
              updatedBy: users[0].id
            }
          }
        }
      });
      threads.push(thread);

      // Add 50 messages to each thread
      for (let j = 0; j < 50; j++) {
        const message = await prisma.message.create({
          data: {
            content: faker.lorem.paragraph(),
            threadId: thread.id,
            userId: users[Math.floor(Math.random() * users.length)].id,
            status: MessageStatus.SENT,
            messageReactions: {
              create: {
                emoji: ['👍', '❤️', '😂', '😮', '😢', '😡'][Math.floor(Math.random() * 6)],
                users: [users[Math.floor(Math.random() * users.length)].id],
                count: 1
              }
            }
          }
        });
      }
    }
    console.log('Created test threads with messages');

    // Create a specific thread for load testing
    const loadTestThread = await prisma.thread.create({
      data: {
        name: 'load-test-thread',
        title: 'Thread for Load Testing',
        lastMessageAt: new Date(),
        participants: {
          create: users.map(user => ({
            userId: user.id,
          }))
        },
        settings: {
          create: {
            isPrivate: false,
            allowReactions: true,
            allowReplies: true,
            allowAttachments: true,
            updatedBy: users[0].id
          }
        }
      }
    });

    // Add 20 initial messages to load test thread
    for (let i = 0; i < 20; i++) {
      await prisma.message.create({
        data: {
          content: faker.lorem.paragraph(),
          threadId: loadTestThread.id,
          userId: users[Math.floor(Math.random() * users.length)].id,
          status: MessageStatus.SENT
        }
      });
    }
    console.log('Created load test thread');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 