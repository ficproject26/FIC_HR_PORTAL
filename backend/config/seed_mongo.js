require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Performance = require('../models/Performance');
const Attendance = require('../models/Attendance');
const CandidateProfile = require('../models/CandidateProfile');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const Notification = require('../models/Notification');
const Task = require('../models/Task');

async function seed() {
  console.log('🧹 Clearing all mock data from MongoDB Atlas...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Clear all collections
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Performance.deleteMany({});
    await Attendance.deleteMany({});
    await CandidateProfile.deleteMany({});
    await FollowUp.deleteMany({});
    await LeadActivity.deleteMany({});
    await Notification.deleteMany({});
    await Task.deleteMany({});
    console.log('✅ All data cleared.');

    // Hash password "Admin@123" for the standard users
    const hash = await bcrypt.hash('Admin@123', 10);

    // Create Super Admin
    await User.create({
      name: 'Super Admin',
      email: 'admin@hrcrm.com',
      password: hash,
      role: 'admin',
      department: 'Administration',
      designation: 'System Administrator'
    });
    console.log('Super Admin created.');

    // Create HR users
    const hrUsersData = [
      { name: 'Priya Sharma', email: 'priya@hrcrm.com', dept: 'Recruitment', desig: 'Senior HR Executive' },
      { name: 'Rahul Verma', email: 'rahul@hrcrm.com', dept: 'Talent Acquisition', desig: 'HR Executive' },
      { name: 'Anjali Singh', email: 'anjali@hrcrm.com', dept: 'Recruitment', desig: 'HR Manager' },
    ];

    for (const hr of hrUsersData) {
      await User.create({
        name: hr.name,
        email: hr.email,
        password: hash,
        role: 'hr',
        department: hr.dept,
        designation: hr.desig
      });
    }
    console.log(`${hrUsersData.length} HR users created.`);

    console.log('✅ Database successfully cleared of all mock data!');
    console.log('\n📋 Active Credentials:');
    console.log('  Admin:  admin@hrcrm.com  / Admin@123');
    console.log('  HR 1:   priya@hrcrm.com  / Admin@123');
    console.log('  HR 2:   rahul@hrcrm.com  / Admin@123');
    console.log('  HR 3:   anjali@hrcrm.com / Admin@123');

    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding/Clearing error:', err);
    process.exit(1);
  }
}

seed();
