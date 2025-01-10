import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error verifying webhook', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, created_at, updated_at, last_sign_in_at } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      return new NextResponse('No email found', { status: 400 });
    }

    try {
      await prisma.user.upsert({
        where: { clerkId: id },
        create: {
          clerkId: id,
          email: primaryEmail,
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || primaryEmail.split('@')[0],
          image: image_url || null,
          lastLoginAt: last_sign_in_at ? new Date(last_sign_in_at) : null,
          createdAt: created_at ? new Date(created_at) : new Date(),
          updatedAt: updated_at ? new Date(updated_at) : new Date(),
          isActive: true,
        },
        update: {
          email: primaryEmail,
          name: first_name && last_name ? `${first_name} ${last_name}` : undefined,
          image: image_url || null,
          lastLoginAt: last_sign_in_at ? new Date(last_sign_in_at) : undefined,
          updatedAt: updated_at ? new Date(updated_at) : new Date(),
        },
      });

      return NextResponse.json({ success: true, event: eventType });
    } catch (error) {
      console.error('Error upserting user:', error);
      return new NextResponse('Database error', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    try {
      await prisma.user.delete({
        where: { clerkId: evt.data.id }
      });

      return NextResponse.json({ success: true, event: eventType });
    } catch (error) {
      console.error('Error deleting user:', error);
      return new NextResponse('Database error', { status: 500 });
    }
  }

  return NextResponse.json({ success: true, event: eventType });
} 