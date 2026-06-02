const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  login_time: { type: Date },
  logout_time: { type: Date },
  working_hours: { type: Number, default: 0 },
  idle_time: { type: Number, default: 0 },
  break_start_time: { type: Date, default: null },
  status: { type: String, enum: ['present', 'absent', 'late', 'half_day'], default: 'present' },
  date: { type: Date, default: Date.now },
  ip_address: { type: String, maxlength: 50 },
  notes: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Attendance', AttendanceSchema);
