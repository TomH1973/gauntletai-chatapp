import {
  MessageStatus,
  ThreadRole
} from '@/types';

import type {
  Message,
  MessageEdit,
  MessageReaction,
  MessageAttachment,
  Thread,
  ThreadParticipant,
  User
} from '@/types';

export function isMessageEdit(obj: any): obj is MessageEdit {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.content === 'string' &&
    typeof obj.editedBy === 'string' &&
    typeof obj.messageId === 'string'
  );
}

export function isMessage(obj: any): obj is Message {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.content === 'string' &&
    typeof obj.threadId === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.status === 'string' &&
    Object.values(MessageStatus).includes(obj.status) &&
    typeof obj.isEdited === 'boolean' &&
    (!obj.error || typeof obj.error === 'string') &&
    (!obj.tempId || typeof obj.tempId === 'string') &&
    Array.isArray(obj.edits) &&
    Array.isArray(obj.reactions) &&
    Array.isArray(obj.attachments)
  );
}

export function isThreadParticipant(obj: any): obj is ThreadParticipant {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.userId === 'string' &&
    typeof obj.threadId === 'string' &&
    obj.joinedAt instanceof Date &&
    typeof obj.role === 'string' &&
    Object.values(ThreadRole).includes(obj.role) &&
    typeof obj.canInvite === 'boolean' &&
    typeof obj.canRemove === 'boolean' &&
    obj.lastReadAt instanceof Date &&
    typeof obj.isActive === 'boolean' &&
    obj.user && isUser(obj.user)
  );
}

export function isThread(obj: any): obj is Thread {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.title === 'string' &&
    obj.lastMessageAt instanceof Date &&
    Array.isArray(obj.participants) &&
    obj.participants.every(isThreadParticipant) &&
    Array.isArray(obj.messages) &&
    obj.messages.every(isMessage) &&
    typeof obj.createdBy === 'string' &&
    typeof obj.updatedBy === 'string' &&
    typeof obj.isArchived === 'boolean' &&
    typeof obj.metadata === 'object'
  );
}

export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj.id === 'string' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.email === 'string' &&
    typeof obj.username === 'string' &&
    (!obj.clerkId || typeof obj.clerkId === 'string') &&
    (!obj.firstName || typeof obj.firstName === 'string') &&
    (!obj.lastName || typeof obj.lastName === 'string') &&
    (!obj.profileImage || typeof obj.profileImage === 'string')
  );
}

export function ensureCompleteMessage(message: Partial<Message>): Message {
  if (!isMessage(message)) {
    throw new Error('Invalid message object');
  }
  return {
    ...message,
    edits: message.edits || [],
    reactions: message.reactions || [],
    attachments: message.attachments || []
  };
}

export function ensureCompleteThread(thread: Partial<Thread> & { id: string }): Thread {
  const base: Thread = {
    id: thread.id,
    createdAt: thread.createdAt || new Date(),
    updatedAt: thread.updatedAt || new Date(),
    title: thread.title || '',
    lastMessageAt: thread.lastMessageAt || new Date(),
    participants: thread.participants || [],
    messages: thread.messages || [],
    createdBy: thread.createdBy || '',
    updatedBy: thread.updatedBy || '',
    isArchived: thread.isArchived || false,
    metadata: thread.metadata || {}
  };

  if (!isThread(base)) {
    throw new Error('Invalid thread object');
  }
  return base;
} 