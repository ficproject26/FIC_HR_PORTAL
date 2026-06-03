const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const Performance = require('../models/Performance');
const mongoose = require('mongoose');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { bumpTodayPerformance } = require('../utils/performanceHelpers');

const getBranchUserIds = async (req) => {
  if (req.user.role === 'branchadmin' && req.user.branch) {
    const users = await User.find({ branch: req.user.branch }).select('_id').lean();
    return users.map(u => u._id);
  }
  if (req.user.role === 'admin' && req.query.branch) {
    const users = await User.find({ branch: req.query.branch }).select('_id').lean();
    return users.map(u => u._id);
  }
  return null;
};

router.use(authenticate, authorizeAdmin);

// GET /api/admin/dashboard - Overview stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const branchUserIds = await getBranchUserIds(req);
    let hrQuery = { role: 'hr', is_active: true };
    let leadQuery = {};
    let convertedLeadQuery = { status: 'converted' };
    let followupQuery = { status: 'pending', scheduled_at: { $lt: new Date() } };
    let attendanceQuery = { date: { $gte: today, $lt: tomorrow }, login_time: { $ne: null } };

    if (branchUserIds) {
      hrQuery._id = { $in: branchUserIds };
      leadQuery.assigned_to = { $in: branchUserIds };
      convertedLeadQuery.assigned_to = { $in: branchUserIds };
      followupQuery.user_id = { $in: branchUserIds };
      attendanceQuery.user_id = { $in: branchUserIds };
    }

    const [hrCount, activeToday, totalLeads, convertedLeads, pendingFollowups] = await Promise.all([
      User.countDocuments(hrQuery),
      Attendance.distinct('user_id', attendanceQuery).then(docs => docs.length),
      Lead.countDocuments(leadQuery),
      Lead.countDocuments(convertedLeadQuery),
      FollowUp.countDocuments(followupQuery)
    ]);

    let monthlyConvMatch = { status: 'converted', converted_at: { $gte: sixMonthsAgo } };
    if (branchUserIds) monthlyConvMatch.assigned_to = { $in: branchUserIds };

    const monthlyConversions = await Lead.aggregate([
      { $match: monthlyConvMatch },
      { 
        $group: {
          _id: {
            year: { $year: "$converted_at" },
            month: { $month: "$converted_at" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $project: {
          month: { 
            $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 }
          },
          count: 1,
          _id: 0
      }}
    ]);

    let pipelineMatch = {};
    if (branchUserIds) pipelineMatch.assigned_to = { $in: branchUserIds };

    // Lead pipeline breakdown by status
    const leadPipeline = await Lead.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    let rankMatch = { role: 'hr', is_active: true, is_blocked: false };
    if (branchUserIds) rankMatch._id = { $in: branchUserIds };

    // HR performance rankings
    const hrRankingsAgg = await User.aggregate([
      { $match: rankMatch },
      { 
        $lookup: {
          from: 'leads',
          localField: '_id',
          foreignField: 'assigned_to',
          as: 'leads'
        }
      },
      {
        $lookup: {
          from: 'performances',
          localField: '_id',
          foreignField: 'user_id',
          as: 'performances'
        }
      },
      {
        $project: {
          _id: 1,
          id: "$_id",
          name: 1,
          email: 1,
          avatar: 1,
          department: 1,
          badges: 1,
          total_leads: { $size: "$leads" },
          converted_leads: { 
            $size: { 
              $filter: { input: "$leads", as: "lead", cond: { $eq: ["$$lead.status", "converted"] } } 
            } 
          },
          total_calls: { $sum: "$performances.calls_made" },
          total_followups: { $sum: "$performances.follow_ups_completed" }
        }
      },
      {
        $addFields: {
          conversion_rate: {
            $cond: [
              { $gt: ["$total_leads", 0] },
              { $multiply: [{ $divide: ["$converted_leads", "$total_leads"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { converted_leads: -1, total_calls: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalHR: hrCount,
          activeToday,
          totalLeads,
          convertedLeads,
          pendingFollowups,
          conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0
        },
        monthlyConversions,
        leadPipeline,
        hrRankings: hrRankingsAgg
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/hr-users - List all HR users
router.get('/hr-users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const skip = (page - 1) * limit;

    const branchUserIds = await getBranchUserIds(req);
    let query = { is_active: { $ne: false } };
    
    if (req.user.role === 'branchadmin') {
      query.role = 'hr';
      if (branchUserIds) query._id = { $in: branchUserIds };
    } else {
      query.role = { $in: ['hr', 'admin', 'branchadmin'] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.is_active = true;
      query.is_blocked = false;
    } else if (status === 'blocked') {
      query.is_blocked = true;
    }

    const [total, totalAdmin, totalHr] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, role: 'admin' }),
      User.countDocuments({ ...query, role: 'hr' })
    ]);
    const users = await User.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await Promise.all(users.map(async (u) => {
      const assigned_leads = await Lead.countDocuments({ assigned_to: u._id });
      const converted_leads = await Lead.countDocuments({ assigned_to: u._id, status: 'converted' });
      const attendance = await Attendance.findOne({ user_id: u._id, date: { $gte: today } });
      
      return {
        ...u,
        id: u._id,
        assigned_leads,
        converted_leads,
        today_login: attendance ? attendance.login_time : null,
        today_logout: attendance ? attendance.logout_time : null
      };
    }));

    res.json({
      success: true,
      data,
      stats: {
        totalAdmin,
        totalHr
      },
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

// POST /api/admin/hr-users - Create HR user
router.post('/hr-users', async (req, res) => {
  try {
    const { name, email, password, phone, department, designation, role = 'hr', branch, aadhar_no, pan_no } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed, role, phone, department, designation, aadhar_no, pan_no,
      branch: req.user.role === 'branchadmin' ? req.user.branch : branch || undefined
    });

    const userResponse = {
      id: user._id, name: user.name, email: user.email, role: user.role, 
      department: user.department, designation: user.designation
    };

    if (req.io) req.io.emit('hr_user_added', userResponse);

    res.status(201).json({ success: true, data: userResponse, message: 'HR user created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/hr-users/:id - Update HR user
router.put('/hr-users/:id', async (req, res) => {
  try {
    const { name, email, phone, department, designation, is_active, role, branch, aadhar_no, pan_no } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['hr', 'admin'] } },
      { name, email, phone, department, designation, is_active, role, branch: branch || undefined, aadhar_no, pan_no },
      { new: true, select: '-password' }
    );

    if (!user) return res.status(404).json({ success: false, message: 'HR user not found' });

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        id: user._id
      },
      message: 'HR user updated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/hr-users/:id/block - Block/Unblock HR
router.post('/hr-users/:id/block', async (req, res) => {
  try {
    const { block } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['hr', 'admin'] } },
      { is_blocked: block },
      { new: true, select: '_id name is_blocked' }
    );

    if (!user) return res.status(404).json({ success: false, message: 'HR user not found' });

    if (req.io) req.io.emit('hr_status_change', { userId: req.params.id, blocked: block });

    res.json({
      success: true,
      message: `HR user ${block ? 'blocked' : 'unblocked'} successfully`,
      data: {
        ...user.toObject(),
        id: user._id
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/hr-users/:id/reset-password
router.post('/hr-users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/hr-users/:id
router.delete('/hr-users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ success: true, message: 'HR user deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/monitoring - Real-time HR monitoring
router.get('/monitoring', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchUserIds = await getBranchUserIds(req);
    let hrMatch = { role: 'hr', is_active: true, is_blocked: false };
    if (branchUserIds) hrMatch._id = { $in: branchUserIds };

    const hrUsers = await User.find(hrMatch).lean();

    const data = await Promise.all(hrUsers.map(async (u) => {
      const attendance = await Attendance.findOne({ user_id: u._id, date: { $gte: today, $lt: tomorrow } });
      const todayLeads = await Lead.countDocuments({ assigned_to: u._id, created_at: { $gte: today, $lt: tomorrow } });
      const perf = await Performance.findOne({ user_id: u._id, date: { $gte: today, $lt: tomorrow } });

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        department: u.department,
        login_time: attendance ? attendance.login_time : null,
        logout_time: attendance ? attendance.logout_time : null,
        working_hours: attendance ? attendance.working_hours : 0,
        idle_time: attendance ? attendance.idle_time : 0,
        attendance_status: attendance ? attendance.status : null,
        last_login: u.last_login,
        today_leads: todayLeads,
        today_calls: perf ? perf.calls_made : 0,
        today_followups: perf ? perf.follow_ups_completed : 0,
        today_conversions: perf ? perf.leads_converted : 0
      };
    }));

    // Sort by login time descending
    data.sort((a, b) => {
      if (!a.login_time) return 1;
      if (!b.login_time) return -1;
      return new Date(b.login_time) - new Date(a.login_time);
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function buildAdminLeadFilter(filters = {}, branchUserIds = null) {
  const { search = '', status, priority, source, unassigned_only } = filters;
  const and = [];

  if (branchUserIds) {
    // If branch admin, only see leads assigned to their branch's users or unassigned leads
    and.push({
      $or: [
        { assigned_to: { $in: branchUserIds } },
        { assigned_to: null },
        { assigned_to: { $exists: false } }
      ]
    });
  }

  if (search) {
    and.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ],
    });
  }
  if (status) and.push({ status });
  if (priority) and.push({ priority });
  if (source) and.push({ source });
  if (unassigned_only === true || unassigned_only === 'true') {
    and.push({ $or: [{ assigned_to: null }, { assigned_to: { $exists: false } }] });
  }

  return and.length ? { $and: and } : {};
}

// GET /api/admin/leads/bulk-assign-preview — count leads for range assignment
router.get('/leads/bulk-assign-preview', async (req, res) => {
  try {
    const filters = {
      search: req.query.search || '',
      status: req.query.status || '',
      priority: req.query.priority || '',
      source: req.query.source || '',
      unassigned_only: req.query.unassigned_only,
    };
    const branchUserIds = await getBranchUserIds(req);
    const query = buildAdminLeadFilter(filters, branchUserIds);
    const total = await Lead.countDocuments(query);
    res.json({ success: true, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/leads/bulk-assign — assign lead ranges to HR (e.g. 1–50, 51–100)
router.post('/leads/bulk-assign', async (req, res) => {
  try {
    const { assignments = [], filters = {} } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one assignment range' });
    }

    const branchUserIds = await getBranchUserIds(req);
    const query = buildAdminLeadFilter(filters, branchUserIds);
    const leads = await Lead.find(query).sort({ created_at: -1 }).select('_id').lean();
    const total = leads.length;

    if (total === 0) {
      return res.status(400).json({ success: false, message: 'No leads match your filters' });
    }

    let updated = 0;
    const summary = [];
    const errors = [];

    for (const rule of assignments) {
      const from = parseInt(rule.from, 10);
      const to = parseInt(rule.to, 10);
      const hrId = rule.hr_id;

      if (!hrId) {
        errors.push({ from, to, error: 'Select an HR user' });
        continue;
      }
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
        errors.push({ from, to, error: 'Invalid range (use From ≤ To, starting at 1)' });
        continue;
      }

      const hr = await User.findOne({ _id: hrId, role: 'hr', is_active: true, is_blocked: false });
      if (!hr) {
        errors.push({ from, to, error: 'HR user not found or inactive' });
        continue;
      }

      const start = Math.min(from, total) - 1;
      const end = Math.min(to, total);
      const ids = leads.slice(start, end).map((l) => l._id);

      if (ids.length === 0) {
        errors.push({ from, to, error: 'Range is outside available leads' });
        continue;
      }

      const result = await Lead.updateMany({ _id: { $in: ids } }, { assigned_to: hrId });
      updated += result.modifiedCount;
      summary.push({ hr: hr.name, from, to, count: ids.length });
    }

    if (req.io) req.io.emit('leads_bulk_assigned', { updated, summary });

    res.json({
      success: true,
      message: `Assigned ${updated} leads across ${summary.length} range(s)`,
      total,
      updated,
      summary,
      errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/pending-followups - List pending followups
router.get('/pending-followups', async (req, res) => {
  try {
    const branchUserIds = await getBranchUserIds(req);
    let query = { status: { $in: ['pending', 'rescheduled'] }, scheduled_at: { $lt: new Date() } };
    if (branchUserIds) query.user_id = { $in: branchUserIds };

    const followUps = await FollowUp.find(query)
      .populate('lead_id', 'name phone email company status')
      .populate('user_id', 'name email')
      .sort({ scheduled_at: 1 })
      .lean();

    const formatted = followUps.map(f => {
      const row = { ...f, id: f._id.toString() };
      if (f.lead_id && typeof f.lead_id === 'object') {
        row.lead_name = f.lead_id.name;
        row.lead_phone = f.lead_id.phone;
        row.lead_email = f.lead_id.email;
        row.lead_company = f.lead_id.company;
        row.lead_status = f.lead_id.status;
        row.lead_id = f.lead_id._id.toString();
      }
      if (f.user_id && typeof f.user_id === 'object') {
        row.hr_name = f.user_id.name;
        row.hr_email = f.user_id.email;
        row.user_id = f.user_id._id.toString();
      }
      return row;
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Master list of available badges
const ALL_BADGES = [
  { id: 'employee_of_the_week', label: 'Employee of the Week', icon: '🌟' },
  { id: 'employee_of_the_month', label: 'Employee of the Month', icon: '🏆' },
  { id: 'best_caller', label: 'Best Caller', icon: '📞' },
  { id: 'best_consultant', label: 'Best Consultant', icon: '💼' },
  { id: 'fast_lead_closer', label: 'Fast Lead Closer', icon: '⚡' },
  { id: 'professional_attitude', label: 'Professional Attitude', icon: '🎯' },
  { id: 'active_bee', label: 'Active Bee', icon: '🐝' },
  { id: 'newbie', label: 'Newbie', icon: '🌱' },
];

// GET /api/admin/hr-consultant/:id - Detailed HR Consultant Stats
router.get('/hr-consultant/:id', async (req, res) => {
  try {
    const FollowUp = require('../models/FollowUp');
    const hrId = req.params.id;
    const user = await User.findById(hrId).populate('branch').select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'HR not found' });

    const leads = await Lead.find({ assigned_to: hrId });
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const followupLeads = leads.filter(l => l.status === 'followup').length;
    const exemptionLeads = leads.filter(l => l.status === 'exemption').length;
    const notInterestedLeads = leads.filter(l => l.status === 'not_interested').length;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    const attendances = await Attendance.find({ user_id: hrId });
    const totalLogins = attendances.length;

    const Performance = require('../models/Performance');
    const performances = await Performance.find({ user_id: hrId }).sort({ date: -1 }).limit(10);

    const followUps = await FollowUp.find({ user_id: hrId }).populate('lead_id', 'name phone email').sort({ scheduled_at: -1 }).limit(50);

    const userBadges = user.badges || [];
    const mappedBadges = ALL_BADGES.map(b => ({
      ...b,
      earned: userBadges.includes(b.id)
    }));

    const totalCalls = performances.reduce((sum, p) => sum + (p.calls_made || 0), 0);
    const totalEmails = performances.reduce((sum, p) => sum + (p.emails_sent || 0), 0);
    const totalMeetings = performances.reduce((sum, p) => sum + (p.meetings_scheduled || 0), 0);

    res.json({
      success: true,
      data: {
        user,
        leads: leads.slice(0, 50),
        stats: {
          totalLeads,
          convertedLeads,
          followupLeads,
          exemptionLeads,
          notInterestedLeads,
          conversionRate,
          totalLogins,
          totalBadges: userBadges.length,
          totalCalls,
          totalEmails,
          totalMeetings
        },
        badges: mappedBadges,
        attendances: attendances.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
        performances,
        followUps
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/hr-consultant/:id/allocate-leads
router.post('/hr-consultant/:id/allocate-leads', async (req, res) => {
  try {
    const hrId = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });
    
    const lines = text.split('\n');
    let leadsToInsert = [];
    
    for (let line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        leadsToInsert.push({
          name: parts[0].trim(),
          phone: parts[1].trim(),
          assigned_to: hrId,
          source: 'manual',
          status: 'new',
          priority: 'medium'
        });
      }
    }
    
    if (leadsToInsert.length > 0) {
      await Lead.insertMany(leadsToInsert);
    }
    
    res.json({ success: true, message: `Allocated ${leadsToInsert.length} leads successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/hr-consultant/:id/toggle-badge - Award/Revoke badge
router.put('/hr-consultant/:id/toggle-badge', async (req, res) => {
  try {
    const hrId = req.params.id;
    const { badgeId } = req.body;

    const user = await User.findById(hrId);
    if (!user) return res.status(404).json({ success: false, message: 'HR not found' });

    if (!user.badges) {
      user.badges = [];
    }

    const index = user.badges.indexOf(badgeId);
    if (index > -1) {
      user.badges.splice(index, 1); // Revoke
    } else {
      user.badges.push(badgeId); // Award
    }

    await user.save();

    res.json({ success: true, badges: user.badges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/follow-ups/:id - Update follow-up
router.put('/follow-ups/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid follow-up id' });
    }

    const { status, notes, outcome, scheduled_at, language_spoken } = req.body;
    const followUpId = new mongoose.Types.ObjectId(req.params.id);

    const existing = await FollowUp.findById(followUpId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }
    const hrUserId = existing.user_id;

    const update = {
      notes: notes !== undefined && notes !== '' ? notes : null,
      outcome: outcome !== undefined && outcome !== '' ? outcome : null,
    };

    let leadStatusToSet = null;
    const FOLLOWUP_LEAD_STATUS = {
      converted: 'converted',
      not_interested: 'not_interested',
      exemption: 'exemption',
    };

    if (status === 'rescheduled') {
      if (!scheduled_at) {
        return res.status(400).json({ success: false, message: 'Please select a new date and time to reschedule' });
      }
      update.status = 'rescheduled';
      const parsedSchedule = new Date(scheduled_at);
      if (Number.isNaN(parsedSchedule.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date and time' });
      }
      if (existing.scheduled_at && Math.abs(parsedSchedule.getTime() - new Date(existing.scheduled_at).getTime()) < 60000) {
        return res.status(400).json({ success: false, message: 'Choose a different date or time than the current schedule' });
      }
      update.scheduled_at = parsedSchedule;
      update.completed_at = null;
    } else if (status === 'converted' || status === 'not_interested' || status === 'exemption') {
      leadStatusToSet = FOLLOWUP_LEAD_STATUS[status];
      update.status = 'completed';
      update.completed_at = new Date();
      update.outcome = outcome || (status === 'converted' ? 'Converted' : status === 'exemption' ? 'Exemption' : 'Not interested');
    } else if (status === 'completed') {
      update.status = 'completed';
      update.completed_at = new Date();
    } else if (status === 'missed') {
      update.status = 'missed';
      update.completed_at = new Date();
    } else if (status) {
      update.status = status;
    }

    const followUp = await FollowUp.findByIdAndUpdate(
      followUpId,
      update,
      { new: true, runValidators: true }
    ).populate('lead_id', 'name phone email company status');

    if (status === 'completed' || status === 'converted' || status === 'not_interested' || status === 'exemption') {
      const inc = { follow_ups_completed: 1, leads_contacted: 1 };
      const fuType = followUp.type || existing.type;
      if (['call', 'whatsapp'].includes(fuType)) {
        inc.calls_made = 1;
      }
      if (status === 'converted') {
        inc.leads_converted = 1;
      }
      await bumpTodayPerformance(hrUserId, inc);

      if (leadStatusToSet && followUp.lead_id) {
        const leadId = followUp.lead_id._id || followUp.lead_id;
        const leadUpdate = { status: leadStatusToSet };
        if (status === 'converted') {
          leadUpdate.converted_at = new Date();
        }
        if (status === 'exemption' && language_spoken) {
          leadUpdate.language_spoken = language_spoken;
        }
        const oldLead = await Lead.findById(leadId).select('status').lean();
        await Lead.findByIdAndUpdate(leadId, leadUpdate);
        if (oldLead && oldLead.status !== leadStatusToSet) {
          try {
            await LeadActivity.create({
              lead_id: leadId,
              user_id: hrUserId,
              action: 'status_changed',
              description: `Status changed from ${oldLead.status} to ${leadStatusToSet} (follow-up via admin)`,
              old_status: oldLead.status,
              new_status: leadStatusToSet,
            });
          } catch (activityErr) {
            console.warn('Lead activity log failed:', activityErr.message);
          }
        }
      }
    }

    if (status === 'rescheduled' && followUp.lead_id) {
      try {
        await LeadActivity.create({
          lead_id: followUp.lead_id,
          user_id: hrUserId,
          action: 'follow_up_rescheduled',
          description: `Follow-up rescheduled to ${new Date(scheduled_at).toLocaleString()} (via admin)`,
        });
      } catch (activityErr) {
        console.warn('Lead activity log failed:', activityErr.message);
      }
    }

    res.json({ success: true, data: followUp, message: 'Follow-up updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

