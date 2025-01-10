import { SocketErrorCode } from '@/types';
import type {
  Message,
  Thread,
  ThreadParticipant,
  MessageEdit,
  MessageReaction,
  MessageAttachment,
  SocketError
} from '@/types';

interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: SocketError;
}

// Message Validation
export function validateNewMessage(data: Partial<Message>): ValidationResult<Message> {
  if (!data.content?.trim()) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Message content is required'
      }
    };
  }

  if (!data.threadId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Thread ID is required'
      }
    };
  }

  if (!data.userId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'User ID is required'
      }
    };
  }

  return { isValid: true, data: data as Message };
}

// Thread Update Validation
export function validateThreadUpdate(data: Partial<Thread>): ValidationResult<Thread> {
  if (!data.id) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Thread ID is required'
      }
    };
  }

  if (data.title !== undefined && !data.title.trim()) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Thread title cannot be empty'
      }
    };
  }

  if (data.participants && !Array.isArray(data.participants)) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Participants must be an array'
      }
    };
  }

  return { isValid: true, data: data as Thread };
}

// Message Edit Validation
export function validateMessageEdit(data: Partial<MessageEdit>): ValidationResult<MessageEdit> {
  if (!data.messageId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Message ID is required'
      }
    };
  }

  if (!data.content?.trim()) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Edit content is required'
      }
    };
  }

  if (!data.editedBy) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Editor ID is required'
      }
    };
  }

  return { isValid: true, data: data as MessageEdit };
}

// Message Reaction Validation
export function validateMessageReaction(data: Partial<MessageReaction>): ValidationResult<MessageReaction> {
  if (!data.messageId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Message ID is required'
      }
    };
  }

  if (!data.emoji?.trim()) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Emoji is required'
      }
    };
  }

  if (!data.userId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'User ID is required'
      }
    };
  }

  return { isValid: true, data: data as MessageReaction };
}

// Attachment Validation
export function validateMessageAttachment(data: Partial<MessageAttachment>): ValidationResult<MessageAttachment> {
  if (!data.messageId) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Message ID is required'
      }
    };
  }

  if (!data.url?.trim()) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Attachment URL is required'
      }
    };
  }

  if (!data.type || !['image', 'video', 'audio', 'document'].includes(data.type)) {
    return {
      isValid: false,
      error: {
        code: SocketErrorCode.INVALID_REQUEST,
        message: 'Invalid attachment type'
      }
    };
  }

  return { isValid: true, data: data as MessageAttachment };
} 