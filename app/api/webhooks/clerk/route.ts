import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  try {
    const { id } = evt.data;
    const eventType = evt.type;

    if (!id) {
      throw new Error('Missing user ID in webhook event');
    }

    switch (eventType) {
      case 'user.created':
        await prisma.user.create({
          data: {
            clerkId: id,
            email: evt.data.email_addresses[0]?.email_address || '',
            name: `${evt.data.first_name} ${evt.data.last_name}`.trim(),
            image: evt.data.image_url,
            systemRole: 'MEMBER'
          },
        });
        break;

      case 'user.updated':
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: evt.data.email_addresses[0]?.email_address,
            name: `${evt.data.first_name} ${evt.data.last_name}`.trim(),
            image: evt.data.image_url,
          },
        });
        break;

      case 'user.deleted':
        await prisma.user.delete({
          where: { clerkId: id },
        });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 