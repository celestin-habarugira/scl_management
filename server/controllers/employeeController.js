const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const upload = require('../config/upload');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, phone } = req.body;
    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const employee = await Employee.create({ firstName, lastName, email, password, role, department, phone });
    const token = jwt.sign({ id: employee._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    res.status(201).json({ employee: { id: employee._id, firstName, lastName, email, role, department, photo: employee.photo }, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee || !(await employee.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!employee.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    const token = jwt.sign({ id: employee._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    res.json({ employee: { id: employee._id, firstName: employee.firstName, lastName: employee.lastName, email, role: employee.role, photo: employee.photo }, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('-password');
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: 'Employee not found' });
  }
};

const getAll = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).select('-password').sort({ lastName: 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized to update this employee' });
    }
    const employee = await Employee.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true }).select('-password');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const employee = await Employee.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    const photo = '/uploads/' + req.file.filename;
    const employee = await Employee.findByIdAndUpdate(
      req.user._id,
      { photo },
      { new: true }
    ).select('-password');
    res.json({ photo: employee.photo, employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, getProfile, getAll, getById, update, remove, uploadPhoto };
