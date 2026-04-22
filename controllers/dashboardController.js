const Bug = require('../models/Bug');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

// @GET /api/dashboard/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { project } = req.query;

    // Build base match — convert project string to ObjectId if provided
    const baseMatch = { isDeleted: false };
    if (project && mongoose.Types.ObjectId.isValid(project)) {
      baseMatch.project = new mongoose.Types.ObjectId(project);
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
      Bug.countDocuments({ ...baseMatch, status: 'Open' }),
      Bug.countDocuments({ ...baseMatch, status: 'Closed' }),
      Bug.countDocuments({ ...baseMatch, status: 'Resolved' }),
      Bug.countDocuments({ ...baseMatch, status: 'Reopened' }),
      Bug.countDocuments({ ...baseMatch, assignedTo: { $ne: null } }),
      Bug.countDocuments({ ...baseMatch, assignedTo: null }),
      Bug.aggregate([{ $match: baseMatch }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Bug.aggregate([{ $match: baseMatch }, { $group: { _id: '$status',   count: { $sum: 1 } } }]),
      Bug.aggregate([{ $match: baseMatch }, { $group: { _id: '$type',     count: { $sum: 1 } } }]),
    ]);

    // Bugs over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const bugsOverTime = await Bug.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Top reporters (QA productivity)
    const topReporters = await Bug.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      { $project: { name: '$user.name', avatar: '$user.avatar', count: 1 } },
    ]);

    res.json({
      success: true,
      stats: { totalBugs, openBugs, closedBugs, resolvedBugs, reopenedBugs, assignedBugs, unassignedBugs },
      byPriority,
      byStatus,
      byType,
      bugsOverTime,
      topReporters,
    });
  } catch (err) { next(err); }
};

module.exports = { getAnalytics };
