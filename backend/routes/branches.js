const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate, authorizeAdmin);

// GET /api/branches — List all branches (with search & pagination)
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { code: regex },
        { city: regex },
        { state: regex },
        { manager_name: regex },
      ];
    }

    const total = await Branch.countDocuments(query);
    const branches = await Branch.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Look up sub-admin users for all branches
    const User = require('../models/User');
    const branchIds = branches.map(b => b._id);
    const subAdmins = await User.find({ branch: { $in: branchIds }, role: 'branchadmin' }).lean();
    const subAdminMap = {};
    subAdmins.forEach(u => {
      if (u.branch) subAdminMap[u.branch.toString()] = u.email;
    });

    const data = branches.map(b => ({
      id: b._id,
      name: b.name,
      code: b.code,
      address: b.address,
      city: b.city,
      state: b.state,
      phone: b.phone,
      email: b.email,
      manager_name: b.manager_name,
      branch_type: b.branch_type,
      country: b.country,
      pincode: b.pincode,
      opening_date: b.opening_date,
      is_active: b.is_active,
      created_at: b.created_at,
      sub_admin_email: subAdminMap[b._id.toString()] || '',
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get branches error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

  // POST /api/branches — Create a new branch and optional sub-admin
  router.post('/', async (req, res) => {
    try {
      const { name, code, address, city, state, phone, email, manager_name, branch_type, is_active, sub_admin_email, sub_admin_password, sub_admin_confirm_password, country, pincode, opening_date } = req.body;

      if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Name and code are required' });
      }

      // Validate sub-admin password match if provided
      if (sub_admin_email) {
        if (!sub_admin_password || sub_admin_password !== sub_admin_confirm_password) {
          return res.status(400).json({ success: false, message: 'Sub admin passwords do not match' });
        }
      }

      const existing = await Branch.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Branch code already exists' });
      }

      const branch = await Branch.create({
        name,
        code: code.toUpperCase(),
        address,
        city,
        state,
        phone,
        email,
        manager_name,
        branch_type,
        is_active: is_active !== undefined ? is_active : true,
        country,
        pincode,
        opening_date: opening_date ? new Date(opening_date) : undefined,
      });

      // Create sub-admin user if email provided
      if (sub_admin_email) {
        const bcrypt = require('bcryptjs');
        const User = require('../models/User');
        const hashedPass = await bcrypt.hash(sub_admin_password, 10);
        await User.create({
          name: manager_name || 'Branch Admin',
          email: sub_admin_email,
          password: hashedPass,
          role: 'branchadmin',
          is_active: true,
          branch: branch._id,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: {
          id: branch._id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          city: branch.city,
          state: branch.state,
          phone: branch.phone,
          email: branch.email,
          manager_name: branch.manager_name,
          is_active: branch.is_active,
          branch_type: branch.branch_type,
          country: branch.country,
          pincode: branch.pincode,
          opening_date: branch.opening_date,
          created_at: branch.created_at,
        },
      });
    } catch (err) {
      console.error('Create branch error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

// PUT /api/branches/:id — Update a branch
router.put('/:id', async (req, res) => {
  try {
    const { name, code, address, city, state, phone, email, manager_name, branch_type, country, pincode, opening_date, sub_admin_email, sub_admin_password, sub_admin_confirm_password } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required' });
    }

    if (sub_admin_email) {
      if (sub_admin_password && sub_admin_password !== sub_admin_confirm_password) {
        return res.status(400).json({ success: false, message: 'Sub admin passwords do not match' });
      }
    }

    // Check for duplicate code (excluding current branch)
    const existing = await Branch.findOne({ code: code.toUpperCase(), _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Branch code already exists' });
    }

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { 
        name, code: code.toUpperCase(), address, city, state, phone, email, manager_name, 
        branch_type, country, pincode, 
        ...(opening_date ? { opening_date: new Date(opening_date) } : { $unset: { opening_date: 1 } }) 
      },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Update or create sub-admin
    const User = require('../models/User');
    if (sub_admin_email) {
      let subAdmin = await User.findOne({ email: sub_admin_email });
      
      if (!subAdmin) {
        // Ensure email doesn't exist for another role
        const emailExists = await User.findOne({ email: sub_admin_email });
        if (emailExists) {
           return res.status(400).json({ success: false, message: 'Email already exists for another user' });
        }
        
        if (!sub_admin_password) {
           return res.status(400).json({ success: false, message: 'Password is required for new sub admin' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPass = await bcrypt.hash(sub_admin_password, 10);
        await User.create({
          name: manager_name || 'Branch Admin',
          email: sub_admin_email,
          password: hashedPass,
          role: 'branchadmin',
          is_active: true,
          branch: branch._id,
        });
      } else {
        // Update existing sub admin password if provided
        if (sub_admin_password) {
          const bcrypt = require('bcryptjs');
          subAdmin.password = await bcrypt.hash(sub_admin_password, 10);
        }
        subAdmin.name = manager_name || 'Branch Admin';
        subAdmin.branch = branch._id;
        if (subAdmin.role !== 'branchadmin') {
           subAdmin.role = 'branchadmin';
        }
        await subAdmin.save();
      }
    }

    // Find current sub-admin for response
    const subAdminUser = await User.findOne({ branch: branch._id, role: 'branchadmin' }).lean();

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        state: branch.state,
        phone: branch.phone,
        email: branch.email,
        manager_name: branch.manager_name,
        branch_type: branch.branch_type,
        country: branch.country,
        pincode: branch.pincode,
        opening_date: branch.opening_date,
        is_active: branch.is_active,
        sub_admin_email: subAdminUser ? subAdminUser.email : '',
      },
    });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/branches/:id/toggle — Toggle is_active
router.patch('/:id/toggle', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.is_active = !branch.is_active;
    await branch.save();

    res.json({
      success: true,
      message: `Branch ${branch.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { id: branch._id, is_active: branch.is_active },
    });
  } catch (err) {
    console.error('Toggle branch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/branches/:id — Delete a branch
router.delete('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
