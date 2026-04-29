const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined in .env');
  return jwt.sign({ id }, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, token: generateToken(user._id), user: user.toJSON() });
  } catch (err) { next(err); }
};
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, updateProfile };
