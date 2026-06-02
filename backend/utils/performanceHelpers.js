const mongoose = require('mongoose');
const Performance = require('../models/Performance');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');

/** HR pipeline statuses — any change to one of these counts as a call for the day */
const HR_PIPELINE_STATUSES = ['new', 'followup', 'exemption', 'converted', 'not_interested'];

/** Also used for admin / legacy statuses that imply contact */
const CONTACT_STATUSES = [...HR_PIPELINE_STATUSES, 'contacted', 'qualified'];

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

async function bumpTodayPerformance(userId, increments) {
  const inc = {};
  for (const [key, value] of Object.entries(increments)) {
    if (value) inc[key] = value;
  }
  if (!Object.keys(inc).length) return null;

  const { today, tomorrow } = getTodayRange();
  return Performance.findOneAndUpdate(
    { user_id: userId, date: { $gte: today, $lt: tomorrow } },
    {
      $inc: inc,
      $setOnInsert: { user_id: userId, date: today },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function countTodayCalls(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const { today, tomorrow } = getTodayRange();

  const [perf, completedCallFollowUps, statusContacts] = await Promise.all([
    Performance.findOne({ user_id: uid, date: { $gte: today, $lt: tomorrow } }).lean(),
    FollowUp.countDocuments({
      user_id: uid,
      status: 'completed',
      type: { $in: ['call', 'whatsapp'] },
      completed_at: { $gte: today, $lt: tomorrow },
    }),
    LeadActivity.countDocuments({
      user_id: uid,
      created_at: { $gte: today, $lt: tomorrow },
      action: 'status_changed',
      new_status: { $in: HR_PIPELINE_STATUSES },
    }),
  ]);

  return Math.max(perf?.calls_made || 0, completedCallFollowUps, statusContacts);
}

function shouldCountCallOnStatusChange(newStatus, oldStatus) {
  return oldStatus !== newStatus && HR_PIPELINE_STATUSES.includes(newStatus);
}

module.exports = {
  HR_PIPELINE_STATUSES,
  CONTACT_STATUSES,
  getTodayRange,
  bumpTodayPerformance,
  countTodayCalls,
  shouldCountCallOnStatusChange,
};
