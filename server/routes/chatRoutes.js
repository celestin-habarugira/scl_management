const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../config/upload');
const {
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
} = require('../controllers/chatController');

router.use(protect);

router.get('/conversations', getUserConversations);
router.get('/users', getAvailableUsers);
router.get('/messages/:roomId', getMessages);

router.post('/direct', getOrCreateDirectRoom);
router.post('/group', createGroupRoom);
router.post('/announcement', createAnnouncementRoom);
router.post('/messages', sendMessage);
router.post('/upload', upload.single('file'), uploadFile);
router.put('/read/:roomId', markAsRead);
router.post('/react/:messageId', reactToMessage);
router.put('/edit/:messageId', editMessage);
router.delete('/delete/:messageId', deleteMessage);
router.get('/search/:roomId', searchMessages);

module.exports = router;
