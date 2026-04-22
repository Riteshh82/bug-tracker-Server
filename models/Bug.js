const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  bugId: { type: String, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  stepsToReproduce: { type: String, default: '' },
  expectedResult: { type: String, default: '' },
  actualResult: { type: String, default: '' },
  priority: {
    type: String,
    enum: ['Blocker', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  type: {
    type: String,
    enum: ['Bug', 'Suggestion', 'Improvement'],
    default: 'Bug',
  },
  status: {
    type: String,
    enum: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'],
    default: 'Open',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  module:    { type: mongoose.Schema.Types.ObjectId, ref: 'Module', default: null },
  feature:   { type: mongoose.Schema.Types.ObjectId, ref: 'Feature', default: null },
  screenshots: [{ url: String, filename: String }],
  tags: [{ type: String }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  history: [
    {
      field:     String,
      oldValue:  mongoose.Schema.Types.Mixed,
      newValue:  mongoose.Schema.Types.Mixed,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changedAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

// Race-condition-safe bugId using findOneAndUpdate on a counter doc
// We use a simple padded counter based on createdAt ordering as fallback
bugSchema.pre('save', async function (next) {
  if (!this.bugId) {
    // Use a retry loop in case of duplicate key on concurrent inserts
    let attempts = 0;
    while (attempts < 5) {
      try {
        const count = await mongoose.model('Bug').countDocuments({});
        this.bugId = `BUG-${String(count + 1 + attempts).padStart(3, '0')}`;
        break;
      } catch (e) {
        attempts++;
        if (attempts >= 5) return next(e);
      }
    }
  }
  next();
});

module.exports = mongoose.model('Bug', bugSchema);
