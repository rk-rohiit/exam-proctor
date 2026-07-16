const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');

// @route GET /api/alerts — Get alerts (admin: all for their exams; student: own)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const alerts = await Alert.find(query)
      .populate('student', 'name email')
      .populate('exam', 'title')
      .populate('attempt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/alerts/exam/:examId — Get alerts for specific exam (admin)
router.get('/exam/:examId', protect, adminOnly, async (req, res) => {
  try {
    const alerts = await Alert.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .populate('attempt', 'violationCount suspicionScore status')
      .sort({ createdAt: -1 });

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/alerts/attempt/:attemptId — Get alerts for specific attempt
router.get('/attempt/:attemptId', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ attempt: req.params.attemptId })
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/alerts/:id/acknowledge — Acknowledge alert (admin)
router.put('/:id/acknowledge', protect, adminOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        acknowledged: true,
        acknowledgedBy: req.user._id,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert acknowledged', alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/alerts/stats — Dashboard stats (admin)
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const ExamAttempt = require('../models/ExamAttempt');
    const Exam = require('../models/Exam');

    const [totalExams, activeAttempts, totalAlerts, unacknowledged] = await Promise.all([
      Exam.countDocuments({ createdBy: req.user._id }),
      ExamAttempt.countDocuments({ status: 'active' }),
      Alert.countDocuments(),
      Alert.countDocuments({ acknowledged: false }),
    ]);

    const recentAlerts = await Alert.find()
      .populate('student', 'name email')
      .populate('exam', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ totalExams, activeAttempts, totalAlerts, unacknowledged, recentAlerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
