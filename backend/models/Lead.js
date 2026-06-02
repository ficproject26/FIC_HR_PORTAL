const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 150 },
  email: { type: String, maxlength: 150 },
  phone: { type: String, maxlength: 20 },
  company: { type: String, maxlength: 150 },
  source: { type: String, enum: ['manual', 'excel', 'website', 'referral', 'social'], default: 'manual' },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost', 'followup', 'exemption', 'not_interested'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  salary_expectation: { type: Number },
  position_applied: { type: String, maxlength: 150 },
  experience_years: { type: Number },
  skills: [{ type: String }],
  location: { type: String, maxlength: 150 },
  linkedin_url: { type: String, maxlength: 255 },
  resume_url: { type: String, maxlength: 255 },
  converted_at: { type: Date },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Lead', LeadSchema);
