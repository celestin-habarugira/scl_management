const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  grade: { type: String, required: true },
  section: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  parentName: { type: String },
  parentPhone: { type: String },
  address: { type: String },
  enrollmentDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  photo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
