import { PrismaClient, UserRole, ParticipantRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      role: UserRole.USER
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      role: UserRole.USER
    }
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      name: 'Carol Williams',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
      role: UserRole.USER
    }
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave@example.com',
      name: 'Dave Brown',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave',
      role: UserRole.USER
    }
  });

  // Create API discussion thread
  const apiThread = await prisma.thread.create({
    data: {
      name: 'API Endpoints Discussion',
      participants: {
        create: [
          { userId: alice.id, role: ParticipantRole.OWNER },
          { userId: bob.id, role: ParticipantRole.MEMBER }
        ]
      }
    }
  });

  // Add messages to API thread
  await prisma.message.create({
    data: {
      content: 'What authentication method should we use for the API endpoints?',
      userId: alice.id,
      threadId: apiThread.id,
      status: 'SENT'
    }
  });

  await prisma.message.create({
    data: {
      content: 'I suggest using JWT tokens with refresh token rotation.',
      userId: bob.id,
      threadId: apiThread.id,
      status: 'SENT'
    }
  });

  // Create Project Timeline thread
  const timelineThread = await prisma.thread.create({
    data: {
      name: 'Project Timeline',
      participants: {
        create: [
          { userId: carol.id, role: ParticipantRole.OWNER },
          { userId: dave.id, role: ParticipantRole.MEMBER }
        ]
      }
    }
  });

  // Add messages to Timeline thread
  await prisma.message.create({
    data: {
      content: 'Here\'s my proposed timeline for the project phases.',
      userId: carol.id,
      threadId: timelineThread.id,
      status: 'SENT'
    }
  });

  await prisma.message.create({
    data: {
      content: 'The timeline looks good, but we might need more time for testing.',
      userId: dave.id,
      threadId: timelineThread.id,
      status: 'SENT'
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
