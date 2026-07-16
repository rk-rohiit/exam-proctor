const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('admin:join', (examId) => {
      socket.join(`admin:${examId}`);
    });

    socket.on('student:join', ({ attemptId, studentId }) => {
      socket.join(`session:${attemptId}`);
      socket.join(`student:${studentId}`);
    });

    socket.on('violation:report', (data) => {
      io.to(`admin:${data.examId}`).emit('violation:received', data);
    });

    socket.on('student:heartbeat', (data) => {
      io.to(`admin:${data.examId}`).emit('student:status', {
        studentId: data.studentId,
        attemptId: data.attemptId,
        status: 'online',
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

const emitViolationAlert = (examId, alertData) => {
  if (io) io.to(`admin:${examId}`).emit('violation:received', alertData);
};

const emitExamTerminated = (attemptId, reason) => {
  if (io) io.to(`session:${attemptId}`).emit('exam:terminated', { reason, timestamp: Date.now() });
};

module.exports = { initSocket, getIO, emitViolationAlert, emitExamTerminated };
