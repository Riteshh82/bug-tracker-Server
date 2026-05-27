const Bug = require("../models/Bug");
const User = require("../models/User");
const Project = require("../models/Project");
const ActivityLog = require("../models/Activitylog.js");
const mongoose = require("mongoose");

const getAnalytics = async (req, res, next) => {
  try {
    const { project, module, feature } = req.query;

    // Scope to projects the current user owns or is a member of
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
      isDeleted: false,
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id);

    const baseMatch = {
      isDeleted: false,
      project: { $in: userProjectIds },
    };

    // Optional narrower filters
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      baseMatch.project = new mongoose.Types.ObjectId(project);
    }
    if (module && mongoose.Types.ObjectId.isValid(module)) {
      baseMatch.module = new mongoose.Types.ObjectId(module);
    }
    if (feature && mongoose.Types.ObjectId.isValid(feature)) {
      baseMatch.feature = new mongoose.Types.ObjectId(feature);
    }


    const [
      totalBugs,
      openBugs,
      closedBugs,
      resolvedBugs,
      reopenedBugs,
      assignedBugs,
      unassignedBugs,
      byPriority,
      byStatus,
      byType,
    ] = await Promise.all([
      Bug.countDocuments(baseMatch),
      Bug.countDocuments({ ...baseMatch, status: "Open" }),
      Bug.countDocuments({ ...baseMatch, status: "Closed" }),
      Bug.countDocuments({ ...baseMatch, status: "Resolved" }),
      Bug.countDocuments({ ...baseMatch, status: "Reopened" }),
      Bug.countDocuments({ ...baseMatch, assignedTo: { $ne: null } }),
      Bug.countDocuments({ ...baseMatch, assignedTo: null }),
      Bug.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Bug.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Bug.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const bugsOverTime = await Bug.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const topReporters = await Bug.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
      { $project: { name: "$user.name", avatar: "$user.avatar", count: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalBugs,
        openBugs,
        closedBugs,
        resolvedBugs,
        reopenedBugs,
        assignedBugs,
        unassignedBugs,
      },
      byPriority,
      byStatus,
      byType,
      bugsOverTime,
      topReporters,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics };
