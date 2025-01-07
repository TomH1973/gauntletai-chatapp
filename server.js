const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Client joined room: ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`Client left room: ${roomId}`);
  });

  socket.on('send_message', (message) => {
    console.log('Broadcasting message to room:', message.threadId);
    io.to(message.threadId).emit('new_message', message);
  });

  socket.on('update_message', ({ messageId, content, threadId }) => {
    io.to(threadId).emit('message_updated', messageId, content);
  });

  socket.on('delete_message', ({ messageId, threadId }) => {
    io.to(threadId).emit('message_deleted', messageId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 