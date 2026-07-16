const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ExamAttempt = require('../models/ExamAttempt');
const { protect, adminOnly } = require('../middleware/auth');

// @route GET /api/users — Get all users (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/users/:id — Get user profile
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/users/:id/results — Get student's exam results
router.get('/:id/results', protect, async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attempts = await ExamAttempt.find({
      student: req.params.id,
      status: { $in: ['submitted', 'terminated'] },
    })
      .populate('exam', 'title duration totalMarks')
      .sort({ submittedAt: -1 });

    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/users/profile — Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/users/:id — Deactivate user (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
