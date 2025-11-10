const { Server } = require('socket.io');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    // Join user room for private messages
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join global chat
    socket.on('join-global-chat', () => {
      socket.join('global-chat');
      console.log(`User ${socket.id} joined global chat`);
    });

    // Leave global chat
    socket.on('leave-global-chat', () => {
      socket.leave('global-chat');
      console.log(`User ${socket.id} left global chat`);
    });

    // Send private message
    socket.on('send-private-message', (data) => {
      const { toUserId, message, fromUserId } = data;
      io.to(`user-${toUserId}`).emit('receive-private-message', {
        fromUserId,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Send global message
    socket.on('send-global-message', (data) => {
      const { userId, username, message } = data;
      io.to('global-chat').emit('receive-global-message', {
        userId,
        username,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.IO initialized');
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };

