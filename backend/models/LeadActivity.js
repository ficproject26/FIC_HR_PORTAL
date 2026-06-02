const mongoose = require('mongoose');

const LeadActivitySchema = new mongoose.Schema({
  lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, maxlength: 100 },
  description: { type: String },
  old_status: { type: String, maxlength: 30 },
  new_status: { type: String, maxlength: 30 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('LeadActivity', LeadActivitySchema);
