const Message = require('../models/Message');
const { handleAIResponse } = require('../services/ai');

const setupChatHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    socket.on('message', async (data) => {
      try {
        // Save user message
        const userMessage = new Message({
          text: data.text,
          userId: socket.user.userId,
          aiGenerated: false
        });
        await userMessage.save();
        await userMessage.populate('userId', 'username');

        // Broadcast to all clients
        io.emit('message', userMessage);

        // Generate and save AI response
        const aiResponse = await handleAIResponse(data.text);
        const aiMessage = new Message({
          text: aiResponse,
          userId: socket.user.userId, // We're using the same user ID for simplicity
          aiGenerated: true
        });
        await aiMessage.save();
        await aiMessage.populate('userId', 'username');

        // Broadcast AI response
        io.emit('message', aiMessage);
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Error processing message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = setupChatHandlers; 