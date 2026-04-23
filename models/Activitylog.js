const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  entity: { type: String, required: true }, // 'Bug', 'Project', 'Comment', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true }, // 'created', 'updated', 'deleted', 'comment_added', etc.
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);