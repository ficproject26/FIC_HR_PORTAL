const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate);

const getBranchUserIds = async (req) => {
  if (req.user.role === 'branchadmin' && req.user.branch) {
    const users = await User.find({ branch: req.user.branch }).select('_id').lean();
    return users.map(u => u._id);
  }
  return null;
};

// GET /api/attendance - Get attendance records
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, user_id, date_from, date_to } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    const branchUserIds = await getBranchUserIds(req);

    if (req.user.role === 'hr') {
      query.user_id = req.user.id;
    } else if (branchUserIds) {
      if (user_id && branchUserIds.some(id => id.toString() === user_id)) {
        query.user_id = user_id;
      } else {
        query.user_id = { $in: branchUserIds };
      }
    } else if (user_id) {
      query.user_id = user_id;
    }

    if (date_from || date_to) {
      query.date = {};
      if (date_from) query.date.$gte = new Date(date_from);
      if (date_to) query.date.$lte = new Date(date_to);
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('user_id', 'name email avatar')
      .sort({ date: -1, login_time: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const data = records.map(r => ({
      ...r,
      user_name: r.user_id ? r.user_id.name : null,
      user_email: r.user_id ? r.user_id.email : null,
      avatar: r.user_id ? r.user_id.avatar : null
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

// GET /api/attendance/today - Today's attendance summary
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchUserIds = await getBranchUserIds(req);
    let hrMatch = { role: 'hr', is_active: true };
    if (branchUserIds) hrMatch._id = { $in: branchUserIds };

    const hrUsers = await User.find(hrMatch).lean();

    const data = await Promise.all(hrUsers.map(async u => {
      const att = await Attendance.findOne({ user_id: u._id, date: { $gte: today, $lt: tomorrow } }).lean();
      
      let current_status = 'absent';
      if (att) {
        if (att.login_time && !att.logout_time) current_status = 'online';
        else if (att.logout_time) current_status = 'offline';
      }

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        department: u.department,
        login_time: att ? att.login_time : null,
        logout_time: att ? att.logout_time : null,
        working_hours: att ? att.working_hours : 0,
        idle_time: att ? att.idle_time : 0,
        break_start_time: att ? att.break_start_time : null,
        status: att ? att.status : null,
        current_status
      };
    }));

    data.sort((a, b) => {
      if (!a.login_time) return 1;
      if (!b.login_time) return -1;
      return new Date(a.login_time) - new Date(b.login_time);
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attendance/my - Current user's attendance
router.get('/my', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      user_id: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    let total_days = 0, total_hours = 0, present_days = 0, late_days = 0, absent_days = 0;
    
    records.forEach(r => {
      total_days++;
      total_hours += (r.working_hours || 0);
      if (r.status === 'present') present_days++;
      if (r.status === 'late') late_days++;
      if (r.status === 'absent') absent_days++;
    });

    res.json({ 
      success: true, 
      data: records, 
      stats: {
        total_days,
        total_hours,
        avg_hours: total_days > 0 ? (total_hours / total_days) : 0,
        present_days,
        late_days,
        absent_days
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/clock-in
router.post('/clock-in', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let att = await Attendance.findOne({ user_id: req.user.id, date: { $gte: today, $lt: tomorrow } });

    if (att?.login_time && !att.logout_time) {
      return res.status(400).json({ success: false, message: 'You are already logged in' });
    }

    if (att?.logout_time) {
      return res.status(400).json({ success: false, message: 'You already clocked out for today' });
    }

    if (att) {
      att.login_time = new Date();
      att.logout_time = null;
      att.break_start_time = null;
      att.status = 'present';
      await att.save();
    } else {
      att = await Attendance.create({
        user_id: req.user.id,
        login_time: new Date(),
        date: new Date(),
        status: 'present',
        ip_address: req.ip,
      });
    }

    if (req.io) {
      req.io.emit('user_status_change', { userId: req.user.id, status: 'online' });
    }

    res.json({ success: true, message: 'Logged in successfully', data: att });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/toggle-break
router.post('/toggle-break', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const att = await Attendance.findOne({ user_id: req.user.id, date: { $gte: today, $lt: tomorrow } });
    if (!att || !att.login_time || att.logout_time) {
      return res.status(400).json({ success: false, message: 'Not in active session' });
    }

    if (att.break_start_time) {
      // End break
      const breakMs = new Date() - att.break_start_time;
      const breakHrs = breakMs / (1000 * 60 * 60);
      att.idle_time = (att.idle_time || 0) + breakHrs;
      
      const elapsedMs = new Date() - att.login_time;
      const maxIdleHrs = elapsedMs / (1000 * 60 * 60);
      att.idle_time = Math.min(att.idle_time, maxIdleHrs);
      
      att.break_start_time = null;
    } else {
      // Start break
      att.break_start_time = new Date();
    }
    
    await att.save();
    res.json({ success: true, break_start_time: att.break_start_time, idle_time: att.idle_time });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const att = await Attendance.findOne({ user_id: req.user.id, date: { $gte: today, $lt: tomorrow } });
    
    if (!att) return res.status(400).json({ success: false, message: 'No active session today' });
    if (att.logout_time) return res.status(400).json({ success: false, message: 'Already clocked out' });

    att.logout_time = new Date();
    const workedMs = att.logout_time - att.login_time;
    let workedHours = workedMs / (1000 * 60 * 60);
    
    if (att.break_start_time) {
      const breakMs = att.logout_time - att.break_start_time;
      att.idle_time = (att.idle_time || 0) + (breakMs / (1000 * 60 * 60));
      att.break_start_time = null;
    }
    
    if (att.idle_time) {
      workedHours -= att.idle_time;
    }
    
    att.working_hours = Math.max(0, workedHours);
    await att.save();

    if (req.io) {
      req.io.emit('user_offline', { userId: req.user.id });
    }

    res.json({ success: true, message: 'Clocked out successfully', data: att });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
