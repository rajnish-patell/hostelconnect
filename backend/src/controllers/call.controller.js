const prisma = require('../utils/prisma');
const { generateAgoraToken } = require('../utils/agora');
const { v4: uuidv4 } = require('uuid');

// Helper: Get effective call settings for a student
async function getCallSettings(student) {
  const school = await prisma.school.findUnique({ where: { id: student.schoolId } });

  return {
    durationMins: student.callDurationMins ?? school.callDurationMins,
    isUnlimited: student.isUnlimitedCalls || school.isUnlimitedCalls,
    perMinuteCharge: parseFloat(school.perMinuteCharge),
  };
}

// Student initiates call
exports.initiateCall = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { parentId } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });

    if (!student || !student.isActive) {
      return res.status(400).json({ success: false, message: 'Student inactive' });
    }

    if (!student.school.isActive) {
      return res.status(400).json({ success: false, message: 'School inactive' });
    }

    // Verify parent is linked
    const link = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId: student.id,
          parentId: parseInt(parentId),
        },
      },
      include: { parent: true },
    });

    if (!link) {
      return res.status(400).json({ success: false, message: 'Parent not linked to this student' });
    }

    const settings = await getCallSettings(student);

    // Check wallet if not unlimited
    if (!settings.isUnlimited) {
      const minRequired = settings.perMinuteCharge; // at least 1 minute
      if (parseFloat(student.walletBalance) < minRequired) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance. Please recharge.',
        });
      }
    }

    // Generate standard Google Meet link
    const meetCode = `hostel-${student.studentId.toLowerCase()}-${parentId}`;
    const meetLink = req.body.meetLink || `https://meet.google.com/lookup/${meetCode}`;

    const call = await prisma.callSession.create({
      data: {
        studentId: student.id,
        parentId: parseInt(parentId),
        schoolId: student.schoolId,
        status: 'initiated',
        isUnlimited: settings.isUnlimited,
        meetLink: meetLink,
        initiatedBy: 'student',
      },
    });

    // TODO: Send push notification to parent via FCM

    res.status(201).json({
      success: true,
      data: {
        callId: call.id,
        meetLink: meetLink,
        durationMins: settings.durationMins,
        isUnlimited: settings.isUnlimited,
        parent: {
          id: link.parent.id,
          name: link.parent.name,
          relation: link.parent.relation,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Parent accepts / joins call
exports.acceptCall = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const parentId = req.user.id;

    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      include: { student: true, parent: true },
    });

    if (!call || call.parentId !== parentId) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (['completed', 'rejected', 'missed', 'failed'].includes(call.status)) {
      return res.status(400).json({ success: false, message: 'Call already ended' });
    }

    const updated = await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'ongoing',
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        callId: updated.id,
        meetLink: updated.meetLink,
        student: {
          id: call.student.id,
          name: call.student.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// End Call + Calculate charge
exports.endCall = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { durationSeconds } = req.body; // client can send measured duration

    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      include: { student: true, school: true },
    });

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    // Authorization: student or parent of this call
    if (
      (req.user.role === 'student' && req.user.id !== call.studentId) ||
      (req.user.role === 'parent' && req.user.id !== call.parentId)
    ) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (call.status === 'completed') {
      return res.json({ success: true, data: call, message: 'Already completed' });
    }

    const endedAt = new Date();
    const startedAt = call.startedAt || call.createdAt;
    const calculatedDuration = durationSeconds || Math.floor((endedAt - startedAt) / 1000);

    let chargeAmount = 0;
    const rate = parseFloat(call.school.perMinuteCharge || 2.5);

    if (!call.isUnlimited) {
      const minutes = Math.ceil(calculatedDuration / 60);
      chargeAmount = parseFloat((minutes * rate).toFixed(2));

      // Deduct from wallet
      const newBalance = Math.max(0, parseFloat((call.student.walletBalance - chargeAmount).toFixed(2)));
      await prisma.student.update({
        where: { id: call.studentId },
        data: { walletBalance: newBalance },
      });

      await prisma.walletTransaction.create({
        data: {
          studentId: call.studentId,
          type: 'debit',
          amount: chargeAmount,
          balanceAfter: newBalance,
          referenceType: 'call',
          referenceId: call.id,
          description: `Video call billing - ${minutes} min(s) @ ₹${rate}/min`,
        },
      });
    }

    const updated = await prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt,
        durationSeconds: calculatedDuration,
        chargeAmount,
        pricePerMinute: rate,
        totalAmount: chargeAmount,
      },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        chargeAmount,
        durationSeconds: calculatedDuration,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reject / Miss call
exports.rejectCall = async (req, res, next) => {
  try {
    const { callId } = req.params;

    const call = await prisma.callSession.findUnique({ where: { id: callId } });
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const updated = await prisma.callSession.update({
      where: { id: callId },
      data: { status: 'rejected' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// Call History
exports.getCallHistory = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.role === 'parent') {
      where.parentId = req.user.id;
    } else if (req.user.role === 'school') {
      where.schoolId = req.user.schoolId;
    } else if (req.query.studentId) {
      where.studentId = parseInt(req.query.studentId);
    } else if (req.query.schoolId) {
      where.schoolId = parseInt(req.query.schoolId);
    }

    const calls = await prisma.callSession.findMany({
      where,
      include: {
        student: { select: { name: true, studentId: true } },
        parent: { select: { name: true, mobile: true, relation: true } },
        school: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 50,
    });

    res.json({ success: true, data: calls });
  } catch (error) {
    next(error);
  }
};
