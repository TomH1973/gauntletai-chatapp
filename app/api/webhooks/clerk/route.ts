import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

interface WebhookEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      verification: { status: string };
    }>;
    username: string;
    first_name: string;
    last_name: string;
    image_url: string;
  };
  object: string;
  type: string;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const {
      id,
      email_addresses,
      username,
      first_name,
      last_name,
      image_url
    } = evt.data;

    const email = email_addresses[0]?.email_address;

    try {
      await prisma.user.upsert({
        where: { clerkId: id },
        create: {
          clerkId: id,
          email: email || '',
          username: username || email?.split('@')[0] || id,
          firstName: first_name || null,
          lastName: last_name || null,
          profileImage: image_url || null,
        },
        update: {
          email: email || undefined,
          username: username || undefined,
          firstName: first_name || null,
          lastName: last_name || null,
          profileImage: image_url || null,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error upserting user:', error);
      return new NextResponse('Error occured', {
        status: 500
      });
    }
  }

  if (eventType === 'user.deleted') {
    try {
      await prisma.user.update({
        where: { clerkId: evt.data.id },
        data: { isActive: false }
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deactivating user:', error);
      return new NextResponse('Error occured', {
        status: 500
      });
    }
  }

  return NextResponse.json({ success: true });
} 