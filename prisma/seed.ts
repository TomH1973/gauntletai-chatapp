import { PrismaClient, SystemRole, ParticipantRole, MessageStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      systemRole: SystemRole.MEMBER,
      clerkId: 'user_alice',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      systemRole: SystemRole.MEMBER,
      clerkId: 'user_bob',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
    }
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      name: 'Carol Williams',
      systemRole: SystemRole.MEMBER,
      clerkId: 'user_carol',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol'
    }
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave@example.com',
      name: 'Dave Brown',
      systemRole: SystemRole.MEMBER,
      clerkId: 'user_dave',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave'
    }
  });

  // Create threads
  const apiThread = await prisma.thread.create({
    data: {
      name: 'API Endpoints Discussion',
      participants: {
        create: [
          { userId: alice.id, role: ParticipantRole.OWNER },
          { userId: bob.id, role: ParticipantRole.MEMBER },
          { userId: carol.id, role: ParticipantRole.MEMBER }
        ]
      }
    }
  });

  // Add messages to API thread
  await prisma.message.create({
    data: {
      content: 'What authentication method should we use for the API endpoints?',
      threadId: apiThread.id,
      userId: alice.id,
      status: MessageStatus.SENT
    }
  });

  await prisma.message.create({
    data: {
      content: 'I suggest we use JWT tokens with short expiration times.',
      threadId: apiThread.id,
      userId: bob.id,
      status: MessageStatus.SENT
    }
  });

  await prisma.message.create({
    data: {
      content: 'Good idea. We should also implement refresh tokens and rate limiting.',
      threadId: apiThread.id,
      userId: carol.id,
      status: MessageStatus.SENT
    }
  });

  // Create project timeline thread
  const timelineThread = await prisma.thread.create({
    data: {
      name: 'Project Timeline',
      participants: {
        create: [
          { userId: dave.id, role: ParticipantRole.OWNER },
          { userId: alice.id, role: ParticipantRole.MEMBER },
          { userId: bob.id, role: ParticipantRole.MEMBER }
        ]
      }
    }
  });

  // Add messages to timeline thread
  await prisma.message.create({
    data: {
      content: 'Here\'s the proposed timeline for the next phase.',
      threadId: timelineThread.id,
      userId: dave.id,
      status: MessageStatus.SENT
    }
  });

  await prisma.message.create({
    data: {
      content: 'The backend tasks look good, but we might need more time for testing.',
      threadId: timelineThread.id,
      userId: alice.id,
      status: MessageStatus.SENT
    }
  });

  await prisma.message.create({
    data: {
      content: 'Agreed. Let\'s add an extra week for QA and security testing.',
      threadId: timelineThread.id,
      userId: bob.id,
      status: MessageStatus.SENT
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 