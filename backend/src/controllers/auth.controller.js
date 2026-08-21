const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateToken } = require('../utils/jwt');
const { auditFromReq, logAudit, getClientIp } = require('../utils/audit');
const { sendOtp, verifyOtp, resendOtp } = require('../utils/otpService');

const isDemoMode = () => process.env.DEMO_MODE === 'true';

// ─── Super Admin Login ──────────────────────────────────────────────────────
exports.superAdminLogin = async (req, res, next) => {
  try {
    const rawEmail = (req.body.email || req.body.username || '').trim();
    const password = req.body.password || '';

    if (!rawEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { email: rawEmail },
          { email: rawEmail.toLowerCase() },
        ],
      },
    });

    if (!admin) {
      logAudit({ userId: null, userRole: 'superadmin', action: 'login_failed', details: { email: rawEmail, reason: 'not_found' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Super admin account is inactive' });
    }

    // Password verification
    let valid = false;
    if (admin.passwordHash) {
      valid = await bcrypt.compare(password, admin.passwordHash).catch(() => false);
    }

    // Demo mode fallback (development only)
    if (!valid && isDemoMode()) {
      const demoPasswords = ['superadmin123', 'SuperAdmin@123', 'admin123', 'password'];
      if (demoPasswords.includes(password) || demoPasswords.includes(password.toLowerCase())) {
        valid = true;
      }
    }

    if (!valid) {
      logAudit({ userId: admin.id, userRole: 'superadmin', action: 'login_failed', details: { email: rawEmail, reason: 'wrong_password' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ id: admin.id, role: 'superadmin', email: admin.email });

    logAudit({ userId: admin.id, userRole: 'superadmin', action: 'login', details: { email: admin.email }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'superadmin',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── School Login ───────────────────────────────────────────────────────────
exports.schoolLogin = async (req, res, next) => {
  try {
    const rawCode = (req.body.schoolCode || req.body.username || '').trim();
    const password = req.body.password || '';

    if (!rawCode || !password) {
      return res.status(400).json({ success: false, message: 'School code and password are required' });
    }

    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { schoolCode: rawCode },
          { schoolCode: rawCode.toUpperCase() },
        ],
      },
    });

    if (!school) {
      logAudit({ userId: null, userRole: 'school', action: 'login_failed', details: { schoolCode: rawCode, reason: 'not_found' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!school.isActive) {
      return res.status(401).json({ success: false, message: 'School account is inactive' });
    }

    let valid = false;
    if (school.passwordHash) {
      valid = await bcrypt.compare(password, school.passwordHash).catch(() => false);
    }

    // Demo mode fallback (development only)
    if (!valid && isDemoMode()) {
      const demoPasswords = ['school123', 'School@123', 'dps123', 'admin123', 'password'];
      if (demoPasswords.includes(password) || demoPasswords.includes(password.toLowerCase())) {
        valid = true;
      }
    }

    if (!valid) {
      logAudit({ userId: school.id, userRole: 'school', action: 'login_failed', details: { schoolCode: rawCode, reason: 'wrong_password' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      id: school.id,
      role: 'school',
      schoolId: school.id,
      schoolCode: school.schoolCode,
    });

    logAudit({ userId: school.id, userRole: 'school', action: 'login', details: { schoolCode: school.schoolCode }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: school.id,
          name: school.name,
          schoolCode: school.schoolCode,
          role: 'school',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Student Login ──────────────────────────────────────────────────────────
exports.studentLogin = async (req, res, next) => {
  try {
    const rawSchoolCode = (req.body.schoolCode || '').trim();
    const rawStudentId = (req.body.studentId || '').trim();
    const password = req.body.password || '';

    if (!rawSchoolCode || !rawStudentId || !password) {
      return res.status(400).json({ success: false, message: 'School code, student ID, and password are required' });
    }

    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { schoolCode: rawSchoolCode },
          { schoolCode: rawSchoolCode.toUpperCase() },
        ],
      },
    });

    if (!school) {
      return res.status(401).json({ success: false, message: 'School not found' });
    }

    const student = await prisma.student.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { studentId: rawStudentId },
          { studentId: rawStudentId.toUpperCase() },
        ],
      },
    });

    if (!student || !student.isActive) {
      logAudit({ userId: null, userRole: 'student', action: 'login_failed', details: { schoolCode: rawSchoolCode, studentId: rawStudentId, reason: 'not_found' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Student account not found or inactive' });
    }

    let valid = false;
    if (student.passwordHash) {
      valid = await bcrypt.compare(password, student.passwordHash).catch(() => false);
    }

    // Demo mode fallback (development only)
    if (!valid && isDemoMode()) {
      const demoPasswords = ['student123', 'Student@123', 'stu123', 'password'];
      if (demoPasswords.includes(password) || demoPasswords.includes(password.toLowerCase())) {
        valid = true;
      }
    }

    if (!valid) {
      logAudit({ userId: student.id, userRole: 'student', action: 'login_failed', details: { studentId: rawStudentId, reason: 'wrong_password' }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      id: student.id,
      role: 'student',
      schoolId: student.schoolId,
      studentId: student.studentId,
    });

    logAudit({ userId: student.id, userRole: 'student', action: 'login', details: { studentId: student.studentId }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
          schoolId: student.schoolId,
          walletBalance: student.walletBalance,
          role: 'student',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Parent Login (Real Resend Email & SMS OTP) ──────────────────────────────
exports.parentRequestOtp = async (req, res, next) => {
  try {
    const rawInput = (req.body.email || req.body.mobile || req.body.destination || '').trim();
    const reqChannel = (req.body.channel || (rawInput.includes('@') ? 'email' : 'sms')).toLowerCase();

    if (!rawInput) {
      return res.status(400).json({ success: false, message: 'Valid email address or 10-digit mobile number is required' });
    }

    const isEmail = reqChannel === 'email' || rawInput.includes('@');
    const cleanMobile = rawInput.replace(/\D/g, '');

    // Look up registered parent account in Prisma database
    let parent = null;
    if (isEmail) {
      parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { email: rawInput },
            { email: rawInput.toLowerCase() },
          ],
        },
      });
    } else if (cleanMobile.length >= 10) {
      parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { mobile: cleanMobile },
            { mobile: cleanMobile.slice(-10) },
          ],
        },
      });
    }

    // Auto-provision demo account for patelrajnish47@gmail.com
    if (!parent) {
      if (rawInput.toLowerCase() === 'patelrajnish47@gmail.com') {
        parent = await prisma.parent.create({
          data: {
            email: 'patelrajnish47@gmail.com',
            mobile: '9876543210',
            name: 'Rajnish Patel (Parent)',
            relation: 'Father',
          },
        });
      } else {
        // Return generic message to prevent account enumeration
        return res.json({
          success: true,
          message: 'If this email or phone is registered, a verification code has been sent.',
        });
      }
    }

    if (!parent.isActive) {
      return res.status(403).json({ success: false, message: 'Parent account is inactive. Please contact school administration.' });
    }

    const targetDestination = isEmail ? parent.email : (parent.mobile || parent.email);
    const otpResult = await sendOtp({
      destination: targetDestination,
      parentId: parent.id,
      parentName: parent.name || 'Parent',
    });

    logAudit({ userId: parent.id, userRole: 'parent', action: 'otp_requested', details: { channel: otpResult.type }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    const channelText = otpResult.type === 'email' ? 'email address' : 'mobile phone';

    res.json({
      success: true,
      message: `Verification code sent to your registered ${channelText}.`,
    });
  } catch (error) {
    if (error.statusCode === 429 || (error.message && (error.message.includes('Too many') || error.message.includes('Please wait')))) {
      return res.status(429).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.parentResendOtp = async (req, res, next) => {
  try {
    const rawInput = (req.body.email || req.body.mobile || req.body.destination || '').trim();

    if (!rawInput) {
      return res.status(400).json({ success: false, message: 'Valid email address or mobile number is required' });
    }

    const isEmail = rawInput.includes('@');
    const cleanMobile = rawInput.replace(/\D/g, '');

    const parent = await prisma.parent.findFirst({
      where: {
        OR: [
          { email: rawInput },
          { email: rawInput.toLowerCase() },
          ...(cleanMobile.length >= 10 ? [{ mobile: cleanMobile }, { mobile: cleanMobile.slice(-10) }] : []),
        ],
      },
    });

    if (!parent) {
      return res.json({
        success: true,
        message: 'If this email or phone is registered, a verification code has been sent.',
      });
    }

    const targetDestination = isEmail ? parent.email : (parent.mobile || parent.email);
    const otpResult = await resendOtp({
      destination: targetDestination,
      parentId: parent.id,
      parentName: parent.name || 'Parent',
    });

    res.json({
      success: true,
      message: `Verification code resent to your ${otpResult.type === 'email' ? 'email address' : 'mobile phone'}.`,
    });
  } catch (error) {
    if (error.statusCode === 429 || (error.message && (error.message.includes('Too many') || error.message.includes('Please wait')))) {
      return res.status(429).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.parentVerifyOtp = async (req, res, next) => {
  try {
    const rawInput = (req.body.email || req.body.mobile || req.body.destination || '').trim();
    const { otp } = req.body;

    if (!rawInput || !otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    // Verify OTP against Prisma database ParentOtp records
    const verification = await verifyOtp({ destination: rawInput, inputOtp: otp.trim() });
    if (!verification.valid) {
      const statusCode = verification.statusCode || 401;
      return res.status(statusCode).json({ success: false, message: verification.error || 'Invalid or expired verification code.' });
    }

    const isEmail = rawInput.includes('@');
    const cleanMobile = rawInput.replace(/\D/g, '');

    const parent = await prisma.parent.findFirst({
      where: {
        OR: [
          { email: rawInput },
          { email: rawInput.toLowerCase() },
          ...(cleanMobile.length >= 10 ? [{ mobile: cleanMobile }, { mobile: cleanMobile.slice(-10) }] : []),
        ],
      },
      include: {
        students: {
          include: {
            student: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    if (!parent || !parent.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const token = generateToken({ id: parent.id, role: 'parent', email: parent.email });

    logAudit({ userId: parent.id, userRole: 'parent', action: 'login', details: {}, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    const studentData = (parent.students || []).map(sp => ({
      id: sp.student.id,
      name: sp.student.name,
      studentId: sp.student.studentId,
      schoolId: sp.student.schoolId,
      schoolName: sp.student.school?.name || '',
      walletBalance: sp.student.walletBalance,
      isPrimary: sp.isPrimary,
    }));

    const supabaseUserId = req.body.supabaseUserId || null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: parent.id,
          name: parent.name || 'Parent',
          email: parent.email,
          mobile: parent.mobile,
          role: 'parent',
          ...(supabaseUserId ? { supabaseUserId } : {}),
          students: studentData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};



// ─── GET /auth/me — Current user profile from token ─────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let user = null;

    if (role === 'superadmin') {
      const admin = await prisma.superAdmin.findUnique({ where: { id } });
      if (admin) {
        user = { id: admin.id, name: admin.name, email: admin.email, role: 'superadmin' };
      }
    } else if (role === 'school') {
      const school = await prisma.school.findUnique({ where: { id } });
      if (school) {
        user = { id: school.id, name: school.name, schoolCode: school.schoolCode, role: 'school' };
      }
    } else if (role === 'student') {
      const student = await prisma.student.findUnique({ where: { id }, include: { school: { select: { name: true } } } });
      if (student) {
        user = { id: student.id, name: student.name, studentId: student.studentId, schoolId: student.schoolId, walletBalance: student.walletBalance, role: 'student' };
      }
    } else if (role === 'parent') {
      const parent = await prisma.parent.findUnique({
        where: { id },
        include: {
          students: {
            include: {
              student: { include: { school: true } },
            },
          },
        },
      });
      if (parent) {
        user = {
          id: parent.id,
          name: parent.name,
          mobile: parent.mobile,
          role: 'parent',
          students: (parent.students || []).map(sp => ({
            id: sp.student.id,
            name: sp.student.name,
            studentId: sp.student.studentId,
            schoolId: sp.student.schoolId,
            schoolName: sp.student.school?.name || '',
            walletBalance: sp.student.walletBalance,
            isPrimary: sp.isPrimary,
          })),
        };
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/change-password — Authenticated password change ─────────────
exports.changePassword = async (req, res, next) => {
  try {
    const audit = auditFromReq(req);
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    let entity;
    if (role === 'superadmin') {
      entity = await prisma.superAdmin.findUnique({ where: { id } });
    } else if (role === 'school') {
      entity = await prisma.school.findUnique({ where: { id } });
    } else if (role === 'student') {
      entity = await prisma.student.findUnique({ where: { id } });
    } else {
      return res.status(400).json({ success: false, message: 'Password change not supported for this role' });
    }

    if (!entity || !entity.passwordHash) {
      return res.status(400).json({ success: false, message: 'Cannot change password for this account' });
    }

    const valid = await bcrypt.compare(currentPassword, entity.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    if (role === 'superadmin') {
      await prisma.superAdmin.update({ where: { id }, data: { passwordHash: newHash } });
    } else if (role === 'school') {
      await prisma.school.update({ where: { id }, data: { passwordHash: newHash } });
    } else if (role === 'student') {
      await prisma.student.update({ where: { id }, data: { passwordHash: newHash } });
    }

    audit('password_changed', role, id, {});

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/password-reset/request — Request password reset token ───────
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email, schoolCode, role: resetRole } = req.body;

    if (!resetRole || !['superadmin', 'school'].includes(resetRole)) {
      return res.status(400).json({ success: false, message: 'Password reset is available for superadmin and school accounts' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    if (resetRole === 'superadmin' && email) {
      const admin = await prisma.superAdmin.findUnique({ where: { email } });
      if (admin) {
        await prisma.superAdmin.update({
          where: { id: admin.id },
          data: { passwordResetToken: tokenHash, passwordResetExpiry: expiry },
        });
      }
    } else if (resetRole === 'school' && schoolCode) {
      const school = await prisma.school.findFirst({ where: { schoolCode } });
      if (school) {
        await prisma.school.update({
          where: { id: school.id },
          data: { passwordResetToken: tokenHash, passwordResetExpiry: expiry },
        });
      }
    }

    // Always return success to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account exists with the provided details, a reset token has been generated.',
      ...(isDemoMode() ? { resetToken } : {}), // Only expose token in demo mode
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/password-reset/confirm — Confirm password reset ─────────────
exports.confirmPasswordReset = async (req, res, next) => {
  try {
    const { resetToken, newPassword, role: resetRole } = req.body;

    if (!resetToken || !newPassword || !resetRole) {
      return res.status(400).json({ success: false, message: 'Reset token, new password, and role are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const newHash = await bcrypt.hash(newPassword, 12);

    if (resetRole === 'superadmin') {
      const admin = await prisma.superAdmin.findFirst({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpiry: { gte: new Date() },
        },
      });
      if (!admin) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }
      await prisma.superAdmin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash, passwordResetToken: null, passwordResetExpiry: null },
      });
    } else if (resetRole === 'school') {
      const school = await prisma.school.findFirst({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpiry: { gte: new Date() },
        },
      });
      if (!school) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }
      await prisma.school.update({
        where: { id: school.id },
        data: { passwordHash: newHash, passwordResetToken: null, passwordResetExpiry: null },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role for password reset' });
    }

    logAudit({ userId: null, userRole: resetRole, action: 'password_reset', details: { role: resetRole }, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] });

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
};
