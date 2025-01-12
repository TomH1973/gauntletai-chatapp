import { PrismaClient } from '@prisma/client';
import { metrics } from '@/app/api/metrics/route';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        
        try {
          const result = await query(args);
          const duration = performance.now() - start;
          
          // Record query duration
          metrics.databaseQueryDuration.set(
            { operation },
            duration / 1000
          );
          
          return result;
        } catch (error) {
          const duration = performance.now() - start;
          
          // Record failed query duration
          metrics.databaseQueryDuration.set(
            { operation: `${operation}_error` },
            duration / 1000
          );
          
          throw error;
        }
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
} 