const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String },
  term: { type: String, required: true },
  year: { type: Number, required: true },
  comments: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });

performanceSchema.index({ student: 1, subject: 1, term: 1, year: 1 });

module.exports = mongoose.model('Performance', performanceSchema);
