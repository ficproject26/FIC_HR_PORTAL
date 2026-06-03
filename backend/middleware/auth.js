const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.is_active || user.is_blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked or inactive' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      branch: user.branch ? user.branch.toString() : null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!['admin', 'superadmin', 'branchadmin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: admin only' });
  }
  next();
};

const authorizeHR = (req, res, next) => {
  if (!['admin', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'HR access required' });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin, authorizeHR };
