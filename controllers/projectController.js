const Project = require("../models/Project");
const ActivityLog = require("../models/Activitylog.js");

const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
      isDeleted: false,
    })
      .populate("owner", "name email avatar")
      .populate("members", "name email avatar");
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: members || [],
    });
    await ActivityLog.create({
      entity: "Project",
      entityId: project._id,
      action: "created",
      performedBy: req.user._id,
    });
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members", "name email avatar");
    if (!project || project.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
};

const addMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    if (!project.members.includes(req.body.userId)) {
      project.members.push(req.body.userId);
      await project.save();
    }
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project owner can remove members' });
    }
    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    const updated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');
    res.json({ success: true, project: updated });
  } catch (err) { next(err); }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};

