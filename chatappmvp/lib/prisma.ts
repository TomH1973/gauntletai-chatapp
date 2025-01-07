import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Attempt to connect to the database
prisma.$connect()
  .then(() => console.log('Connected to the database successfully'))
  .catch((error: Error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  })

