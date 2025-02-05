import { rest, RestRequest, RestContext } from 'msw';
import { mockUsers, MockUser } from '../fixtures/users';
import { mockThreads, MockThread } from '../fixtures/threads';
import { mockMessages, MockMessage } from '../fixtures/messages';

export const handlers = [
  // Auth handlers
  rest.get('/api/auth/user', (_req: RestRequest, res: any, ctx: RestContext) => {
    return res(ctx.status(200), ctx.json(mockUsers[0]));
  }),

  // User handlers
  rest.get('/api/users/search', (req: RestRequest, res: any, ctx: RestContext) => {
    const query = req.url.searchParams.get('q') || '';
    const filteredUsers = mockUsers.filter((user: MockUser) => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
    return res(ctx.status(200), ctx.json(filteredUsers));
  }),

  // Thread handlers
  rest.get('/api/threads', (_req: RestRequest, res: any, ctx: RestContext) => {
    return res(ctx.status(200), ctx.json(mockThreads));
  }),

  rest.post('/api/threads', async (req: RestRequest, res: any, ctx: RestContext) => {
    const body = await req.json();
    const newThread: MockThread = {
      id: 'new-thread-id',
      title: body.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [mockUsers[0]],
    };
    return res(ctx.status(201), ctx.json(newThread));
  }),

  // Message handlers
  rest.get('/api/messages', (req: RestRequest, res: any, ctx: RestContext) => {
    const threadId = req.url.searchParams.get('threadId');
    const filteredMessages = mockMessages.filter((msg: MockMessage) => msg.threadId === threadId);
    return res(ctx.status(200), ctx.json(filteredMessages));
  }),

  rest.post('/api/messages', async (req: RestRequest, res: any, ctx: RestContext) => {
    const body = await req.json();
    const newMessage: MockMessage = {
      id: 'new-message-id',
      content: body.content,
      threadId: body.threadId,
      userId: mockUsers[0].id,
      user: mockUsers[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return res(ctx.status(201), ctx.json(newMessage));
  }),

  // Reaction handlers
  rest.post('/api/messages/:messageId/reactions', async (req: RestRequest, res: any, ctx: RestContext) => {
    const body = await req.json();
    const newReaction = {
      id: 'new-reaction-id',
      emoji: body.emoji,
      messageId: req.params.messageId,
      userId: mockUsers[0].id,
      user: mockUsers[0],
      createdAt: new Date().toISOString(),
    };
    return res(ctx.status(201), ctx.json(newReaction));
  }),
]; 