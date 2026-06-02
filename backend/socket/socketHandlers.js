const jwt = require('jsonwebtoken');
// PostgreSQL removed, using Mongoose models
const Attendance = require('../models/Attendance');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');

const onlineUsers = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId}`);

    // Join personal room
    socket.join(`user_${socket.userId}`);
    onlineUsers.set(socket.userId, { socketId: socket.id, connectedAt: new Date() });

    // Broadcast online status
    io.emit('user_online', { userId: socket.userId, onlineUsers: Array.from(onlineUsers.keys()) });

    // Handle idle time updates
    socket.on('idle_update', async (data) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await Attendance.findOneAndUpdate(
          { user_id: socket.userId, date: { $gte: today, $lt: tomorrow } },
          { $set: { idle_time: data.idleMinutes / 60 } }
        );
      } catch (err) {
        console.error('Idle update error:', err);
      }
    });

    // Handle activity ping (keep-alive)
    socket.on('activity_ping', () => {
      onlineUsers.set(socket.userId, { socketId: socket.id, lastActive: new Date() });
    });

    // Handle joining admin room
    if (socket.userRole === 'admin') {
      socket.join('admin_room');
    }

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', { userId: socket.userId, onlineUsers: Array.from(onlineUsers.keys()) });
      // Automatic logout has been removed as per user request
    });
  });

  // Scheduled notifications check (every 5 minutes)
  setInterval(async () => {
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

      const missedFollowups = await require('../models/FollowUp').find({
        status: 'pending',
        scheduled_at: { $lt: fifteenMinsAgo, $gt: twentyMinsAgo }
      }).populate('user_id lead_id');

      for (const followup of missedFollowups) {
        if (!followup.user_id || !followup.lead_id) continue;
        
        await Notification.create({
          user_id: followup.user_id._id,
          title: 'Missed Follow-up',
          message: `You missed a follow-up with ${followup.lead_id.name}`,
          type: 'warning'
        });
        
        io.to(`user_${followup.user_id._id}`).emit('new_notification', {
          type: 'warning',
          title: 'Missed Follow-up',
          message: `You missed a follow-up with ${followup.lead_id.name}`
        });
      }
    } catch (err) {
      console.error('Notification scheduler error:', err);
    }
  }, 5 * 60 * 1000);
};
