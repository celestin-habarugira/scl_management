const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const Performance = require('../models/Performance');
const CallLog = require('../models/CallLog');
const path = require('path');
const fs = require('fs');

const getOrCreateDirectRoom = async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    const participant = await Employee.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userIds = [req.user._id, participantId].sort();
    let room = await ChatRoom.findOne({
      type: 'direct',
      participants: { $all: userIds, $size: 2 },
    });

    if (!room) {
      room = await ChatRoom.create({
        type: 'direct',
        participants: userIds,
      });
    }

    await room.populate('participants', 'firstName lastName email role photo');

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGroupRoom = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    if (!name || !participantIds || participantIds.length < 2) {
      return res.status(400).json({ message: 'Name and at least 2 participants required' });
    }

    const allParticipants = [...new Set([...participantIds, req.user._id.toString()])];

    const room = await ChatRoom.create({
      name,
      type: 'group',
      participants: allParticipants,
      createdBy: req.user._id,
    });

    await room.populate('participants', 'firstName lastName email role photo');

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAnnouncementRoom = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create announcement rooms' });
    }

    const { name, participantIds } = req.body;

    const allEmployees = await Employee.find({ isActive: true }).select('_id');
    const allIds = allEmployees.map((e) => e._id.toString());

    const participants = participantIds
      ? [...new Set([...participantIds, req.user._id.toString()])]
      : allIds;

    const room = await ChatRoom.create({
      name: name || 'Announcements',
      type: 'announcement',
      participants,
      createdBy: req.user._id,
    });

    await room.populate('participants', 'firstName lastName email role photo');

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate('participants', 'firstName lastName email role photo')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await Message.countDocuments({
          chatRoom: room._id,
          'readBy.user': { $ne: req.user._id },
          sender: { $ne: req.user._id },
        });

        let displayName = room.name;
        let avatar = null;
        if (room.type === 'direct') {
          const other = room.participants.find(
            (p) => p._id.toString() !== req.user._id.toString()
          );
          if (other) {
            displayName = other.firstName + ' ' + other.lastName;
          }
        }

        return {
          _id: room._id,
          type: room.type,
          name: displayName,
          participants: room.participants,
          lastMessage: room.lastMessage,
          unreadCount,
          updatedAt: room.updatedAt,
        };
      })
    );

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const room = await ChatRoom.findOne({
      _id: roomId,
      participants: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ chatRoom: roomId })
      .populate('sender', 'firstName lastName email role photo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chatRoom: roomId });

    res.json({
      messages: messages.reverse(),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId, content, messageType, replyTo } = req.body;

    const room = await ChatRoom.findOne({
      _id: roomId,
      participants: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (replyTo) {
      const repliedMsg = await Message.findById(replyTo);
      if (!repliedMsg || repliedMsg.chatRoom.toString() !== roomId) {
        return res.status(400).json({ message: 'Invalid reply target' });
      }
    }

    const message = await Message.create({
      chatRoom: roomId,
      sender: req.user._id,
      content: content || '',
      messageType: messageType || 'text',
      replyTo: replyTo || null,
      readBy: [{ user: req.user._id }],
    });

    room.lastMessage = message._id;
    room.updatedAt = new Date();
    await room.save();

    const populated = await message.populate([
      { path: 'sender', select: 'firstName lastName email role photo' },
      { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName email role photo' } },
    ]);

    const io = req.app.get('io');
    if (io) {
      const onlineUsers = io.onlineUsers || new Map();
      const participantIds = room.participants.map(p => p._id ? p._id.toString() : p.toString());
      for (const [pUserId, info] of onlineUsers) {
        if (participantIds.includes(pUserId)) {
          const sock = io.sockets.sockets.get(info.socketId);
          if (sock) sock.join(roomId);
        }
      }
      io.to(roomId).emit('new_message', populated);
      io.to(roomId).emit('conversation_updated', {
        roomId,
        lastMessage: populated,
      });

      const recipientIds = participantIds.filter(pid => pid !== req.user._id.toString());
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
      res.status(201).json(updatedMsg);
    } else {
      res.status(201).json(populated);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { roomId } = req.body;

    const room = await ChatRoom.findOne({
      _id: roomId,
      participants: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = '/uploads/' + req.file.filename;

    const message = await Message.create({
      chatRoom: roomId,
      sender: req.user._id,
      content: req.file.originalname,
      messageType: isImage ? 'image' : 'file',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      readBy: [{ user: req.user._id }],
    });

    room.lastMessage = message._id;
    room.updatedAt = new Date();
    await room.save();

    const populated = await message.populate('sender', 'firstName lastName email role photo');

    const io = req.app.get('io');
    if (io) {
      const onlineUsers = io.onlineUsers || new Map();
      const participantIds = room.participants.map(p => p._id ? p._id.toString() : p.toString());
      for (const [pUserId, info] of onlineUsers) {
        if (participantIds.includes(pUserId)) {
          const sock = io.sockets.sockets.get(info.socketId);
          if (sock) sock.join(roomId);
        }
      }
      io.to(roomId).emit('new_message', populated);
      io.to(roomId).emit('conversation_updated', {
        roomId,
        lastMessage: populated,
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;

    await Message.updateMany(
      {
        chatRoom: roomId,
        'readBy.user': { $ne: req.user._id },
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } },
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('messages_seen', {
        roomId,
        userId: req.user._id,
        seenAt: new Date(),
      });
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const userIdStr = req.user._id.toString();
    const existing = message.reactions.find(r => r.user.toString() === userIdStr && r.emoji === emoji);

    if (existing) {
      message.reactions.pull({ _id: existing._id });
    } else {
      message.reactions.push({ emoji, user: req.user._id });
    }

    await message.save();
    const populated = await Message.populate(message, { path: 'reactions.user', select: 'firstName lastName' });

    const io = req.app.get('io');
    if (io) {
      io.to(message.chatRoom.toString()).emit('message_reacted', {
        messageId: message._id,
        reactions: populated.reactions,
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const message = await Message.findOne({ _id: messageId, sender: req.user._id, isDeleted: false });
    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinAgo) {
      return res.status(403).json({ message: 'Can only edit messages within 5 minutes' });
    }

    if (message.messageType !== 'text') {
      return res.status(400).json({ message: 'Can only edit text messages' });
    }

    message.content = content.trim();
    message.edited = true;
    await message.save();

    const populated = await message.populate('sender', 'firstName lastName email role photo');
    const io = req.app.get('io');
    if (io) {
      io.to(message.chatRoom.toString()).emit('message_edited', {
        messageId: message._id,
        content: populated.content,
        edited: true,
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isSender && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to delete this message' });
    }

    message.isDeleted = true;
    message.content = '';
    message.fileUrl = null;
    message.fileName = null;
    message.fileSize = null;
    message.mimeType = null;
    message.reactions = [];
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.chatRoom.toString()).emit('message_deleted', { messageId: message._id });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id });
    if (!room) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({
      chatRoom: roomId,
      content: { $regex: q.trim(), $options: 'i' },
      messageType: { $in: ['text', 'announcement'] },
      isDeleted: false,
    })
      .populate('sender', 'firstName lastName email role photo')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.download(filePath, filename);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({
      $or: [{ caller: req.user._id }, { callee: req.user._id }],
    })
      .populate('caller', 'firstName lastName email role photo')
      .populate('callee', 'firstName lastName email role photo')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAvailableUsers = async (req, res) => {
  try {
    const users = await Employee.find({
      _id: { $ne: req.user._id },
      isActive: true,
    }).select('firstName lastName email role department phone photo');

    const userIds = users.map(u => u._id);
    const perfStats = await Performance.aggregate([
      { $match: { recordedBy: { $in: userIds } } },
      { $group: {
          _id: '$recordedBy',
          recordCount: { $sum: 1 },
          avgScore: { $avg: '$score' },
          subjects: { $addToSet: '$subject' },
      }},
    ]);

    const statsMap = {};
    perfStats.forEach(s => { statsMap[s._id.toString()] = s; });

    const result = users.map(u => {
      const stats = statsMap[u._id.toString()] || {};
      return {
        ...u.toObject(),
        performance: {
          recordCount: stats.recordCount || 0,
          avgScore: stats.avgScore ? Math.round(stats.avgScore * 10) / 10 : null,
          subjects: stats.subjects || [],
        },
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrCreateDirectRoom,
  createGroupRoom,
  createAnnouncementRoom,
  getUserConversations,
  getMessages,
  sendMessage,
  uploadFile,
  markAsRead,
  getAvailableUsers,
  reactToMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  downloadFile,
  getCallLogs,
};
