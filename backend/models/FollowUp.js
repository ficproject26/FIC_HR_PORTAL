const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema({
  lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduled_at: { type: Date, required: true },
  completed_at: { type: Date },
  status: { type: String, enum: ['pending', 'completed', 'missed', 'rescheduled'], default: 'pending' },
  type: { type: String, enum: ['call', 'email', 'meeting', 'whatsapp', 'other'], default: 'call' },
  notes: { type: String },
  outcome: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('FollowUp', FollowUpSchema);
