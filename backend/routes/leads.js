const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const Lead = require('../models/Lead');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const Performance = require('../models/Performance');
const CandidateProfile = require('../models/CandidateProfile');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { mapRowToLead } = require('../utils/leadImport');
const { attachLastStatusUpdates } = require('../utils/leadStatusUpdates');
const {
  bumpTodayPerformance,
  shouldCountCallOnStatusChange,
} = require('../utils/performanceHelpers');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, priority, assigned_to, source } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};

    // HR can only see their own leads
    if (req.user.role === 'hr') {
      query.assigned_to = req.user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assigned_to && req.user.role === 'admin') query.assigned_to = assigned_to;
    if (source) query.source = source;

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assigned_to', 'name avatar')
      .populate('created_by', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    let data = await Promise.all(leads.map(async l => {
      const pending_followups = await FollowUp.countDocuments({ lead_id: l._id, status: 'pending' });
      return {
        ...l,
        id: l._id,
        assigned_to_id: l.assigned_to ? (l.assigned_to._id || l.assigned_to) : null,
        assigned_to_name: l.assigned_to ? l.assigned_to.name : null,
        assigned_to_avatar: l.assigned_to ? l.assigned_to.avatar : null,
        created_by_name: l.created_by ? l.created_by.name : null,
        pending_followups
      };
    }));

    data = await attachLastStatusUpdates(data);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leads/pipeline/stats
router.get('/pipeline/stats', async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role === 'hr') {
      matchStage.assigned_to = new mongoose.Types.ObjectId(req.user.id);
    }

    const { source } = req.query;
    if (source) {
      matchStage.source = source;
    }

    const totalLeads = await Lead.countDocuments(matchStage);

    const stats = await Lead.aggregate([
      { $match: matchStage },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: {
          status: "$_id",
          count: 1,
          percentage: { $round: [{ $multiply: [{ $divide: ["$count", totalLeads || 1] }, 100] }, 1] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assigned_to', 'name email')
      .lean();

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const cp = await CandidateProfile.findOne({ lead_id: lead._id }).lean();
    if (cp) {
      Object.assign(lead, {
        resume_url: cp.resume_url, skills: cp.skills, experience_years: cp.experience_years,
        current_salary: cp.current_salary, expected_salary: cp.expected_salary,
        notice_period: cp.notice_period, education: cp.education, certifications: cp.certifications
      });
    }

    const followups = await FollowUp.find({ lead_id: lead._id })
      .populate('user_id', 'name')
      .sort({ scheduled_at: -1 }).lean();

    const followupsFormatted = followups.map(f => ({ ...f, created_by_name: f.user_id ? f.user_id.name : null }));

    const activities = await LeadActivity.find({ lead_id: lead._id })
      .populate('user_id', 'name')
      .sort({ created_at: -1 }).limit(20).lean();

    const activitiesFormatted = activities.map(a => ({
      ...a,
      id: a._id,
      user_name: a.user_id ? a.user_id.name : null,
    }));

    const statusHistory = activitiesFormatted.filter((a) => a.action === 'status_changed');
    const lastStatusUpdate = statusHistory[0] || null;

    res.json({
      success: true,
      data: { 
        ...lead,
        id: lead._id,
        assigned_to_name: lead.assigned_to ? lead.assigned_to.name : null,
        assigned_to_email: lead.assigned_to ? lead.assigned_to.email : null,
        followups: followupsFormatted,
        activities: activitiesFormatted,
        statusHistory,
        status_updated_at: lastStatusUpdate?.created_at || null,
        previous_status: lastStatusUpdate?.old_status || null,
        status_updated_to: lastStatusUpdate?.new_status || lead.status,
        status_updated_by_name: lastStatusUpdate?.user_name || null,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, source, status, priority, assigned_to, notes,
      salary_expectation, position_applied, experience_years, skills, location, linkedin_url } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Lead name is required' });

    const lead = await Lead.create({
      name, email, phone, company, source: source || 'manual', status: status || 'new', priority: priority || 'medium',
      assigned_to: req.user.role === 'admin' ? (assigned_to || null) : (assigned_to || req.user.id),
      notes, salary_expectation, position_applied,
      experience_years, skills, location, linkedin_url, created_by: req.user.id
    });

    await LeadActivity.create({
      lead_id: lead._id,
      user_id: req.user.id,
      action: 'created',
      description: `Lead created by ${req.user.name}`,
      new_status: 'new'
    });

    if (req.io) req.io.emit('lead_added', lead);

    res.status(201).json({ success: true, data: lead, message: 'Lead created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const oldLead = await Lead.findById(req.params.id);
    if (!oldLead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const b = req.body;
    const oldStatus = oldLead.status;
    const newStatus = b.status || oldLead.status;
    
    let updateData = {
      name: b.name || oldLead.name,
      email: b.email !== undefined ? b.email : oldLead.email,
      phone: b.phone !== undefined ? b.phone : oldLead.phone,
      company: b.company !== undefined ? b.company : oldLead.company,
      source: b.source || oldLead.source,
      status: newStatus,
      priority: b.priority || oldLead.priority,
      assigned_to: Object.prototype.hasOwnProperty.call(b, 'assigned_to')
        ? (b.assigned_to || null)
        : oldLead.assigned_to,
      notes: b.notes !== undefined ? b.notes : oldLead.notes,
      salary_expectation: b.salary_expectation !== undefined ? b.salary_expectation : oldLead.salary_expectation,
      position_applied: b.position_applied !== undefined ? b.position_applied : oldLead.position_applied,
      experience_years: b.experience_years !== undefined ? b.experience_years : oldLead.experience_years,
      skills: b.skills !== undefined ? b.skills : oldLead.skills,
      location: b.location !== undefined ? b.location : oldLead.location,
      linkedin_url: b.linkedin_url !== undefined ? b.linkedin_url : oldLead.linkedin_url
    };

    if (newStatus === 'converted' && oldStatus !== 'converted') {
      updateData.converted_at = new Date();
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (oldStatus !== newStatus) {
      const perfInc = {};
      if (newStatus === 'converted' && oldStatus !== 'converted') {
        perfInc.leads_converted = 1;
      }
      if (shouldCountCallOnStatusChange(newStatus, oldStatus)) {
        perfInc.calls_made = 1;
        perfInc.leads_contacted = 1;
      }
      if (Object.keys(perfInc).length) {
        await bumpTodayPerformance(req.user.id, perfInc);
      }

      await LeadActivity.create({
        lead_id: req.params.id,
        user_id: req.user.id,
        action: 'status_changed',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        old_status: oldStatus,
        new_status: newStatus
      });

      if (newStatus === 'followup') {
        const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await FollowUp.create({
          lead_id: req.params.id,
          user_id: req.user.id,
          scheduled_at: scheduledAt,
          type: 'call',
          notes: b.notes || 'Follow-up scheduled',
          status: 'pending'
        });
      }
    }

    if (req.io) req.io.emit('lead_updated', lead);

    res.json({ success: true, data: lead, message: 'Lead updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authorizeAdmin, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leads/bulk-upload
router.post('/bulk-upload', authorizeAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let data = [];

    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const fs = require('fs');
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      // Extract emails and phones using regex
      const emails = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g) || [];
      // basic 10 digit phones or common formats
      const phones = text.match(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}|\b\d{10}\b/g) || [];

      // Try to line them up or just create a lead for every pair
      const maxLen = Math.max(emails.length, phones.length);
      for (let i = 0; i < maxLen; i++) {
        if (emails[i] || phones[i]) {
          data.push({
            name: `Parsed Lead ${i + 1}`,
            email: emails[i] || '',
            phone: phones[i] || '',
            notes: 'Auto-extracted from PDF',
            source: 'pdf_bulk'
          });
        }
      }
    } else {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = xlsx.utils.sheet_to_json(sheet);
    }

    let inserted = 0, errors = [];

    for (const row of data) {
      try {
        const leadData = mapRowToLead(row, req.user.id);
        if (!leadData) {
          errors.push({ row: '(empty name)', error: 'Missing lead name' });
          continue;
        }
        await Lead.create(leadData);
        inserted++;
      } catch (e) {
        const normName = row.name || row.Name || row.Lead || row.lead || 'Unknown';
        errors.push({ row: normName, error: e.message });
      }
    }

    res.json({ success: true, message: `${inserted} leads imported successfully`, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
