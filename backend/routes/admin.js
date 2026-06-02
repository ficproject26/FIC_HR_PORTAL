const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Performance = require('../models/Performance');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

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

    const [hrCount, activeToday, totalLeads, convertedLeads, pendingFollowups] = await Promise.all([
      User.countDocuments({ role: 'hr', is_active: true }),
      Attendance.distinct('user_id', { date: { $gte: today, $lt: tomorrow }, login_time: { $ne: null } }).then(docs => docs.length),
      Lead.countDocuments(),
      Lead.countDocuments({ status: 'converted' }),
      FollowUp.countDocuments({ status: 'pending', scheduled_at: { $lt: new Date() } })
    ]);

    const monthlyConversions = await Lead.aggregate([
      { $match: { status: 'converted', converted_at: { $gte: sixMonthsAgo } } },
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

    // Lead pipeline breakdown by status
    const leadPipeline = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    // HR performance rankings
    const hrRankingsAgg = await User.aggregate([
      { $match: { role: 'hr', is_active: true, is_blocked: false } },
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
          avatar: 1,
          department: 1,
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

    let query = { role: { $in: ['hr', 'admin'] }, is_active: { $ne: false } };

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
    const { name, email, password, phone, department, designation, role = 'hr' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed, role, phone, department, designation
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
    const { name, email, phone, department, designation, is_active, role } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['hr', 'admin'] } },
      { name, email, phone, department, designation, is_active, role },
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

    const hrUsers = await User.find({ role: 'hr', is_active: true, is_blocked: false }).lean();

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

function buildAdminLeadFilter(filters = {}) {
  const { search = '', status, priority, source, unassigned_only } = filters;
  const and = [];

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
    const query = buildAdminLeadFilter(filters);
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

    const query = buildAdminLeadFilter(filters);
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
    const followUps = await FollowUp.find({ status: { $in: ['pending', 'rescheduled'] }, scheduled_at: { $lt: new Date() } })
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

module.exports = router;

