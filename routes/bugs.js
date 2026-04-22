const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getBugs, createBug, getBug, updateBug, deleteBug, restoreBug, getBugActivity } = require('../controllers/bugController');
const { getComments, addComment } = require('../controllers/commentController');

router.use(protect);

router.route('/').get(getBugs).post(upload.array('screenshots', 5), createBug);
router.route('/:id').get(getBug).put(updateBug).delete(deleteBug);
router.put('/:id/restore', restoreBug);
router.get('/:id/activity', getBugActivity);
router.get('/:bugId/comments', getComments);
router.post('/:bugId/comments', addComment);

module.exports = router;
