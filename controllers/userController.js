const User = require('../models/User');

// @GET /api/auth/users (for assignment/mention dropdowns)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }).select('name email role avatar');
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

module.exports = { getUsers };
