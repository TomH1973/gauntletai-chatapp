export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export interface MessageInput {
  content: string;
  threadId: string;
  tempId?: string;
  attachments?: string[];
}

export interface Message {
  id: string;
  content: string;
  threadId: string;
  userId: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[];
}

export interface MessageEvent {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  threadId: string;
  tempId?: string;
  attachments?: string[];
} 