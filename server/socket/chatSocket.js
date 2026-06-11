const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const CallLog = require('../models/CallLog');

const onlineUsers = new Map();

function setupChatSocket(io) {
  io.onlineUsers = onlineUsers;
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await Employee.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    onlineUsers.set(userId, {
      userId,
      name: `${user.firstName} ${user.lastName}`,
      photo: user.photo,
      socketId: socket.id,
      onlineAt: new Date(),
    });

    socket.broadcast.emit('user_online', { userId, name: `${user.firstName} ${user.lastName}`, photo: user.photo });

    const rooms = await ChatRoom.find({
      participants: user._id,
      isActive: true,
    }).select('_id');

    rooms.forEach((room) => {
      socket.join(room._id.toString());
    });

    (async () => {
      const missed = await CallLog.find({ callee: user._id, status: 'missed' })
        .populate('caller', 'firstName lastName email role photo')
        .sort({ createdAt: -1 })
        .limit(20);
      if (missed.length > 0) {
        socket.emit('missed_calls', missed);
        await CallLog.updateMany(
          { callee: user._id, status: 'missed' },
          { $set: { status: 'missed' } }
        );
      }
    })();

    socket.on('join_room', async (roomId) => {
      socket.join(roomId);
      await Message.updateMany(
        { chatRoom: roomId, sender: { $ne: user._id }, 'deliveredTo.user': { $ne: user._id } },
        { $push: { deliveredTo: { user: user._id, deliveredAt: new Date() } } },
      );
    });

    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', {
        userId,
        name: `${user.firstName} ${user.lastName}`,
        photo: user.photo,
      });
    });

    socket.on('stop_typing', ({ roomId }) => {
      socket.to(roomId).emit('user_stop_typing', { userId });
    });

    socket.on('get_online_users', () => {
      const online = Array.from(onlineUsers.values()).map(u => u.userId);
      socket.emit('online_users', online);
    });

    socket.on('send_message', async (data, callback) => {
      try {
        const { roomId, content, messageType, replyTo } = data;
        const room = await ChatRoom.findOne({ _id: roomId, participants: user._id });
        if (!room) return callback?.({ error: 'Access denied' });

        const message = await Message.create({
          chatRoom: roomId,
          sender: user._id,
          content: content || '',
          messageType: messageType || 'text',
          replyTo: replyTo || null,
          readBy: [{ user: user._id }],
        });

        room.lastMessage = message._id;
        room.updatedAt = new Date();
        await room.save();

        const populated = await Message.populate(message, [
          { path: 'sender', select: 'firstName lastName email role photo' },
          { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName email role photo' } },
        ]);

        const participantIds = room.participants.map(p => p._id ? p._id.toString() : p.toString());
        for (const [pUserId, info] of onlineUsers) {
          if (participantIds.includes(pUserId)) {
            const sock = io.sockets.sockets.get(info.socketId);
            if (sock) sock.join(roomId);
          }
        }

        io.to(roomId).emit('new_message', populated);
        io.to(roomId).emit('conversation_updated', { roomId, lastMessage: populated });

        const recipientIds = participantIds.filter(pid => pid !== userId);
        for (const rid of recipientIds) {
          if (onlineUsers.has(rid)) {
            await Message.findByIdAndUpdate(message._id, {
              $addToSet: { deliveredTo: { user: rid, deliveredAt: new Date() } },
            });
          }
        }
        const updatedMsg = await Message.findById(message._id).populate([
          { path: 'sender', select: 'firstName lastName email role photo' },
          { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName email role photo' } },
        ]);
        io.to(roomId).emit('message_delivered', { messageId: updatedMsg._id, deliveredTo: updatedMsg.deliveredTo });
        callback?.({ message: updatedMsg });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('call_user', async ({ targetUserId, callType }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) {
          targetSocket.emit('incoming_call', {
            from: userId,
            callerName: `${user.firstName} ${user.lastName}`,
            callerPhoto: user.photo,
            callType,
          });
        }
      } else {
        await CallLog.create({
          caller: user._id,
          callee: targetUserId,
          type: callType,
          status: 'missed',
        });
        socket.emit('call_log_created', { message: 'User is offline — missed call logged' });
      }
    });

    socket.on('accept_call', async ({ targetUserId }) => {
      await CallLog.create({
        caller: user._id,
        callee: targetUserId,
        type: 'audio',
        status: 'answered',
        startedAt: new Date(),
      });
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('call_accepted', { from: userId });
      }
    });

    socket.on('reject_call', async ({ targetUserId }) => {
      const log = await CallLog.findOne({
        caller: targetUserId,
        callee: user._id,
        status: 'missed',
      }).sort({ createdAt: -1 });
      if (log) {
        log.status = 'rejected';
        log.startedAt = new Date();
        await log.save();
      }
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('call_rejected', { from: userId });
      }
    });

    socket.on('offer', ({ targetUserId, offer }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('offer', { from: userId, offer });
      }
    });

    socket.on('answer', ({ targetUserId, answer }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('answer', { from: userId, answer });
      }
    });

    socket.on('ice_candidate', ({ targetUserId, candidate }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('ice_candidate', { from: userId, candidate });
      }
    });

    socket.on('end_call', async ({ targetUserId }) => {
      const now = new Date();
      const log = await CallLog.findOne({
        $or: [
          { caller: user._id, callee: targetUserId, status: 'answered' },
          { caller: targetUserId, callee: user._id, status: 'answered' },
        ],
      }).sort({ createdAt: -1 });
      if (log) {
        log.status = 'answered';
        log.endedAt = now;
        if (log.startedAt) log.duration = Math.floor((now - log.startedAt) / 1000);
        await log.save();
      }
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('call_ended', { from: userId });
      }
    });

    socket.on('toggle_mic', ({ targetUserId, muted }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('mic_toggled', { from: userId, muted });
      }
    });

    socket.on('toggle_video', ({ targetUserId, videoOff }) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.emit('video_toggled', { from: userId, videoOff });
      }
    });

    socket.on('photo_changed', ({ photo }) => {
      const entry = onlineUsers.get(userId);
      if (entry) {
        entry.photo = photo;
        onlineUsers.set(userId, entry);
      }
      socket.broadcast.emit('user_photo_updated', { userId, photo });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });
}

module.exports = setupChatSocket;
