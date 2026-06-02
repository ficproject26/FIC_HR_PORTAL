const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Attendance = require('../models/Attendance');
const LeadActivity = require('../models/LeadActivity');
const { authenticate } = require('../middleware/auth');
const { buildHrReportData } = require('../utils/hrReportData');
const { bumpTodayPerformance } = require('../utils/performanceHelpers');

const FOLLOWUP_LEAD_STATUS = {
  converted: 'converted',
  not_interested: 'not_interested',
};

router.use(authenticate);

function formatFollowUpResponse(doc) {
  const row = doc.toObject ? doc.toObject() : { ...doc };
  row.id = row._id?.toString();
  if (row.lead_id && typeof row.lead_id === 'object') {
    row.lead_name = row.lead_id.name;
    row.lead_phone = row.lead_id.phone;
    row.lead_email = row.lead_id.email;
    row.lead_company = row.lead_id.company;
    row.lead_status = row.lead_id.status;
    row.lead_position_applied = row.lead_id.position_applied;
    row.lead_id = row.lead_id._id?.toString();
  }
  return row;
}

// GET /api/hr/dashboard - HR dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const data = await buildHrReportData(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/reports - HR reports (weekly performance + status breakdown)
router.get('/reports', async (req, res) => {
  try {
    const data = await buildHrReportData(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/follow-ups - Get follow-ups for HR
router.get('/follow-ups', async (req, res) => {
  try {
    const { status, date_from, date_to, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { user_id: new mongoose.Types.ObjectId(req.user.id) };

    const now = new Date();
    if (status === 'pending') {
      query.status = { $in: ['pending', 'rescheduled'] };
      query.scheduled_at = { $gte: now };
    } else if (status === 'missed') {
      query.$or = [
        { user_id: query.user_id, status: 'missed' },
        { user_id: query.user_id, status: { $in: ['pending', 'rescheduled'] }, scheduled_at: { $lt: now } }
      ];
      delete query.user_id;
    } else if (status) {
      query.status = status;
    }
    if (date_from || date_to) {
      query.scheduled_at = {};
      if (date_from) query.scheduled_at.$gte = new Date(date_from);
      if (date_to) query.scheduled_at.$lte = new Date(date_to);
    }

    const total = await FollowUp.countDocuments(query);
    const followUps = await FollowUp.find(query)
      .populate('lead_id', 'name phone email company status position_applied')
      .sort({ scheduled_at: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formattedFollowUps = followUps.map((f) => formatFollowUpResponse(f));

    res.json({
      success: true,
      data: formattedFollowUps,
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

// POST /api/hr/follow-ups - Schedule follow-up
router.post('/follow-ups', async (req, res) => {
  try {
    const { lead_id, scheduled_at, type, notes } = req.body;

    if (!lead_id || !scheduled_at) {
      return res.status(400).json({ success: false, message: 'Lead and scheduled time required' });
    }

    const followUp = await FollowUp.create({
      lead_id,
      user_id: req.user.id,
      scheduled_at,
      type: type || 'call',
      notes
    });

    await LeadActivity.create({
      lead_id,
      user_id: req.user.id,
      action: 'follow_up_scheduled',
      description: `Follow-up scheduled for ${new Date(scheduled_at).toLocaleString()}`
    });

    if (req.io) req.io.emit('follow_up_scheduled', { userId: req.user.id, followUp });

    res.status(201).json({ success: true, data: followUp, message: 'Follow-up scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/hr/follow-ups/:id - Update follow-up
router.put('/follow-ups/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid follow-up id' });
    }

    const { status, notes, outcome, scheduled_at } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const followUpId = new mongoose.Types.ObjectId(req.params.id);

    const existing = await FollowUp.findOne({ _id: followUpId, user_id: userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    const update = {
      notes: notes !== undefined && notes !== '' ? notes : null,
      outcome: outcome !== undefined && outcome !== '' ? outcome : null,
    };

    let leadStatusToSet = null;

    if (status === 'rescheduled') {
      if (!scheduled_at) {
        return res.status(400).json({
          success: false,
          message: 'Please select a new date and time to reschedule',
        });
      }
      update.status = 'rescheduled';
      const parsedSchedule = new Date(scheduled_at);
      if (Number.isNaN(parsedSchedule.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date and time' });
      }
      if (
        existing.scheduled_at &&
        Math.abs(parsedSchedule.getTime() - new Date(existing.scheduled_at).getTime()) < 60000
      ) {
        return res.status(400).json({
          success: false,
          message: 'Choose a different date or time than the current schedule',
        });
      }
      update.scheduled_at = parsedSchedule;
      update.completed_at = null;
    } else if (status === 'converted' || status === 'not_interested') {
      leadStatusToSet = FOLLOWUP_LEAD_STATUS[status];
      update.status = 'completed';
      update.completed_at = new Date();
      update.outcome = outcome || (status === 'converted' ? 'Converted' : 'Not interested');
    } else if (status === 'completed') {
      update.status = 'completed';
      update.completed_at = new Date();
    } else if (status === 'missed') {
      update.status = 'missed';
      update.completed_at = new Date();
    } else if (status) {
      update.status = status;
    }

    const followUp = await FollowUp.findOneAndUpdate(
      { _id: followUpId, user_id: userId },
      update,
      { new: true, runValidators: true }
    ).populate('lead_id', 'name phone email company status');

    if (status === 'completed' || status === 'converted' || status === 'not_interested') {
      const inc = { follow_ups_completed: 1, leads_contacted: 1 };
      const fuType = followUp.type || existing.type;
      if (['call', 'whatsapp'].includes(fuType)) {
        inc.calls_made = 1;
      }
      if (status === 'converted') {
        inc.leads_converted = 1;
      }
      await bumpTodayPerformance(userId, inc);

      if (leadStatusToSet && followUp.lead_id) {
        const leadId = followUp.lead_id._id || followUp.lead_id;
        const leadUpdate = { status: leadStatusToSet };
        if (status === 'converted') {
          leadUpdate.converted_at = new Date();
        }
        const oldLead = await Lead.findById(leadId).select('status').lean();
        await Lead.findByIdAndUpdate(leadId, leadUpdate);
        if (oldLead && oldLead.status !== leadStatusToSet) {
          try {
            await LeadActivity.create({
              lead_id: leadId,
              user_id: userId,
              action: 'status_changed',
              description: `Status changed from ${oldLead.status} to ${leadStatusToSet} (follow-up)`,
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
          user_id: userId,
          action: 'follow_up_rescheduled',
          description: `Follow-up rescheduled to ${new Date(scheduled_at).toLocaleString()}`,
        });
      } catch (activityErr) {
        console.warn('Lead activity log failed:', activityErr.message);
      }
    }

    const formatted = formatFollowUpResponse(followUp);
    const message =
      status === 'rescheduled'
        ? `Rescheduled to ${new Date(formatted.scheduled_at).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : status === 'converted'
          ? 'Follow-up completed — lead marked as converted'
          : status === 'not_interested'
            ? 'Follow-up completed — lead marked as not interested'
            : status === 'completed'
              ? 'Follow-up completed'
              : 'Follow-up updated';

    res.json({ success: true, data: formatted, message });
  } catch (err) {
    console.error('Follow-up update error:', err);
    res.status(500).json({ success: false, message: 'Server error', detail: err.message });
  }
});

// GET /api/hr/calendar - Calendar view of follow-ups
router.get('/calendar', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const monthIndex = m - 1;

    const startDate = new Date(y, monthIndex, 1, 0, 0, 0, 0);
    const endDate = new Date(y, monthIndex + 1, 0, 23, 59, 59, 999);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const followUps = await FollowUp.find({
      user_id: userId,
      scheduled_at: { $gte: startDate, $lte: endDate },
    })
      .populate('lead_id', 'name phone')
      .sort({ scheduled_at: 1 });

    const formattedFollowUps = followUps.map((f) => formatFollowUpResponse(f));

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    weekAhead.setHours(23, 59, 59, 999);

    const upcomingFollowUps = await FollowUp.find({
      user_id: userId,
      status: { $in: ['pending', 'rescheduled'] },
      scheduled_at: { $gte: now, $lte: weekAhead },
    })
      .populate('lead_id', 'name phone')
      .sort({ scheduled_at: 1 })
      .limit(20);

    const upcoming = upcomingFollowUps.map((f) => formatFollowUpResponse(f));

    res.json({ success: true, data: formattedFollowUps, upcoming });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/attendance - Monthly attendance records
router.get('/attendance', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      user_id: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/hr/kpi-details - Get detailed list for KPI cards
router.get('/kpi-details', async (req, res) => {
  try {
    const { type } = req.query;
    const uid = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (type === 'assigned_leads') {
      const leads = await Lead.find({ assigned_to: uid })
        .sort({ created_at: -1 })
        .limit(100)
        .lean();
      return res.json({ success: true, data: leads.map(l => ({ ...l, id: l._id.toString() })) });
    }

    if (type === 'pending_followups') {
      const followUps = await FollowUp.find({ user_id: uid, status: { $in: ['pending', 'rescheduled'] } })
        .populate('lead_id', 'name phone email company status')
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
        return row;
      });
      return res.json({ success: true, data: formatted });
    }

    if (type === 'today_followups') {
      const followUps = await FollowUp.find({
        user_id: uid,
        status: { $in: ['pending', 'rescheduled'] },
        scheduled_at: { $gte: today, $lt: tomorrow }
      })
        .populate('lead_id', 'name phone email company status')
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
        return row;
      });
      return res.json({ success: true, data: formatted });
    }

    if (type === 'calls_today') {
      // Find leads that have completed call follow-ups today OR status changed today
      const [completedCallFollowUps, statusActivities] = await Promise.all([
        FollowUp.find({
          user_id: uid,
          status: 'completed',
          type: { $in: ['call', 'whatsapp'] },
          completed_at: { $gte: today, $lt: tomorrow }
        })
          .populate('lead_id', 'name phone email company status')
          .lean(),
        LeadActivity.find({
          user_id: uid,
          created_at: { $gte: today, $lt: tomorrow },
          action: 'status_changed',
          new_status: { $in: ['new', 'followup', 'exemption', 'converted', 'not_interested'] }
        })
          .populate('lead_id', 'name phone email company status')
          .lean()
      ]);

      const leadsMap = new Map();
      
      completedCallFollowUps.forEach(f => {
        if (f.lead_id && typeof f.lead_id === 'object') {
          leadsMap.set(f.lead_id._id.toString(), {
            id: f.lead_id._id.toString(),
            name: f.lead_id.name,
            phone: f.lead_id.phone,
            email: f.lead_id.email,
            company: f.lead_id.company,
            status: f.lead_id.status,
            type: 'Follow-up Call',
            time: f.completed_at
          });
        }
      });

      statusActivities.forEach(a => {
        if (a.lead_id && typeof a.lead_id === 'object') {
          leadsMap.set(a.lead_id._id.toString(), {
            id: a.lead_id._id.toString(),
            name: a.lead_id.name,
            phone: a.lead_id.phone,
            email: a.lead_id.email,
            company: a.lead_id.company,
            status: a.lead_id.status,
            type: 'Status Update',
            time: a.created_at
          });
        }
      });

      return res.json({ success: true, data: Array.from(leadsMap.values()) });
    }

    if (type === 'converted') {
      const leads = await Lead.find({ assigned_to: uid, status: 'converted' })
        .sort({ converted_at: -1 })
        .limit(100)
        .lean();
      return res.json({ success: true, data: leads.map(l => ({ ...l, id: l._id.toString() })) });
    }

    res.status(400).json({ success: false, message: 'Invalid KPI type' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
