const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Feature', featureSchema);
