import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purgeMessages() {
  try {
    // First delete all notifications since they reference messages
    await prisma.notification.deleteMany({});
    console.log('Deleted all notifications');

    // Then delete all messages
    await prisma.message.deleteMany({});
    console.log('Deleted all messages');

    console.log('Successfully purged all messages and related notifications');
  } catch (error) {
    console.error('Error purging messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

purgeMessages(); 