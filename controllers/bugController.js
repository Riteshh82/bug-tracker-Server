const Bug = require("../models/Bug");
const ActivityLog = require("../models/Activitylog.js");
const Notification = require("../models/Notification");

const getBugs = async (req, res, next) => {
  try {
    const {
      project,
      priority,
      status,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      isDeleted,
    } = req.query;
    const query = { isDeleted: isDeleted === "true" };

    if (project) query.project = project;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search)
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { bugId: { $regex: search, $options: "i" } },
      ];

    const total = await Bug.countDocuments(query);
    const bugs = await Bug.find(query)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .populate("module", "name")
      .populate("feature", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bugs,
    });
  } catch (err) {
    next(err);
  }
};

const createBug = async (req, res, next) => {
  try {
    const screenshots = req.files
      ? req.files.map((f) => ({
          url: `/uploads/${f.filename}`,
          filename: f.originalname,
        }))
      : [];

    let tags = req.body.tags;
    if (typeof tags === "string")
      tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    const bugData = {
      ...req.body,
      createdBy: req.user._id,
      screenshots,
      tags: tags || [],
    };
    const bug = await Bug.create(bugData);

    await ActivityLog.create({
      entity: "Bug",
      entityId: bug._id,
      action: "created",
      performedBy: req.user._id,
      metadata: { bugId: bug.bugId, title: bug.title },
    });

    if (
      bug.assignedTo &&
      bug.assignedTo.toString() !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: bug.assignedTo,
        sender: req.user._id,
        type: "bug_assigned",
        message: `You have been assigned bug ${bug.bugId}: ${bug.title}`,
        entityType: "Bug",
        entityId: bug._id,
      });
    }

    const populated = await Bug.findById(bug._id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name");

    res.status(201).json({ success: true, bug: populated });
  } catch (err) {
    next(err);
  }
};

const getBug = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .populate("module", "name")
      .populate("feature", "name")
      .populate("history.changedBy", "name avatar");
    if (!bug)
      return res.status(404).json({ success: false, message: "Bug not found" });
    res.json({ success: true, bug });
  } catch (err) {
    next(err);
  }
};

const updateBug = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug)
      return res.status(404).json({ success: false, message: "Bug not found" });

    if (req.body.tags && typeof req.body.tags === "string") {
      req.body.tags = req.body.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const trackedFields = ["status", "priority", "assignedTo", "title", "type"];
    const historyEntries = [];
    trackedFields.forEach((field) => {
      if (
        req.body[field] !== undefined &&
        String(bug[field]) !== String(req.body[field])
      ) {
        historyEntries.push({
          field,
          oldValue: bug[field],
          newValue: req.body[field],
          changedBy: req.user._id,
        });
      }
    });

    const previousStatus = bug.status;
    const createdById = bug.createdBy?.toString();

    Object.assign(bug, req.body);
    if (historyEntries.length) bug.history.push(...historyEntries);
    await bug.save();

    const changedFields = historyEntries.map((h) => h.field).join(", ");
    if (changedFields) {
      await ActivityLog.create({
        entity: "Bug",
        entityId: bug._id,
        action: "updated",
        performedBy: req.user._id,
        metadata: { fields: changedFields },
      });
    }

    if (
      req.body.status &&
      req.body.status !== previousStatus &&
      createdById &&
      createdById !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: bug.createdBy,
        sender: req.user._id,
        type: "status_changed",
        message: `Bug ${bug.bugId} status changed to ${req.body.status}`,
        entityType: "Bug",
        entityId: bug._id,
      });
    }

    const updated = await Bug.findById(bug._id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar");
    res.json({ success: true, bug: updated });
  } catch (err) {
    next(err);
  }
};

const deleteBug = async (req, res, next) => {
  try {
    await Bug.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    res.json({ success: true, message: "Bug moved to trash" });
  } catch (err) {
    next(err);
  }
};

const restoreBug = async (req, res, next) => {
  try {
    await Bug.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      deletedAt: null,
    });
    res.json({ success: true, message: "Bug restored" });
  } catch (err) {
    next(err);
  }
};

const getBugActivity = async (req, res, next) => {
  try {
    const activity = await ActivityLog.find({ entityId: req.params.id })
      .populate("performedBy", "name avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, activity });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBugs,
  createBug,
  getBug,
  updateBug,
  deleteBug,
  restoreBug,
  getBugActivity,
};
