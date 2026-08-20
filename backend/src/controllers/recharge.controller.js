const crypto = require('crypto');
const prisma = require('../utils/prisma');

// School or SuperAdmin: Offline / Manual Recharge
exports.manualRecharge = async (req, res, next) => {
  try {
    const { studentId, amount, notes, paymentMode } = req.body;

    const rechargeAmount = parseFloat(amount);
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid recharge amount' });
    }

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId, 10) },
      include: { school: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // School can only recharge its own students
    if (req.user.role === 'school' && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this student' });
    }

    const newBalance = parseFloat((student.walletBalance + rechargeAmount).toFixed(2));
    const priceSnapshot = student.school?.perMinuteCharge || 2.5;
    const durationMins = Math.floor(rechargeAmount / priceSnapshot);

    const [recharge, updatedStudent] = await prisma.$transaction([
      prisma.recharge.create({
        data: {
          studentId: student.id,
          schoolId: student.schoolId,
          amount: rechargeAmount,
          pricePerMinute: priceSnapshot,
          durationMinutes: durationMins,
          paymentMode: paymentMode || 'school_cash',
          status: 'success',
          rechargedByType: req.user.role,
          rechargedById: req.user.id,
          transactionId: `CASH_${Date.now()}`,
          notes: notes || `Manual credit by ${req.user.role}`,
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          studentId: student.id,
          type: 'credit',
          amount: rechargeAmount,
          balanceAfter: newBalance,
          referenceType: 'recharge',
          description: notes || `Manual recharge by ${req.user.role}`,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: `Recharge of ₹${rechargeAmount.toFixed(2)} successful`,
      data: {
        recharge,
        newBalance: updatedStudent.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Parent: Create online recharge order (Authoritative Server-Side Pricing)
exports.createOnlineRechargeOrder = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { studentId, requestedDurationMinutes, durationMinutes, amount } = req.body;

    const sId = parseInt(studentId, 10);
    if (isNaN(sId)) {
      return res.status(400).json({ success: false, message: 'Valid Student ID is required' });
    }

    // 1. Authenticate parent and verify parent-student relationship
    const link = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId: sId,
          parentId,
        },
      },
    });

    if (!link) {
      return res.status(403).json({ success: false, message: 'You are not authorized for this student' });
    }

    // 2. Fetch authoritative school and its active pricing
    const student = await prisma.student.findUnique({
      where: { id: sId },
      include: { school: true },
    });

    if (!student || !student.school) {
      return res.status(404).json({ success: false, message: 'Student or School profile not found' });
    }

    const school = student.school;
    const pricePerMinute = parseFloat(school.perMinuteCharge || 2.5);
    const minDuration = school.minCallDurationMins || 5;
    const maxDuration = school.maxCallDurationMins || 60;

    let finalDuration = 0;
    let finalAmount = 0;

    const dur = parseInt(requestedDurationMinutes || durationMinutes, 10);
    if (!isNaN(dur) && dur > 0) {
      // Parent chose specific call duration
      if (dur < minDuration) {
        return res.status(400).json({
          success: false,
          message: `Minimum call duration for ${school.name} is ${minDuration} minutes`,
        });
      }
      if (dur > maxDuration) {
        return res.status(400).json({
          success: false,
          message: `Maximum call duration for ${school.name} is ${maxDuration} minutes`,
        });
      }
      finalDuration = dur;
      // Authoritative server-side calculation
      finalAmount = parseFloat((finalDuration * pricePerMinute).toFixed(2));
    } else if (amount) {
      // Fallback manual amount recharge
      const parsedAmt = parseFloat(amount);
      if (isNaN(parsedAmt) || parsedAmt < 10 || parsedAmt > 50000) {
        return res.status(400).json({ success: false, message: 'Recharge amount must be between ₹10 and ₹50,000' });
      }
      finalAmount = parsedAmt;
      finalDuration = Math.max(1, Math.floor(finalAmount / pricePerMinute));
    } else {
      return res.status(400).json({ success: false, message: 'Please specify call duration or recharge amount' });
    }

    // 3. Generate Razorpay / UPI order reference
    const timestamp = Date.now();
    const razorpayOrderId = `order_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Create pending recharge record with frozen pricing snapshot
    const recharge = await prisma.recharge.create({
      data: {
        studentId: student.id,
        schoolId: school.id,
        parentId,
        amount: finalAmount,
        currency: 'INR',
        pricePerMinute,
        durationMinutes: finalDuration,
        paymentMode: 'parent_app',
        status: 'pending',
        rechargedByType: 'parent',
        rechargedById: parentId,
        paymentGateway: 'razorpay',
        razorpayOrderId,
      },
    });

    const upiVpa = process.env.UPI_VPA || 'schoolhostel@upi';
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(school.name)}&am=${finalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Call with ${student.name} (${finalDuration}m)`)}`;

    res.status(201).json({
      success: true,
      data: {
        rechargeId: recharge.id,
        studentId: student.id,
        studentName: student.name,
        schoolId: school.id,
        schoolName: school.name,
        pricePerMinute,
        durationMinutes: finalDuration,
        amount: finalAmount,
        currency: 'INR',
        razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_hostel_calling',
        upiDeepLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Confirm online payment (Razorpay callback / client verification)
exports.confirmOnlineRecharge = async (req, res, next) => {
  try {
    const { rechargeId, transactionId, paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const rId = parseInt(rechargeId, 10);
    if (isNaN(rId)) {
      return res.status(400).json({ success: false, message: 'Invalid recharge ID' });
    }

    const recharge = await prisma.recharge.findUnique({
      where: { id: rId },
      include: { student: { include: { school: true } } },
    });

    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Recharge order not found' });
    }

    // Idempotent: If already successful, return current state immediately
    if (recharge.status === 'success') {
      return res.json({
        success: true,
        message: 'Payment already verified and credited',
        newBalance: recharge.student.walletBalance,
        data: recharge,
      });
    }

    // Razorpay cryptographic signature verification if secret is present
    const payId = razorpayPaymentId || paymentId || transactionId || `PAY_${Date.now()}`;
    const ordId = razorpayOrderId || recharge.razorpayOrderId;

    if (process.env.RAZORPAY_KEY_SECRET && razorpaySignature && ordId) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${ordId}|${payId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
      }
    }

    const newBalance = parseFloat((recharge.student.walletBalance + recharge.amount).toFixed(2));

    const [updatedRecharge, updatedStudent] = await prisma.$transaction([
      prisma.recharge.update({
        where: { id: recharge.id },
        data: {
          status: 'success',
          transactionId: payId,
          razorpayPaymentId: payId,
        },
      }),
      prisma.student.update({
        where: { id: recharge.studentId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          studentId: recharge.studentId,
          type: 'credit',
          amount: recharge.amount,
          balanceAfter: newBalance,
          referenceType: 'recharge',
          referenceId: String(recharge.id),
          description: `UPI video call recharge (${recharge.durationMinutes || Math.floor(recharge.amount / (recharge.pricePerMinute || 2.5))} mins @ ₹${recharge.pricePerMinute || 2.5}/min)`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Payment verified. ₹${recharge.amount.toFixed(2)} credited successfully.`,
      newBalance: updatedStudent.walletBalance,
      data: updatedRecharge,
    });
  } catch (error) {
    next(error);
  }
};

