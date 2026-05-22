const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

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
      socketId: socket.id,
      onlineAt: new Date(),
    });

    socket.broadcast.emit('user_online', { userId, name: `${user.firstName} ${user.lastName}` });

    const rooms = await ChatRoom.find({
      participants: user._id,
      isActive: true,
    }).select('_id');

    rooms.forEach((room) => {
      socket.join(room._id.toString());
    });

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
          { path: 'sender', select: 'firstName lastName email role' },
          { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName email role' } },
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
          { path: 'sender', select: 'firstName lastName email role' },
          { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName email role' } },
        ]);
        io.to(roomId).emit('message_delivered', { messageId: updatedMsg._id, deliveredTo: updatedMsg.deliveredTo });
        callback?.({ message: updatedMsg });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });
}

module.exports = setupChatSocket;
