const Attendance = require('../models/Attendance');

const getAll = async (req, res) => {
  try {
    const { date, studentId } = req.query;
    const query = {};
    if (date) query.date = new Date(date);
    if (studentId) query.student = studentId;
    const attendance = await Attendance.find(query).populate('student', 'firstName lastName studentId grade').sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { student, date, status, notes } = req.body;
    const attendance = await Attendance.findOneAndUpdate(
      { student, date: new Date(date) },
      { student, date: new Date(date), status, notes, markedBy: req.user?.id },
      { upsert: true, new: true }
    );
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createBulk = async (req, res) => {
  try {
    const { records } = req.body;
    const results = await Promise.all(
      records.map(async ({ student, date, status, notes }) => {
        return Attendance.findOneAndUpdate(
          { student, date: new Date(date) },
          { student, date: new Date(date), status, notes, markedBy: req.user?.id },
          { upsert: true, new: true }
        );
      })
    );
    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const stats = await Attendance.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAll, create, createBulk, getStats };
