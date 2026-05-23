const mongoose = require('mongoose');

const callLogSchema = mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  callee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['audio', 'video'], required: true },
  status: { type: String, enum: ['missed', 'answered', 'rejected'], default: 'missed' },
  duration: { type: Number, default: 0 },
  startedAt: { type: Date },
  endedAt: { type: Date },
}, { timestamps: true });

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ callee: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
