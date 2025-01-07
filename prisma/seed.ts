import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@test.com' },
      update: {},
      create: {
        email: 'alice@test.com',
        username: 'alice',
        passwordHash: await hashPassword('password123'),
        firstName: 'Alice',
        lastName: 'Test'
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@test.com' },
      update: {},
      create: {
        email: 'bob@test.com',
        username: 'bob',
        passwordHash: await hashPassword('password123'),
        firstName: 'Bob',
        lastName: 'Test'
      },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@test.com' },
      update: {},
      create: {
        email: 'charlie@test.com',
        username: 'charlie',
        passwordHash: await hashPassword('password123'),
        firstName: 'Charlie',
        lastName: 'Test'
      },
    }),
    prisma.user.upsert({
      where: { email: 'dave@test.com' },
      update: {},
      create: {
        email: 'dave@test.com',
        username: 'dave',
        passwordHash: await hashPassword('password123'),
        firstName: 'Dave',
        lastName: 'Test'
      },
    })
  ])

  // Create test threads with distinct participant combinations
  const threads = await Promise.all([
    // Alice and Bob
    prisma.thread.create({
      data: {
        title: 'Alice-Bob Chat',
        participants: {
          connect: [{ id: users[0].id }, { id: users[1].id }]
        }
      },
    }),
    // Alice and Charlie
    prisma.thread.create({
      data: {
        title: 'Alice-Charlie Chat',
        participants: {
          connect: [{ id: users[0].id }, { id: users[2].id }]
        }
      },
    }),
    // Bob and Dave
    prisma.thread.create({
      data: {
        title: 'Bob-Dave Chat',
        participants: {
          connect: [{ id: users[1].id }, { id: users[3].id }]
        }
      },
    })
  ])

  // Create test messages
  for (const thread of threads) {
    const threadParticipants = await prisma.thread.findUnique({
      where: { id: thread.id },
      include: { participants: true }
    });
    
    if (!threadParticipants) continue;
    
    await prisma.message.createMany({
      data: threadParticipants.participants.map(user => ({
        content: `Message from ${user.username} in ${thread.title}`,
        userId: user.id,
        threadId: thread.id,
      }))
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 