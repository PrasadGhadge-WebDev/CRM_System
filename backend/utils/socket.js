const socketIO = require('socket.io');
const logger = require('./logger');

let io;

const init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 New socket connection: ${socket.id}`);

    // Join room based on User ID
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(String(userId));
        logger.info(`🏢 User ${userId} joined their personal room`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const sendToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(String(userId)).emit(event, data);
    logger.info(`📨 Real-time event "${event}" sent to user ${userId}`);
  }
};

module.exports = { init, getIO, sendToUser };
