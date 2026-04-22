const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProjects, createProject, getProject, updateProject, deleteProject, addMember } = require('../controllers/projectController');
const { getModules, createModule, updateModule, deleteModule } = require('../controllers/moduleController');

router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/members', addMember);

// Modules nested under project
router.get('/:projectId/modules', getModules);
router.post('/:projectId/modules', createModule);
router.put('/:projectId/modules/:id', updateModule);
router.delete('/:projectId/modules/:id', deleteModule);

module.exports = router;
