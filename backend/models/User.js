const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  password: { type: String, required: true, maxlength: 255 },
  role: { type: String, required: true, enum: ['admin', 'hr'], default: 'hr' },
  phone: { type: String, maxlength: 20 },
  avatar: { type: String, maxlength: 255 },
  department: { type: String, maxlength: 100 },
  designation: { type: String, maxlength: 100 },
  is_active: { type: Boolean, default: true },
  is_blocked: { type: Boolean, default: false },
  last_login: { type: Date },
  badges: { type: [String], default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', UserSchema);
