import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  try {
    // Delete test messages
    await prisma.message.deleteMany({
      where: {
        thread: {
          name: 'Load Test Thread'
        }
      }
    });

    // Delete test threads
    await prisma.thread.deleteMany({
      where: {
        name: 'Load Test Thread'
      }
    });

    console.log('Test data cleaned up successfully');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupTestData(); 