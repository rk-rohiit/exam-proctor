const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: Number, required: true },
  marks: { type: Number, default: 1 },
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true },
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  questions: [questionSchema],
  accessCode: { type: String, required: true, unique: true },
  startTime: { type: Date },
  endTime: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  maxViolations: { type: Number, default: 3 },
}, { timestamps: true });

examSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    this.passingMarks = Math.ceil(this.totalMarks * 0.4);
  }
  next();
});

module.exports = mongoose.model('Exam', examSchema);
