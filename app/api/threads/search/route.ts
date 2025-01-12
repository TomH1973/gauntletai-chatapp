import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '@/lib/api';

export const GET = withAuth(async (req, user: AuthenticatedUser) => {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const whereConditions = {
    participants: {
      some: {
        userId: user.id,
        leftAt: null
      }
    }
  } satisfies Prisma.ThreadWhereInput;

  if (query) {
    (whereConditions as any).OR = [
      {
        title: {
          contains: query,
          mode: 'insensitive'
        }
      },
      {
        messages: {
          some: {
            content: {
              contains: query,
              mode: 'insensitive'
            }
          }
        }
      }
    ];
  }

  // Get threads with pagination
  const threads = await prisma.thread.findMany({
    where: whereConditions,
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    skip,
    take: limit
  });

  // Get total count for pagination
  const total = await prisma.thread.count({
    where: whereConditions
  });

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: threads,
    page,
    limit,
    total,
    totalPages
  });
}); 