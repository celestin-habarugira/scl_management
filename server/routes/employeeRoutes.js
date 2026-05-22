const express = require('express');
const router = express.Router();
const { register, login, getProfile, getAll, getById, update, remove } = require('../controllers/employeeController');
const { protect, admin } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.get('/', protect, getAll);
router.get('/:id', protect, getById);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
