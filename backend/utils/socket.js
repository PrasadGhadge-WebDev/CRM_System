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

    // Join room based on Company ID
    socket.on('joinCompany', (companyId) => {
      if (companyId) {
        socket.join(String(companyId));
        logger.info(`🏭 Socket ${socket.id} joined company room: ${companyId}`);
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
  }
};

const broadcastToCompany = (companyId, event, data) => {
  if (io && companyId) {
    io.to(String(companyId)).emit(event, data);
  }
};

module.exports = { init, getIO, sendToUser, broadcastToCompany };
