const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateComment, deleteComment } = require('../controllers/commentController');

router.use(protect);
router.route('/:id').put(updateComment).delete(deleteComment);

module.exports = router;
