const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const Lead = require('../models/Lead');
const Performance = require('../models/Performance');
const Attendance = require('../models/Attendance');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate, authorizeAdmin);

// GET /api/reports/leads
router.get('/leads', async (req, res) => {
  try {
    const { date_from, date_to, format } = req.query;
    const from = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = date_to ? new Date(date_to) : new Date();

    const leads = await Lead.find({ created_at: { $gte: from, $lte: to } })
      .populate('assigned_to', 'name')
      .sort({ created_at: -1 })
      .lean();

    const data = leads.map(l => ({
      name: l.name,
      email: l.email,
      phone: l.phone,
      company: l.company,
      status: l.status,
      priority: l.priority,
      source: l.source,
      position_applied: l.position_applied,
      experience_years: l.experience_years,
      location: l.location,
      assigned_to: l.assigned_to ? l.assigned_to.name : null,
      created_at: l.created_at,
      converted_at: l.converted_at
    }));

    if (format === 'excel') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Leads');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=leads_report.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/performance
router.get('/performance', async (req, res) => {
  try {
    const { date_from, date_to, format } = req.query;
    const from = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = date_to ? new Date(date_to) : new Date();

    const agg = await Performance.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { 
        $group: {
          _id: "$user_id",
          total_calls: { $sum: "$calls_made" },
          total_emails: { $sum: "$emails_sent" },
          total_followups: { $sum: "$follow_ups_completed" },
          total_contacted: { $sum: "$leads_contacted" },
          total_converted: { $sum: "$leads_converted" },
          working_days: { $addToSet: "$date" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          hr_name: "$user.name",
          email: "$user.email",
          department: "$user.department",
          total_calls: 1, total_emails: 1, total_followups: 1, total_contacted: 1, total_converted: 1,
          conversion_rate: {
            $cond: [
              { $gt: ["$total_contacted", 0] },
              { $round: [{ $multiply: [{ $divide: ["$total_converted", "$total_contacted"] }, 100] }, 2] },
              0
            ]
          },
          working_days: { $size: "$working_days" },
          _id: 0
        }
      },
      { $sort: { total_converted: -1 } }
    ]);

    if (format === 'excel') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(agg);
      xlsx.utils.book_append_sheet(wb, ws, 'Performance');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=performance_report.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.json({ success: true, data: agg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', async (req, res) => {
  try {
    const { date_from, date_to, format } = req.query;
    const from = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = date_to ? new Date(date_to) : new Date();

    const records = await Attendance.find({ date: { $gte: from, $lte: to } })
      .populate('user_id', 'name email department')
      .sort({ date: -1 })
      .lean();

    const data = records.map(a => ({
      hr_name: a.user_id ? a.user_id.name : null,
      email: a.user_id ? a.user_id.email : null,
      department: a.user_id ? a.user_id.department : null,
      date: a.date,
      login_time: a.login_time,
      logout_time: a.logout_time,
      working_hours: a.working_hours ? a.working_hours.toFixed(2) : 0,
      idle_time: a.idle_time ? a.idle_time.toFixed(2) : 0,
      status: a.status
    }));
    
    // Sort manually to match SQL behavior if necessary, or let DB sort handle it.
    data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) return dateB - dateA;
      return (a.hr_name || '').localeCompare(b.hr_name || '');
    });

    if (format === 'excel') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
