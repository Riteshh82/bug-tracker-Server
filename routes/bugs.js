const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getBugs, createBug, getBug, updateBug, deleteBug, restoreBug, getBugActivity, importBugs, downloadTemplate } = require('../controllers/bugController');
const { getComments, addComment } = require('../controllers/commentController');

// Memory storage multer for Excel imports (no disk write needed)
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.originalname.match(/\.(xlsx|xls)$/i);
    if (ok) return cb(null, true);
    cb(new Error('Only .xlsx and .xls files are allowed'));
  },
});

router.use(protect);

router.route('/').get(getBugs).post(upload.array('screenshots', 5), createBug);
router.get('/import/template', downloadTemplate);
router.post('/import', xlsxUpload.single('file'), importBugs);
router.route('/:id').get(getBug).put(updateBug).delete(deleteBug);
router.put('/:id/restore', restoreBug);
router.get('/:id/activity', getBugActivity);
router.get('/:bugId/comments', getComments);
router.post('/:bugId/comments', addComment);

module.exports = router;

