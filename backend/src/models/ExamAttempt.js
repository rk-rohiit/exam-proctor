const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['NO_FACE', 'MULTIPLE_FACES', 'NOISE_DETECTED', 'GAZE_AWAY', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'RIGHT_CLICK'],
    required: true
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} },
});

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedOption: { type: Number, default: null },
  answeredAt: { type: Date },
});

const examAttemptSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [answerSchema],
  violations: [violationSchema],
  violationCount: { type: Number, default: 0 },
  suspicionScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'submitted', 'terminated', 'abandoned'],
    default: 'active'
  },
  autoSubmitted: { type: Boolean, default: false },
  terminationReason: { type: String, default: '' },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  snapshots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' }],
}, { timestamps: true });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
