const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Exam = require('../models/Exam');
const { protect, adminOnly } = require('../middleware/auth');

// @route GET /api/exams — Get all exams (admin: all, student: assigned)
router.get('/', protect, async (req, res) => {
  try {
    let exams;
    if (req.user.role === 'admin') {
      exams = await Exam.find({ createdBy: req.user._id })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      exams = await Exam.find({ assignedStudents: req.user._id, isActive: true })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/exams/:id — Get single exam
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedStudents', 'name email faceEnrolled');

    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Students only see questions without correct answers
    if (req.user.role === 'student') {
      const examObj = exam.toObject();
      examObj.questions = examObj.questions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        marks: q.marks,
      }));
      delete examObj.assignedStudents;
      return res.json({ exam: examObj });
    }

    res.json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/exams — Create exam (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, duration, questions, startTime, endTime, maxViolations } = req.body;

    if (!title || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Title, duration and questions are required' });
    }

    const accessCode = uuidv4().substring(0, 8).toUpperCase();

    const exam = await Exam.create({
      title,
      description,
      duration,
      questions,
      startTime,
      endTime,
      maxViolations: maxViolations || 3,
      accessCode,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Exam created successfully', exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/exams/:id — Update exam (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const { title, description, duration, questions, startTime, endTime, isActive, maxViolations } = req.body;
    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration) exam.duration = duration;
    if (questions) exam.questions = questions;
    if (startTime) exam.startTime = startTime;
    if (endTime) exam.endTime = endTime;
    if (isActive !== undefined) exam.isActive = isActive;
    if (maxViolations) exam.maxViolations = maxViolations;

    await exam.save();
    res.json({ message: 'Exam updated', exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route DELETE /api/exams/:id — Delete exam (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/exams/join — Student joins exam with access code
router.post('/join', protect, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const exam = await Exam.findOne({ accessCode: accessCode.toUpperCase(), isActive: true });
    if (!exam) return res.status(404).json({ message: 'Invalid access code' });

    // Add student to assigned list if not already
    if (!exam.assignedStudents.includes(req.user._id)) {
      exam.assignedStudents.push(req.user._id);
      await exam.save();
    }

    res.json({ message: 'Joined exam successfully', exam: { _id: exam._id, title: exam.title, duration: exam.duration } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/exams/:id/assign — Assign students to exam (admin)
router.post('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.assignedStudents = [...new Set([...exam.assignedStudents.map(String), ...studentIds])];
    await exam.save();
    res.json({ message: 'Students assigned', exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
