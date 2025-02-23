import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { redis } from '@/lib/redis';
import { metrics } from '@/lib/metrics';

const CACHE_TTL = 300; // 5 minutes
const CACHE_EARLY_EXPIRATION_PROBABILITY = 0.1; // 10% chance of early refresh
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

// Add cache key generation helper
function generateCacheKey(userId: string, threadId: string | null, query: string, page: number, limit: number): string {
  const searchTerms = query.trim().split(/\s+/).sort().join(' ');
  return `search:${userId}:${threadId || 'all'}:${searchTerms}:${page}:${limit}`;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
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
    const cacheKey = generateCacheKey(userId, threadId, searchQuery, page, limit);
    
    // Check cache with probabilistic early expiration
    const cached = await redis.get(cacheKey);
    if (cached) {
      metrics.searchCacheHits.inc();
      
      // Probabilistic early expiration to prevent thundering herd
      if (Math.random() < CACHE_EARLY_EXPIRATION_PROBABILITY) {
        // Refresh cache in background
        refreshCache(cacheKey, userId, threadId, searchQuery, page, limit).catch(console.error);
      }
      
      const duration = (Date.now() - startTime) / 1000;
      metrics.searchDuration.observe(duration);
      return NextResponse.json(JSON.parse(cached));
    }

    metrics.searchCacheMisses.inc();

    const results = await performSearch(userId, threadId, searchQuery, page, limit);
    
    // Cache results with slight jitter in TTL to prevent synchronized expiration
    const jitteredTTL = CACHE_TTL + Math.floor(Math.random() * 60);
    await redis.setex(cacheKey, jitteredTTL, JSON.stringify(results));

    const duration = (Date.now() - startTime) / 1000;
    metrics.searchDuration.observe(duration);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    metrics.searchErrors.inc();
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}

// Extract search logic to separate function
async function performSearch(userId: string, threadId: string | null, searchQuery: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  
  const [messages, total] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      WITH ranked_messages AS (
        SELECT 
          m.*,
          ts_rank_cd(message_search_vector, to_tsquery('english', ${searchQuery}), 32 /* normalization */) as rank,
          ts_headline('english', m.content, to_tsquery('english', ${searchQuery}), 
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
          ) as highlight
        FROM "Message" m
        JOIN "Thread" t ON m.thread_id = t.id
        JOIN "ThreadParticipant" tp ON t.id = tp.thread_id
        WHERE 
          tp.user_id = ${userId}
          ${threadId ? Prisma.sql`AND t.id = ${threadId}` : Prisma.sql``}
          AND message_search_vector @@ to_tsquery('english', ${searchQuery})
      )
      SELECT * FROM ranked_messages
      ORDER BY rank DESC, created_at DESC
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
        AND message_search_vector @@ to_tsquery('english', ${searchQuery})
    `) as Promise<[{ count: number }]>
  ]);

  const messageIds = (messages as any[]).map(m => m.id);
  const relatedData = await prisma.message.findMany({
    where: { id: { in: messageIds } },
    include: messageInclude
  });

  const enrichedMessages = (messages as any[]).map(message => {
    const related = relatedData.find(r => r.id === message.id);
    return {
      ...related,
      rank: message.rank,
      highlight: message.highlight,
      content: message.content
    };
  });

  return {
    messages: enrichedMessages,
    pagination: {
      total: total[0].count,
      pages: Math.ceil(total[0].count / limit),
      page,
      limit
    }
  };
}

// Background cache refresh function
async function refreshCache(cacheKey: string, userId: string, threadId: string | null, searchQuery: string, page: number, limit: number) {
  try {
    const results = await performSearch(userId, threadId, searchQuery, page, limit);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results));
  } catch (error) {
    console.error('Background cache refresh failed:', error);
  }
} 