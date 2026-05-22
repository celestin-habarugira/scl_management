require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');

const employees = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@scl.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    phone: '+250788000001',
  },
  {
    firstName: 'Jean',
    lastName: 'Habimana',
    email: 'jean@scl.com',
    password: 'teacher123',
    role: 'teacher',
    department: 'Mathematics',
    phone: '+250788000002',
  },
  {
    firstName: 'Marie',
    lastName: 'Mukamana',
    email: 'marie@scl.com',
    password: 'staff123',
    role: 'staff',
    department: 'Finance',
    phone: '+250788000003',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { tls: false });
    console.log('Connected to MongoDB');

    for (const emp of employees) {
      const existing = await Employee.findOne({ email: emp.email });
      if (existing) {
        console.log(`Skipped ${emp.email} (already exists)`);
        continue;
      }
      await Employee.create(emp);
      console.log(`Created ${emp.email}`);
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
