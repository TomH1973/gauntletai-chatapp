import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const threadId = searchParams.get('threadId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Build search conditions
    const whereConditions: any = {
      content: {
        contains: query,
        mode: 'insensitive'
      }
    };

    // If threadId is provided, search only in that thread
    if (threadId) {
      whereConditions.threadId = threadId;
    } else {
      // Otherwise, search in threads where user is a participant
      whereConditions.thread = {
        participants: {
          some: {
            userId
          }
        }
      };
    }

    // Perform search with pagination
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profileImage: true
            }
          },
          thread: {
            select: {
              id: true,
              title: true
            }
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.message.count({
        where: whereConditions
      })
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
} 