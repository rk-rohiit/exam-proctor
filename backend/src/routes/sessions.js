const express = require('express');
const router = express.Router();
const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Alert = require('../models/Alert');
const Snapshot = require('../models/Snapshot');
const { protect, adminOnly } = require('../middleware/auth');
const { emitViolationAlert, emitExamTerminated } = require('../services/socketService');
const upload = require('../middleware/upload');

// @route POST /api/sessions/start — Student starts exam
router.post('/start', protect, async (req, res) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (!exam.isActive) return res.status(400).json({ message: 'Exam is not active' });

    // Check if student already has an active attempt
    const existingAttempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
      status: 'active',
    });
    if (existingAttempt) {
      return res.json({ message: 'Resuming existing session', attempt: existingAttempt });
    }

    // Check if already submitted/terminated
    const completedAttempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
      status: { $in: ['submitted', 'terminated'] },
    });
    if (completedAttempt) {
      return res.status(400).json({ message: 'You have already completed this exam', attempt: completedAttempt });
    }

    const attempt = await ExamAttempt.create({
      exam: examId,
      student: req.user._id,
      answers: exam.questions.map((_, idx) => ({ questionIndex: idx, selectedOption: null })),
      startedAt: new Date(),
    });

    res.status(201).json({ message: 'Exam session started', attempt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/sessions/:attemptId/answer — Save answer
router.put('/:attemptId/answer', protect, async (req, res) => {
  try {
    const { questionIndex, selectedOption } = req.body;
    const attempt = await ExamAttempt.findOne({
      _id: req.params.attemptId,
      student: req.user._id,
      status: 'active',
    });
    if (!attempt) return res.status(404).json({ message: 'Active session not found' });

    const answerIdx = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
    if (answerIdx === -1) {
      attempt.answers.push({ questionIndex, selectedOption, answeredAt: new Date() });
    } else {
      attempt.answers[answerIdx].selectedOption = selectedOption;
      attempt.answers[answerIdx].answeredAt = new Date();
    }

    await attempt.save();
    res.json({ message: 'Answer saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/sessions/:attemptId/violation — Report violation
router.post('/:attemptId/violation', protect, async (req, res) => {
  try {
    const { type, severity, metadata, snapshotUrl } = req.body;

    const attempt = await ExamAttempt.findOne({
      _id: req.params.attemptId,
      student: req.user._id,
      status: 'active',
    }).populate('exam');

    if (!attempt) return res.status(404).json({ message: 'Active session not found' });

    // Add violation
    attempt.violations.push({ type, severity: severity || 'MEDIUM', metadata: metadata || {}, timestamp: new Date() });
    attempt.violationCount += 1;

    // Update suspicion score
    const severityScore = { LOW: 10, MEDIUM: 25, HIGH: 40 };
    attempt.suspicionScore = Math.min(100, attempt.suspicionScore + (severityScore[severity] || 25));

    // Create alert for admin
    const alert = await Alert.create({
      attempt: attempt._id,
      student: req.user._id,
      exam: attempt.exam._id,
      type,
      severity: severity || 'MEDIUM',
      message: getViolationMessage(type),
      snapshot: snapshotUrl || '',
    });

    const maxViolations = attempt.exam.maxViolations || 3;
    let autoSubmitted = false;

    // Auto-submit if violations >= threshold
    if (attempt.violationCount >= maxViolations) {
      attempt.status = 'terminated';
      attempt.autoSubmitted = true;
      attempt.terminationReason = `Exceeded maximum violations (${maxViolations})`;
      attempt.submittedAt = new Date();

      // Calculate score
      const scoreResult = await calculateScore(attempt);
      attempt.score = scoreResult.score;
      attempt.percentage = scoreResult.percentage;
      attempt.passed = scoreResult.passed;

      autoSubmitted = true;
      emitExamTerminated(attempt._id.toString(), attempt.terminationReason);
    }

    await attempt.save();

    // Emit to admin dashboard
    emitViolationAlert(attempt.exam._id.toString(), {
      alertId: alert._id,
      attemptId: attempt._id,
      studentId: req.user._id,
      studentName: req.user.name,
      examId: attempt.exam._id,
      type,
      severity,
      message: getViolationMessage(type),
      violationCount: attempt.violationCount,
      maxViolations,
      timestamp: new Date(),
      autoSubmitted,
    });

    res.json({
      message: 'Violation recorded',
      violationCount: attempt.violationCount,
      maxViolations,
      autoSubmitted,
      suspicionScore: attempt.suspicionScore,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/sessions/:attemptId/submit — Manual submit
router.post('/:attemptId/submit', protect, async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({
      _id: req.params.attemptId,
      student: req.user._id,
      status: 'active',
    }).populate('exam');

    if (!attempt) return res.status(404).json({ message: 'Active session not found' });

    const scoreResult = await calculateScore(attempt);
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.score = scoreResult.score;
    attempt.percentage = scoreResult.percentage;
    attempt.passed = scoreResult.passed;

    await attempt.save();
    res.json({ message: 'Exam submitted successfully', attempt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/sessions/:attemptId/snapshot — Upload snapshot
router.post('/:attemptId/snapshot', protect, upload.single('snapshot'), async (req, res) => {
  try {
    const attempt = await ExamAttempt.findOne({
      _id: req.params.attemptId,
      student: req.user._id,
    });
    if (!attempt) return res.status(404).json({ message: 'Session not found' });

    const imageUrl = `/uploads/snapshots/${req.file.filename}`;
    const snapshot = await Snapshot.create({
      attempt: attempt._id,
      student: req.user._id,
      imageUrl,
      facesDetected: req.body.facesDetected || 0,
      flagged: req.body.flagged === 'true',
      flagReason: req.body.flagReason || '',
    });

    attempt.snapshots.push(snapshot._id);
    await attempt.save();

    res.json({ message: 'Snapshot saved', snapshot });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/sessions/:attemptId — Get session details
router.get('/:attemptId', protect, async (req, res) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.attemptId)
      .populate('exam', 'title duration questions maxViolations')
      .populate('student', 'name email')
      .populate('snapshots');

    if (!attempt) return res.status(404).json({ message: 'Session not found' });

    // Only admin or the student themselves
    if (req.user.role === 'student' && attempt.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ attempt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/sessions/exam/:examId — Get all attempts for an exam (admin)
router.get('/exam/:examId', protect, adminOnly, async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({ exam: req.params.examId })
      .populate('student', 'name email faceEnrolled')
      .sort({ startedAt: -1 });

    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: Calculate score
async function calculateScore(attempt) {
  const exam = attempt.exam;
  if (!exam || !exam.questions) return { score: 0, percentage: 0, passed: false };

  let score = 0;
  for (const answer of attempt.answers) {
    const question = exam.questions[answer.questionIndex];
    if (question && answer.selectedOption === question.correctAnswer) {
      score += question.marks || 1;
    }
  }

  const percentage = exam.totalMarks > 0 ? Math.round((score / exam.totalMarks) * 100) : 0;
  const passed = score >= (exam.passingMarks || 0);
  return { score, percentage, passed };
}

// Helper: Violation messages
function getViolationMessage(type) {
  const messages = {
    NO_FACE: 'No face detected in camera view',
    MULTIPLE_FACES: 'Multiple faces detected in camera view',
    NOISE_DETECTED: 'Suspicious noise or voice detected',
    GAZE_AWAY: 'Student looking away from screen',
    TAB_SWITCH: 'Student switched tab or window',
    FULLSCREEN_EXIT: 'Student exited fullscreen mode',
    COPY_PASTE: 'Copy/Paste action detected',
    RIGHT_CLICK: 'Right-click action detected',
  };
  return messages[type] || 'Unknown violation';
}

module.exports = router;
