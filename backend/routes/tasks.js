const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const getBranchUserIds = async (req) => {
  if (req.user.role === 'branchadmin' && req.user.branch) {
    const users = await User.find({ branch: req.user.branch }).select('_id').lean();
    return users.map(u => u._id);
  }
  return null;
};

function formatTask(t) {
  const assigned = t.user_id;
  const creator = t.created_by;
  return {
    ...t,
    id: t._id,
    lead_id: t.lead_id?._id || t.lead_id || null,
    lead_name: t.lead_id?.name || null,
    assigned_to_name: assigned?.name || null,
    created_by_name: creator?.name || null,
  };
}

async function buildListQuery(req) {
  const query = {};
  const branchUserIds = await getBranchUserIds(req);

  if (req.user.role === 'hr') {
    query.user_id = new mongoose.Types.ObjectId(req.user.id);
  } else if (branchUserIds) {
    if (req.query.user_id && branchUserIds.some(id => id.toString() === req.query.user_id)) {
      query.user_id = new mongoose.Types.ObjectId(req.query.user_id);
    } else {
      query.user_id = { $in: branchUserIds.map(id => new mongoose.Types.ObjectId(id)) };
    }
  } else if (req.query.user_id) {
    query.user_id = new mongoose.Types.ObjectId(req.query.user_id);
  }
  return query;
}

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = await buildListQuery(req);
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('lead_id', 'name')
      .populate('user_id', 'name email')
      .populate('created_by', 'name')
      .sort({ due_date: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: tasks.map(formatTask),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks — admin assigns to HR; HR cannot create
router.post('/', async (req, res) => {
  try {
    if (!['admin', 'superadmin', 'branchadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only admin or branch admin can create tasks for HR' });
    }

    const { title, description, priority, due_date, lead_id, user_id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'Please select an HR user to assign this task' });
    }

    const hrUser = await User.findOne({
      _id: user_id,
      role: 'hr',
      is_active: true,
      is_blocked: false,
    }).lean();

    if (!hrUser) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive HR user' });
    }

    if (req.user.role === 'branchadmin' && req.user.branch && hrUser.branch?.toString() !== req.user.branch.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot assign tasks to HR from another branch' });
    }

    const task = await Task.create({
      user_id: hrUser._id,
      title,
      description,
      priority: priority || 'medium',
      due_date: due_date || null,
      lead_id: lead_id || null,
      created_by: req.user.id,
    });

    const notification = await Notification.create({
      user_id: hrUser._id,
      title: 'New task assigned',
      message: `${title}${due_date ? ` — due ${new Date(due_date).toLocaleString()}` : ''}`,
      type: 'info',
      related_id: task._id,
      related_type: 'task',
    });

    if (req.io) {
      req.io.to(`user_${hrUser._id}`).emit('new_notification', notification);
      req.io.to(`user_${hrUser._id}`).emit('task_assigned', { taskId: task._id, title });
    }

    const populated = await Task.findById(task._id)
      .populate('user_id', 'name email')
      .populate('created_by', 'name')
      .populate('lead_id', 'name')
      .lean();

    res.status(201).json({
      success: true,
      data: formatTask(populated),
      message: `Task assigned to ${hrUser.name}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'hr') {
      filter.user_id = req.user.id;
    }

    const existing = await Task.findOne(filter);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { title, description, status, priority, due_date } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.due_date = due_date;

    if (status === 'completed') {
      updateData.completed_at = new Date();
    } else if (status && status !== 'completed') {
      updateData.completed_at = null;
    }

    const task = await Task.findByIdAndUpdate(existing._id, updateData, { new: true })
      .populate('lead_id', 'name')
      .populate('user_id', 'name email')
      .populate('created_by', 'name')
      .lean();

    res.json({ success: true, data: formatTask(task), message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'hr') {
      filter.user_id = req.user.id;
    }

    const task = await Task.findOneAndDelete(filter);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tasks/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseQuery = await buildListQuery(req);
    const query = {
      ...baseQuery,
      due_date: { $gte: today, $lt: tomorrow },
    };

    const tasks = await Task.find(query)
      .populate('lead_id', 'name')
      .populate('user_id', 'name')
      .sort({ priority: -1, due_date: 1 })
      .lean();

    res.json({ success: true, data: tasks.map(formatTask) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
