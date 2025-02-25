const prisma = require('../lib/prisma');
const { handleAIResponse } = require('../services/ai');

function setupChatHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username);

    socket.on('message', async (messageText) => {
      try {
        // Save and broadcast user message
        const message = await prisma.message.create({
          data: {
            text: messageText,
            userId: socket.user.id,
            isAI: false
          },
          include: {
            user: {
              select: { username: true }
            }
          }
        });
        io.emit('message', message);

        // Generate and save AI response
        const aiResponse = await handleAIResponse(messageText);
        if (aiResponse) {
          const aiMessage = await prisma.message.create({
            data: {
              text: aiResponse,
              userId: socket.user.id,
              isAI: true
            },
            include: {
              user: {
                select: { username: true }
              }
            }
          });
          io.emit('message', aiMessage);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Error processing message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.username);
    });
  });
}

module.exports = setupChatHandlers; 