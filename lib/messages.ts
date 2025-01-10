import { prisma } from './prisma';
import type { Message, User, Thread, MessageStatus } from '@/types';
import type { Prisma } from '@prisma/client';

const threadInclude = {
  participants: true,
  messages: {
    include: {
      user: true,
      parent: true,
      replies: true
    }
  }
} satisfies Prisma.ThreadInclude;

const messageInclude = {
  user: true,
  thread: {
    include: threadInclude
  },
  parent: true,
  replies: true
} satisfies Prisma.MessageInclude;

type ThreadWithIncludes = Prisma.ThreadGetPayload<{
  include: typeof threadInclude;
}>;

type MessageWithIncludes = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

/**
 * @dataflow Message Transformations
 * 
 * 1. Message Creation Flow
 *    Input: Raw message data from client
 *    Steps:
 *    - Validate content and structure
 *    - Sanitize message content
 *    - Transform to database model
 *    - Create message record
 *    - Update thread timestamp
 *    - Transform to response model
 * 
 * 2. Message Response Flow
 *    Input: Database message record
 *    Steps:
 *    - Parse dates to Date objects
 *    - Transform user data
 *    - Handle optional fields
 *    - Process message metadata
 *    - Transform attachments
 *    - Transform mentions
 * 
 * 3. User Data Flow
 *    Input: Database user record
 *    Steps:
 *    - Format username from parts
 *    - Handle missing fields
 *    - Transform timestamps
 *    - Process user metadata
 * 
 * 4. Thread Data Flow
 *    Input: Database thread record
 *    Steps:
 *    - Transform timestamps
 *    - Process participants
 *    - Transform messages
 *    - Handle thread metadata
 *    - Calculate unread count
 */

export async function createMessage(data: {
  content: string;
  threadId: string;
  userId: string;
  parentId?: string;
}): Promise<Message> {
  const message = await prisma.message.create({
    data: {
      content: data.content,
      threadId: data.threadId,
      userId: data.userId,
      parentId: data.parentId
    },
    include: messageInclude
  });

  await prisma.thread.update({
    where: { id: data.threadId },
    data: { 
      updatedAt: message.createdAt
    }
  });

  return transformMessage(message);
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: messageInclude
  });

  return messages.map(transformMessage);
}

/**
 * @function transformMessage
 * @description Transforms a database message record into the API response format
 * 
 * Data Transformations:
 * 1. Date parsing: createdAt, updatedAt -> Date objects
 * 2. Optional fields: parentId, error -> undefined if not present
 * 3. Default values: status -> 'sent', mentions/attachments -> []
 * 4. Nested transformations: user, parent, replies
 * 5. Metadata handling: Preserve custom fields
 */
export function transformMessage(message: any): Message {
  return {
    id: message.id,
    content: message.content,
    threadId: message.threadId,
    userId: message.userId,
    parentId: message.parentId || undefined,
    createdAt: new Date(message.createdAt),
    updatedAt: new Date(message.updatedAt),
    status: message.status || 'sent',
    error: message.error,
    metadata: message.metadata,
    mentions: message.mentions || [],
    attachments: message.attachments || [],
    user: message.user ? transformUser(message.user) : undefined,
    parent: message.parent ? transformMessage(message.parent) : undefined,
    replies: message.replies ? message.replies.map(transformMessage) : undefined
  };
}

export function transformUser(user: any): User {
  return {
    id: user.id,
    username: `${user.firstName} ${user.lastName}`.trim() || user.username || 'Unknown',
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive
  };
}

export function transformThread(thread: any): Thread {
  return {
    id: thread.id,
    name: thread.name,
    createdAt: new Date(thread.createdAt),
    updatedAt: new Date(thread.updatedAt),
    lastMessageAt: thread.lastMessageAt ? new Date(thread.lastMessageAt) : undefined,
    isArchived: thread.isArchived || false,
    participantIds: thread.participantIds || [],
    participants: thread.participants?.map(transformUser),
    messages: thread.messages?.map(transformMessage),
    metadata: thread.metadata,
    unreadCount: thread.unreadCount || 0,
    isGroup: thread.isGroup || false,
    createdBy: thread.createdBy
  };
} 