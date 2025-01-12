import { PrismaClient, ParticipantRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      clerkId: 'user_mock_alice'
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      clerkId: 'user_mock_bob'
    }
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      name: 'Carol Williams',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
      clerkId: 'user_mock_carol'
    }
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave@example.com',
      name: 'Dave Brown',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave',
      clerkId: 'user_mock_dave'
    }
  });

  // Create API discussion thread
  const apiThread = await prisma.thread.create({
    data: {
      name: 'API Endpoints Discussion',
      participants: {
        create: [
          {
            userId: alice.id,
            role: ParticipantRole.OWNER
          },
          {
            userId: bob.id,
            role: ParticipantRole.MEMBER
          },
          {
            userId: carol.id,
            role: ParticipantRole.MEMBER
          }
        ]
      }
    }
  });

  // Create messages in API thread
  const question = await prisma.message.create({
    data: {
      content: 'What authentication method should we use for the API endpoints?',
      userId: alice.id,
      threadId: apiThread.id
    }
  });

  const answer1 = await prisma.message.create({
    data: {
      content: 'I suggest using JWT tokens with refresh token rotation for security.',
      userId: bob.id,
      threadId: apiThread.id,
      parentId: question.id
    }
  });

  const answer2 = await prisma.message.create({
    data: {
      content: 'Good idea. We should also implement rate limiting and request validation.',
      userId: carol.id,
      threadId: apiThread.id,
      parentId: question.id
    }
  });

  // Create project timeline thread
  const projectThread = await prisma.thread.create({
    data: {
      name: 'Project Timeline',
      participants: {
        create: [
          {
            userId: dave.id,
            role: ParticipantRole.OWNER
          },
          {
            userId: bob.id,
            role: ParticipantRole.MEMBER
          },
          {
            userId: carol.id,
            role: ParticipantRole.MEMBER
          }
        ]
      }
    }
  });

  // Create messages in project thread
  const projectKickoff = await prisma.message.create({
    data: {
      content: 'Here\'s our proposed timeline for the next quarter:',
      userId: dave.id,
      threadId: projectThread.id
    }
  });

  const timeline = await prisma.message.create({
    data: {
      content: '1. API Design & Documentation (2 weeks)\n2. Core Backend Implementation (4 weeks)\n3. Frontend Development (3 weeks)\n4. Testing & Bug Fixes (2 weeks)\n5. Deployment & Launch (1 week)',
      userId: dave.id,
      threadId: projectThread.id,
      parentId: projectKickoff.id
    }
  });

  const feedback = await prisma.message.create({
    data: {
      content: 'Looks good! We should add some buffer time for unexpected issues.',
      userId: bob.id,
      threadId: projectThread.id,
      parentId: projectKickoff.id
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