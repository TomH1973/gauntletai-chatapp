import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define enums inline since they're not exported
const UserStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  AWAY: 'AWAY',
  DO_NOT_DISTURB: 'DO_NOT_DISTURB',
} as const

const ParticipantRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

const MessageType = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM',
  FILE: 'FILE',
} as const

const MessageStatus = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const

async function main() {
  // Clean up existing data
  await prisma.$transaction([
    prisma.messageRead.deleteMany(),
    prisma.message.deleteMany(),
    prisma.threadParticipant.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ])

  // Create test users
  const alice = await prisma.user.create({
    data: {
      clerkId: 'user_2NNEqL3CRJp7oc4y3YRBVyJ4FfX',  // Test Clerk ID
      email: 'alice@example.com',
      name: 'Alice Johnson',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      status: UserStatus.ONLINE,
      lastActiveAt: new Date(),
      lastSeenAt: new Date(),
    },
  })

  const bob = await prisma.user.create({
    data: {
      clerkId: 'user_2MMDqK2BQIo6nb3x2XQAUxI3EeW',  // Test Clerk ID
      email: 'bob@example.com',
      name: 'Bob Smith',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      status: UserStatus.ONLINE,
      lastActiveAt: new Date(),
      lastSeenAt: new Date(),
    },
  })

  // Create a direct message thread
  const dmThread = await prisma.thread.create({
    data: {
      name: 'Alice & Bob',
      isGroup: false,
      lastMessageAt: new Date(),
    },
  })

  // Add participants to DM thread
  await prisma.threadParticipant.create({
    data: {
      threadId: dmThread.id,
      userId: alice.id,
      role: ParticipantRole.OWNER,
    },
  })

  await prisma.threadParticipant.create({
    data: {
      threadId: dmThread.id,
      userId: bob.id,
      role: ParticipantRole.MEMBER,
    },
  })

  // Create some messages
  const message1 = await prisma.message.create({
    data: {
      threadId: dmThread.id,
      userId: alice.id,
      content: 'Hey Bob! How are you?',
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
    },
  })

  const message2 = await prisma.message.create({
    data: {
      threadId: dmThread.id,
      userId: bob.id,
      content: 'Hi Alice! I\'m doing great, thanks!',
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
    },
  })

  // Create read receipts
  await prisma.messageRead.create({
    data: {
      messageId: message1.id,
      userId: bob.id,
      readAt: new Date(),
    },
  })

  await prisma.messageRead.create({
    data: {
      messageId: message2.id,
      userId: alice.id,
      readAt: new Date(),
    },
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 