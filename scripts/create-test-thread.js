import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestThread() {
  try {
    const thread = await prisma.thread.create({
      data: {
        name: 'Load Test Thread',
        type: 'GROUP',
        createdBy: 'system',
        participants: {
          create: {
            userId: 'system',
            role: 'ADMIN'
          }
        }
      }
    });

    console.log(thread.id);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating test thread:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestThread(); 