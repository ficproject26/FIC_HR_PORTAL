const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Lead = require('../models/Lead');
const CandidateProfile = require('../models/CandidateProfile');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: './uploads/resumes/',
  filename: (req, file, cb) => cb(null, `resume_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// GET /api/candidates
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { status: 'converted' };
    if (req.user.role === 'hr') {
      query.assigned_to = req.user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assigned_to', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const data = await Promise.all(leads.map(async l => {
      const cp = await CandidateProfile.findOne({ lead_id: l._id }).lean() || {};
      return {
        id: l._id, name: l.name, email: l.email, phone: l.phone, company: l.company,
        status: l.status, position_applied: l.position_applied, experience_years: l.experience_years,
        skills: l.skills, linkedin_url: l.linkedin_url, created_at: l.created_at,
        resume_url: cp.resume_url, current_salary: cp.current_salary, expected_salary: cp.expected_salary,
        notice_period: cp.notice_period, education: cp.education, certifications: cp.certifications,
        portfolio_url: cp.portfolio_url, assigned_to_name: l.assigned_to ? l.assigned_to.name : null
      };
    }));

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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assigned_to', 'name').lean();
    if (!lead) return res.status(404).json({ success: false, message: 'Candidate not found' });

    const cp = await CandidateProfile.findOne({ lead_id: lead._id }).lean() || {};
    
    const data = {
      ...lead,
      ...cp,
      assigned_to_name: lead.assigned_to ? lead.assigned_to.name : null,
      _id: lead._id,
      id: lead._id
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/candidates/:id - Update candidate profile
router.put('/:id', async (req, res) => {
  try {
    const { skills, experience_years, current_salary, expected_salary, notice_period,
      education, certifications, languages, portfolio_url, github_url, notes } = req.body;

    const cp = await CandidateProfile.findOneAndUpdate(
      { lead_id: req.params.id },
      { 
        skills, experience_years, current_salary, expected_salary, notice_period,
        education, certifications, languages, portfolio_url, github_url, notes
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: cp, message: 'Candidate profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/candidates/:id/resume - Upload resume
router.post('/:id/resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    await CandidateProfile.findOneAndUpdate(
      { lead_id: req.params.id },
      { resume_url: resumeUrl },
      { upsert: true }
    );

    await Lead.findByIdAndUpdate(req.params.id, { resume_url: resumeUrl });

    res.json({ success: true, resumeUrl, message: 'Resume uploaded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
