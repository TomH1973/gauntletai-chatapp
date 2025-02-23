import { NextApiRequest, NextApiResponse } from 'next';
import { rateLimiter } from '@/lib/security/rateLimiter';
import { validateAuth } from '@/lib/auth/index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = await validateAuth();
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }

    const result = await rateLimiter.checkLimit(userId, action);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('Rate limit check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 