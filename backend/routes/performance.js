const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/performance - Get performance data
router.get('/', async (req, res) => {
  try {
    const { user_id, period = 'daily', date_from, date_to } = req.query;
    const targetId = req.user.role === 'hr' ? req.user.id : (user_id || null);

    let matchStage = {};
    if (targetId) matchStage.user_id = targetId;

    if (date_from || date_to) {
      matchStage.date = {};
      if (date_from) matchStage.date.$gte = new Date(date_from);
      if (date_to) matchStage.date.$lte = new Date(date_to);
    }

    let groupStageId = {};
    if (period === 'weekly') {
      groupStageId = { year: { $year: "$date" }, week: { $isoWeek: "$date" }, user_id: "$user_id" };
    } else if (period === 'monthly') {
      groupStageId = { year: { $year: "$date" }, month: { $month: "$date" }, user_id: "$user_id" };
    } else {
      groupStageId = { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, user_id: "$user_id" };
    }

    const data = await Performance.aggregate([
      { $match: matchStage },
      { 
        $group: {
          _id: groupStageId,
          calls_made: { $sum: "$calls_made" },
          emails_sent: { $sum: "$emails_sent" },
          follow_ups_completed: { $sum: "$follow_ups_completed" },
          leads_contacted: { $sum: "$leads_contacted" },
          leads_converted: { $sum: "$leads_converted" },
          meetings_scheduled: { $sum: "$meetings_scheduled" },
          target_calls: { $avg: "$target_calls" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          period: period === 'daily' ? "$_id.date" : (period === 'monthly' ? { $concat: [{ $toString: "$_id.year" }, "-", { $toString: "$_id.month" }] } : { $concat: [{ $toString: "$_id.year" }, "-W", { $toString: "$_id.week" }] }),
          user_name: "$user.name",
          calls_made: 1, emails_sent: 1, follow_ups_completed: 1, leads_contacted: 1, leads_converted: 1, meetings_scheduled: 1, target_calls: 1,
          conversion_rate: {
            $cond: [
              { $gt: ["$leads_contacted", 0] },
              { $round: [{ $multiply: [{ $divide: ["$leads_converted", "$leads_contacted"] }, 100] }, 2] },
              0
            ]
          },
          _id: 0
        }
      },
      { $sort: { period: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/performance/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userId = req.user.role === 'hr' ? req.user.id : req.query.user_id;

    let data;
    if (userId) {
      data = await Performance.find({ user_id: userId, date: { $gte: today, $lt: tomorrow } }).lean();
    } else {
      data = await Performance.find({ date: { $gte: today, $lt: tomorrow } })
        .populate('user_id', 'name')
        .sort({ calls_made: -1 })
        .lean();
      
      data = data.map(p => ({ ...p, user_name: p.user_id ? p.user_id.name : null }));
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/performance/log - Log performance activity
router.post('/log', async (req, res) => {
  try {
    const { calls_made, emails_sent, follow_ups_completed, leads_contacted, leads_converted, meetings_scheduled } = req.body;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const perf = await Performance.findOneAndUpdate(
      { user_id: req.user.id, date: { $gte: today, $lt: tomorrow } },
      { 
        $inc: { 
          calls_made: calls_made || 0,
          emails_sent: emails_sent || 0,
          follow_ups_completed: follow_ups_completed || 0,
          leads_contacted: leads_contacted || 0,
          leads_converted: leads_converted || 0,
          meetings_scheduled: meetings_scheduled || 0
        },
        $setOnInsert: { date: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: perf });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/performance/comparison - HR comparison
router.get('/comparison', authorizeAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const from = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = date_to ? new Date(date_to) : new Date();

    const hrUsers = await User.find({ role: 'hr', is_active: true }).lean();

    const data = await Promise.all(hrUsers.map(async u => {
      const perfs = await Performance.aggregate([
        { $match: { user_id: u._id, date: { $gte: from, $lte: to } } },
        { 
          $group: {
            _id: null,
            total_calls: { $sum: "$calls_made" },
            total_followups: { $sum: "$follow_ups_completed" },
            total_conversions: { $sum: "$leads_converted" },
            total_contacted: { $sum: "$leads_contacted" }
          }
        }
      ]);

      const perf = perfs[0] || { total_calls: 0, total_followups: 0, total_conversions: 0, total_contacted: 0 };
      const assigned_leads = await Lead.countDocuments({ assigned_to: u._id });

      return {
        id: u._id,
        name: u.name,
        avatar: u.avatar,
        department: u.department,
        total_calls: perf.total_calls,
        total_followups: perf.total_followups,
        total_conversions: perf.total_conversions,
        total_contacted: perf.total_contacted,
        assigned_leads,
        conversion_rate: perf.total_contacted > 0 ? ((perf.total_conversions / perf.total_contacted) * 100).toFixed(2) : 0
      };
    }));

    data.sort((a, b) => b.total_conversions - a.total_conversions);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
