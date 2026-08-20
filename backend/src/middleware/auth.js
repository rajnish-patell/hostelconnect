const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Verify user still exists and is active in the database
    const { id, role } = decoded;
    let userActive = false;

    if (role === 'superadmin') {
      const admin = await prisma.superAdmin.findUnique({ where: { id }, select: { isActive: true } });
      userActive = admin?.isActive === true;
    } else if (role === 'school') {
      const school = await prisma.school.findUnique({ where: { id }, select: { isActive: true } });
      userActive = school?.isActive === true;
    } else if (role === 'student') {
      const student = await prisma.student.findUnique({ where: { id }, select: { isActive: true } });
      userActive = student?.isActive === true;
    } else if (role === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { id }, select: { isActive: true } });
      userActive = parent?.isActive === true;
    }

    if (!userActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive or deleted' });
    }

    req.user = decoded; // { id, role, schoolId?, etc. }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