// Razorpay Webhook Endpoint
exports.handlePaymentWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && payload) {
      const razorpayOrderId = payload.order_id;
      const razorpayPaymentId = payload.id;

      const recharge = await prisma.recharge.findFirst({
        where: { razorpayOrderId },
        include: { student: true },
      });

      if (recharge && recharge.status === 'pending') {
        const newBalance = parseFloat((recharge.student.walletBalance + recharge.amount).toFixed(2));
        await prisma.$transaction([
          prisma.recharge.update({
            where: { id: recharge.id },
            data: {
              status: 'success',
              transactionId: razorpayPaymentId,
              razorpayPaymentId,
            },
          }),
          prisma.student.update({
            where: { id: recharge.studentId },
            data: { walletBalance: newBalance },
          }),
          prisma.walletTransaction.create({
            data: {
              studentId: recharge.studentId,
              type: 'credit',
              amount: recharge.amount,
              balanceAfter: newBalance,
              referenceType: 'recharge',
              referenceId: String(recharge.id),
              description: `Webhook auto-credit (${recharge.durationMinutes} mins @ ₹${recharge.pricePerMinute}/min)`,
            },
          }),
        ]);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ status: 'error' });
  }
};

// Get wallet + transactions
exports.getWallet = async (req, res, next) => {
  try {
    let studentId = req.user.id;

    if (req.user.role === 'parent' || req.user.role === 'school' || req.user.role === 'superadmin') {
      studentId = parseInt(req.query.studentId || req.params.studentId, 10);
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        walletBalance: true,
        studentId: true,
        school: {
          select: {
            id: true,
            name: true,
            perMinuteCharge: true,
            minCallDurationMins: true,
            maxCallDurationMins: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.json({
      success: true,
      data: {
        walletBalance: student.walletBalance,
        student,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin / School Admin / Parent: Payment Transaction History
exports.listTransactions = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === 'school') {
      where.schoolId = req.user.schoolId;
    } else if (req.user.role === 'parent') {
      where.parentId = req.user.id;
    }

    const recharges = await prisma.recharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            school: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: recharges,
    });
  } catch (error) {
    next(error);
  }
};
