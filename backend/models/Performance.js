const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  calls_made: { type: Number, default: 0 },
  emails_sent: { type: Number, default: 0 },
  follow_ups_completed: { type: Number, default: 0 },
  leads_contacted: { type: Number, default: 0 },
  leads_converted: { type: Number, default: 0 },
  meetings_scheduled: { type: Number, default: 0 },
  target_calls: { type: Number, default: 20 },
  target_conversions: { type: Number, default: 5 },
  notes: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

PerformanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Performance', PerformanceSchema);
