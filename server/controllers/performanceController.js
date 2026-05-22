const Performance = require('../models/Performance');

const getAll = async (req, res) => {
  try {
    const { studentId, subject, term, year } = req.query;
    const query = {};
    if (studentId) query.student = studentId;
    if (subject) query.subject = subject;
    if (term) query.term = term;
    if (year) query.year = parseInt(year);
    const performances = await Performance.find(query).populate('student', 'firstName lastName studentId grade').sort({ createdAt: -1 });
    res.json(performances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { student, subject, score, grade, term, year, comments } = req.body;
    const performance = await Performance.create({ student, subject, score, grade, term, year, comments, recordedBy: req.user?.id });
    res.status(201).json(performance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!performance) return res.status(404).json({ error: 'Performance record not found' });
    res.json(performance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    if (!performance) return res.status(404).json({ error: 'Performance record not found' });
    res.json({ message: 'Performance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStudentStats = async (req, res) => {
  try {
    const { studentId, year } = req.params;
    const query = { student: studentId };
    if (year) query.year = parseInt(year);
    const stats = await Performance.aggregate([
      { $match: query },
      { $group: { _id: '$subject', averageScore: { $avg: '$score' }, maxScore: { $max: '$score' }, minScore: { $min: '$score' } } },
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAll, create, update, remove, getStudentStats };
