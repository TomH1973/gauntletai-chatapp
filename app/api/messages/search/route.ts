import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const messageInclude = {
  user: {
    select: {
      id: true,
      name: true,
      image: true
    }
  },
  thread: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.MessageInclude;

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

    // Convert search query to tsquery format safely
    const searchTerms = query
      .replace(/[!@#$%^&*(),.?":{}|<>]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^a-zA-Z0-9]/g, ''));

    if (searchTerms.length === 0) {
      return NextResponse.json({ 
        messages: [],
        pagination: { total: 0, pages: 0, page, limit }
      });
    }

    const searchQuery = searchTerms.map(term => `${term}:*`).join(' & ');

    // Perform search with highlighting and ranking
    const [messages, total] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`
        SELECT 
          m.*,
          ts_rank_cd(to_tsvector('english', m.content), to_tsquery('english', ${searchQuery})) as rank,
          ts_headline('english', m.content, to_tsquery('english', ${searchQuery}), 
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
          ) as highlight
        FROM "Message" m
        JOIN "Thread" t ON m.thread_id = t.id
        JOIN "ThreadParticipant" tp ON t.id = tp.thread_id
        WHERE 
          tp.user_id = ${userId}
          ${threadId ? Prisma.sql`AND t.id = ${threadId}` : Prisma.sql``}
          AND to_tsvector('english', m.content) @@ to_tsquery('english', ${searchQuery})
        ORDER BY rank DESC, m.created_at DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `),
      prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(*)::int
        FROM "Message" m
        JOIN "Thread" t ON m.thread_id = t.id
        JOIN "ThreadParticipant" tp ON t.id = tp.thread_id
        WHERE 
          tp.user_id = ${userId}
          ${threadId ? Prisma.sql`AND t.id = ${threadId}` : Prisma.sql``}
          AND to_tsvector('english', m.content) @@ to_tsquery('english', ${searchQuery})
      `) as Promise<[{ count: number }]>
    ]);

    // Get related data for messages
    const messageIds = (messages as any[]).map(m => m.id);
    const relatedData = await prisma.message.findMany({
      where: { id: { in: messageIds } },
      include: messageInclude
    });

    // Merge highlighted results with related data
    const enrichedMessages = (messages as any[]).map(message => {
      const related = relatedData.find(r => r.id === message.id);
      return {
        ...related,
        rank: message.rank,
        highlight: message.highlight,
        content: message.content
      };
    });

    return NextResponse.json({
      messages: enrichedMessages,
      pagination: {
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit),
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