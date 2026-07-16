const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  facesDetected: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' },
  capturedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Snapshot', snapshotSchema);
