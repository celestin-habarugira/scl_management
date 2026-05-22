const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAll);
router.get('/:id', protect, getById);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
