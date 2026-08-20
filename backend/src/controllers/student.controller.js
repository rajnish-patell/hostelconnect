const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

// School / SuperAdmin: Create Student
exports.createStudent = async (req, res, next) => {
  try {
    const schoolId = req.user.role === 'school' ? req.user.schoolId : req.body.schoolId;
    const {
      studentId,
      name,
      classSection,
      roomNo,
      password,
      callDurationMins,
      isUnlimitedCalls,
      parentMobile,
      parentName,
      parentRelation,
    } = req.body;

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const student = await prisma.student.create({
      data: {
        schoolId,
        studentId,
        name,
        classSection,
        roomNo,
        passwordHash,
        callDurationMins,
        isUnlimitedCalls: isUnlimitedCalls || false,
      },
    });

    // Auto link parent if mobile provided
    if (parentMobile) {
      let parent = await prisma.parent.findUnique({ where: { mobile: parentMobile } });
      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            mobile: parentMobile,
            name: parentName || `Parent of ${name}`,
            relation: parentRelation || 'Guardian',
          },
        });
      }

      await prisma.studentParent.create({
        data: {
          studentId: student.id,
          parentId: parent.id,
          isPrimary: true,
        },
      });
    }

    const { passwordHash: _, ...safeStudent } = student;
    res.status(201).json({ success: true, data: safeStudent });
  } catch (error) {
    next(error);
  }
};

// Update Student
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, studentId, classSection, roomNo, schoolId, password, callDurationMins, isUnlimitedCalls, photoUrl } = req.body;

    // Ownership check for school
    if (req.user.role === 'school') {
      const existing = await prisma.student.findUnique({ where: { id: parseInt(id) } });
      if (!existing || existing.schoolId !== req.user.schoolId) {
        return res.status(403).json({ success: false, message: 'Not allowed' });
      }
    }

    const updateData = {
      ...(name && { name: name.trim() }),
      ...(studentId && { studentId: studentId.trim() }),
      ...(classSection !== undefined && { classSection: classSection ? classSection.trim() : '' }),
      ...(roomNo !== undefined && { roomNo: roomNo ? roomNo.trim() : '' }),
      ...(callDurationMins !== undefined && { callDurationMins: parseInt(callDurationMins, 10) }),
      ...(isUnlimitedCalls !== undefined && { isUnlimitedCalls: Boolean(isUnlimitedCalls) }),
      ...(photoUrl !== undefined && { photoUrl }),
    };

    if (req.user.role === 'superadmin' && schoolId) {
      updateData.schoolId = parseInt(schoolId, 10);
    }

    if (password && password.trim().length >= 4) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    const { passwordHash: _, ...safeUpdated } = student;
    res.json({ success: true, data: safeUpdated });
  } catch (error) {
    next(error);
  }
};

// Super Admin / School: Update Parent Info & Relation
exports.updateParent = async (req, res, next) => {
  try {
    const { id } = req.params; // parent id
    const { name, mobile, relation } = req.body;

    const parent = await prisma.parent.findUnique({ where: { id: parseInt(id) } });
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }

    const updated = await prisma.parent.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(mobile && { mobile: mobile.replace(/\D/g, '').slice(-10) }),
        ...(relation && { relation: relation.trim() }),
      },
    });

    const { passwordHash: _, ...safeParent } = updated;
    res.json({ success: true, data: safeParent });
  } catch (error) {
    next(error);
  }
};

// Super Admin / School: Unlink Parent from Student
exports.unlinkParent = async (req, res, next) => {
  try {
    const { studentId, parentId } = req.params;

    await prisma.studentParent.deleteMany({
      where: {
        studentId: parseInt(studentId),
        parentId: parseInt(parentId),
      },
    });

    res.json({ success: true, message: 'Parent unlinked successfully' });
  } catch (error) {
    next(error);
  }
};

// Toggle Student Active
exports.toggleStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id: parseInt(id) } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'school' && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const updated = await prisma.student.update({
      where: { id: parseInt(id) },
      data: { isActive: !student.isActive },
    });

    const { passwordHash: _, ...safeUpdated } = updated;
    res.json({ success: true, data: safeUpdated });
  } catch (error) {
    next(error);
  }
};

// List Students
exports.listStudents = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'school') {
      where.schoolId = req.user.schoolId;
    } else if (req.query.schoolId) {
      where.schoolId = parseInt(req.query.schoolId);
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        parents: {
          include: {
            parent: {
              select: { id: true, mobile: true, name: true, relation: true, email: true, isActive: true },
            },
          },
        },
        school: { select: { name: true, schoolCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const safeStudents = students.map(({ passwordHash, ...rest }) => rest);
    res.json({ success: true, data: safeStudents });
  } catch (error) {
    next(error);
  }
};

// Get Student details + linked parents
exports.getStudent = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        parents: {
          include: {
            parent: {
              select: { id: true, mobile: true, name: true, relation: true, email: true, isActive: true },
            },
          },
        },
        school: { select: { id: true, name: true, schoolCode: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const { passwordHash: _, ...safeStudent } = student;
    res.json({ success: true, data: safeStudent });
  } catch (error) {
    next(error);
  }
};

// Add / Link Parent to Student
exports.linkParent = async (req, res, next) => {
  try {
    const { id } = req.params; // student id
    const { mobile, name, relation, isPrimary } = req.body;

    const student = await prisma.student.findUnique({ where: { id: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'school' && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    let parent = await prisma.parent.findUnique({ where: { mobile } });
    if (!parent) {
      parent = await prisma.parent.create({
        data: { mobile, name: name || `Parent of ${student.name}`, relation: relation || 'Guardian' },
      });
    }

    const link = await prisma.studentParent.upsert({
      where: {
        studentId_parentId: {
          studentId: student.id,
          parentId: parent.id,
        },
      },
      update: { isPrimary: isPrimary || false },
      create: {
        studentId: student.id,
        parentId: parent.id,
        isPrimary: isPrimary || false,
      },
    });

    const { passwordHash: _, ...safeParent } = parent;
    res.json({ success: true, data: { parent: safeParent, link } });
  } catch (error) {
    next(error);
  }
};
