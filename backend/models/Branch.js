const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 150 },
  code: { type: String, required: true, unique: true, maxlength: 20 },
  address: { type: String, maxlength: 300 },
  city: { type: String, maxlength: 100 },
  state: { type: String, maxlength: 100 },
  phone: { type: String, maxlength: 20 },
  email: { type: String, maxlength: 150 },
  manager_name: { type: String, maxlength: 150 },
  branch_type: { type: String, enum: ['Regional Office', 'Local Office'] },
  country: { type: String, maxlength: 100 },
  pincode: { type: String, maxlength: 20 },
  opening_date: { type: Date },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Branch', BranchSchema);
