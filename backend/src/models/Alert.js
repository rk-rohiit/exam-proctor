const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  type: {
    type: String,
    enum: ['NO_FACE', 'MULTIPLE_FACES', 'NOISE_DETECTED', 'GAZE_AWAY', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'RIGHT_CLICK'],
    required: true
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  message: { type: String, default: '' },
  snapshot: { type: String, default: '' },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
