const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Performance = require('../models/Performance');
const Attendance = require('../models/Attendance');
const { countTodayCalls } = require('./performanceHelpers');

const STATUS_LABELS = {
  new: 'New',
  followup: 'Follow-up',
  exemption: 'Exemption',
  converted: 'Converted',
  not_interested: 'Not Interested',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  lost: 'Lost',
};

function dayKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

async function buildHrReportData(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const days = getLast7Days();
  const rangeStart = days[0];
  const rangeEnd = new Date(days[days.length - 1]);
  rangeEnd.setHours(23, 59, 59, 999);

  const [
    assignedLeads,
    pendingFollowups,
    todayFollowups,
    performance,
    attendance,
    conversionStatsAgg,
    perfRecords,
    completedFollowUps,
    convertedByDay,
    statusAgg,
  ] = await Promise.all([
    Lead.countDocuments({ assigned_to: uid }),
    FollowUp.countDocuments({ user_id: uid, status: 'pending' }),
    FollowUp.countDocuments({
      user_id: uid,
      status: 'pending',
      scheduled_at: { $gte: today, $lt: tomorrow },
    }),
    Performance.findOne({ user_id: uid, date: { $gte: today, $lt: tomorrow } }).lean(),
    Attendance.findOne({ user_id: uid, date: { $gte: today, $lt: tomorrow } }).lean(),
    Lead.aggregate([
      { $match: { assigned_to: uid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          new_leads: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          followup: { $sum: { $cond: [{ $eq: ['$status', 'followup'] }, 1, 0] } },
          exemption: { $sum: { $cond: [{ $eq: ['$status', 'exemption'] }, 1, 0] } },
          not_interested: { $sum: { $cond: [{ $eq: ['$status', 'not_interested'] }, 1, 0] } },
        },
      },
    ]),
    Performance.find({ user_id: uid, date: { $gte: rangeStart, $lte: rangeEnd } })
      .sort({ date: 1 })
      .lean(),
    FollowUp.aggregate([
      {
        $match: {
          user_id: uid,
          status: 'completed',
          completed_at: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completed_at' } },
          follow_ups_completed: { $sum: 1 },
          calls_made: { $sum: { $cond: [{ $in: ['$type', ['call', 'whatsapp']] }, 1, 0] } },
        },
      },
    ]),
    Lead.aggregate([
      {
        $match: {
          assigned_to: uid,
          converted_at: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$converted_at' } },
          leads_converted: { $sum: 1 },
        },
      },
    ]),
    Lead.aggregate([
      { $match: { assigned_to: uid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const conversionStats = conversionStatsAgg[0] || {
    total: 0,
    converted: 0,
    new_leads: 0,
    followup: 0,
    exemption: 0,
    not_interested: 0,
  };

  const perfByDay = {};
  perfRecords.forEach((p) => {
    perfByDay[dayKey(p.date)] = p;
  });

  const fuByDay = Object.fromEntries(
    completedFollowUps.map((r) => [r._id, r])
  );
  const convByDay = Object.fromEntries(
    convertedByDay.map((r) => [r._id, r.leads_converted])
  );

  const weeklyPerformance = days.map((d) => {
    const key = dayKey(d);
    const perf = perfByDay[key] || {};
    const fu = fuByDay[key] || {};
    return {
      date: key,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calls_made: Math.max(perf.calls_made || 0, fu.calls_made || 0),
      follow_ups_completed: Math.max(perf.follow_ups_completed || 0, fu.follow_ups_completed || 0),
      leads_converted: Math.max(perf.leads_converted || 0, convByDay[key] || 0),
    };
  });

  const statusBreakdown = statusAgg.map((s) => ({
    status: s._id,
    name: STATUS_LABELS[s._id] || s._id.replace(/_/g, ' '),
    value: s.count,
  }));

  const callsToday = await countTodayCalls(userId);
  const todayPerformance = {
    ...(performance || {}),
    calls_made: callsToday,
  };

  return {
    stats: {
      assignedLeads,
      pendingFollowups,
      todayFollowups,
      todayPerformance,
      attendance,
    },
    conversionStats,
    weeklyPerformance,
    statusBreakdown,
    pipelineSummary: statusBreakdown,
  };
}

module.exports = { buildHrReportData, STATUS_LABELS };
