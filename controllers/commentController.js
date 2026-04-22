const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Bug = require('../models/Bug');

// @GET /api/bugs/:bugId/comments
const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ bug: req.params.bugId })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 });
    res.json({ success: true, comments });
  } catch (err) { next(err); }
};

// @POST /api/bugs/:bugId/comments
const addComment = async (req, res, next) => {
  try {
    const { content, mentions } = req.body;
    const comment = await Comment.create({ bug: req.params.bugId, author: req.user._id, content, mentions: mentions || [] });

    await ActivityLog.create({ entity: 'Comment', entityId: comment._id, action: 'comment_added', performedBy: req.user._id, metadata: { bugId: req.params.bugId } });

    // Notify mentions
    if (mentions && mentions.length) {
      const bug = await Bug.findById(req.params.bugId);
      for (const userId of mentions) {
        if (userId !== req.user._id.toString()) {
          await Notification.create({
            recipient: userId,
            sender: req.user._id,
            type: 'mentioned',
            message: `${req.user.name} mentioned you in bug ${bug?.bugId}`,
            entityType: 'Bug',
            entityId: req.params.bugId,
          });
        }
      }
    }

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email');
    res.status(201).json({ success: true, comment: populated });
  } catch (err) { next(err); }
};

// @PUT /api/comments/:id
const updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { content: req.body.content, isEdited: true },
      { new: true }
    ).populate('author', 'name email avatar');
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    res.json({ success: true, comment });
  } catch (err) { next(err); }
};

// @DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    await Comment.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

module.exports = { getComments, addComment, updateComment, deleteComment };
