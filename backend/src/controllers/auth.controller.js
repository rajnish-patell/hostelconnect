const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateToken } = require('../utils/jwt');

// Super Admin Login
exports.superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await prisma.superAdmin.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ id: admin.id, role: 'superadmin', email: admin.email });

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

// School Login
exports.schoolLogin = async (req, res, next) => {
  try {
    const { schoolCode, password } = req.body;
    const school = await prisma.school.findUnique({ where: { schoolCode } });

    if (!school || !school.isActive || !school.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or school inactive' });
    }

    const valid = await bcrypt.compare(password, school.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      id: school.id,
      role: 'school',
      schoolId: school.id,
      schoolCode: school.schoolCode,
    });

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

// Student Login
exports.studentLogin = async (req, res, next) => {
  try {
    const { schoolCode, studentId, password } = req.body;

    const school = await prisma.school.findUnique({ where: { schoolCode } });
    if (!school || !school.isActive) {
      return res.status(401).json({ success: false, message: 'School not found or inactive' });
    }

    const student = await prisma.student.findUnique({
      where: {
        schoolId_studentId: {
          schoolId: school.id,
          studentId,
        },
      },
    });

    if (!student || !student.isActive) {
      return res.status(401).json({ success: false, message: 'Student not found or inactive' });
    }

    if (student.passwordHash) {
      const valid = await bcrypt.compare(password, student.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    const token = generateToken({
      id: student.id,
      role: 'student',
      schoolId: school.id,
      studentId: student.studentId,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
          schoolId: school.id,
          walletBalance: student.walletBalance,
          role: 'student',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Parent Login (OTP based - simplified for demo)
// In production: integrate Twilio / MSG91 / Firebase Phone Auth
exports.parentRequestOtp = async (req, res, next) => {
  try {
    const rawMobile = req.body.mobile || '';
    const mobile = rawMobile.replace(/\D/g, '').slice(-10);
    if (!mobile || mobile.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    let parent = await prisma.parent.findUnique({ where: { mobile } });
    if (!parent) {
      parent = await prisma.parent.create({
        data: { mobile, name: `Parent ${mobile.slice(-4)}` },
      });
    }

    // Demo fixed OTP
    const otp = '123456';

    res.json({
      success: true,
      message: 'OTP sent successfully (Demo OTP: 123456)',
      data: { mobile, expiresIn: 300 },
    });
  } catch (error) {
    next(error);
  }
};

exports.parentVerifyOtp = async (req, res, next) => {
  try {
    const rawMobile = req.body.mobile || '';
    const mobile = rawMobile.replace(/\D/g, '').slice(-10);
    const { otp } = req.body;

    // Demo: accept 123456 or any 6-digit test OTP
    if (otp !== '123456' && otp !== '000000') {
      return res.status(401).json({ success: false, message: 'Invalid OTP. Please use demo OTP: 123456' });
    }

    const parent = await prisma.parent.findUnique({
      where: { mobile },
      include: {
        students: {
          include: {
            student: {
              include: { school: true },
            },
          },
        },
      },
    });

    if (!parent || !parent.isActive) {
      return res.status(401).json({ success: false, message: 'Parent not found' });
    }

    const token = generateToken({
      id: parent.id,
      role: 'parent',
      mobile: parent.mobile,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: parent.id,
          name: parent.name,
          mobile: parent.mobile,
          relation: parent.relation,
          role: 'parent',
          students: parent.students.map((sp) => ({
            id: sp.student.id,
            name: sp.student.name,
            studentId: sp.student.studentId,
            schoolName: sp.student.school.name,
            isPrimary: sp.isPrimary,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
