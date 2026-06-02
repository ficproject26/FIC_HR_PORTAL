const mongoose = require('mongoose');

const CandidateProfileSchema = new mongoose.Schema({
  lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, unique: true },
  resume_url: { type: String, maxlength: 255 },
  skills: [{ type: String }],
  experience_years: { type: Number },
  current_salary: { type: Number },
  expected_salary: { type: Number },
  notice_period: { type: Number },
  education: { type: String },
  certifications: [{ type: String }],
  languages: [{ type: String }],
  portfolio_url: { type: String, maxlength: 255 },
  github_url: { type: String, maxlength: 255 },
  notes: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('CandidateProfile', CandidateProfileSchema);
