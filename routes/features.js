const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { getFeatures, createFeature, updateFeature, deleteFeature } = require('../controllers/moduleController');

router.use(protect);
router.route('/').get(getFeatures).post(createFeature);
router.route('/:id').put(updateFeature).delete(deleteFeature);

module.exports = router;
