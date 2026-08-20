const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { getRazorpay, isConfigured } = require('../utils/razorpay');
const { auditFromReq } = require('../utils/audit');
const config = require('../config');

// ─── School or SuperAdmin: Offline / Manual Recharge ────────────────────────
exports.manualRecharge = async (req, res, next) => {
  try {
    const audit = auditFromReq(req);
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

    audit('manual_recharge', 'recharge', recharge.id, { amount: rechargeAmount, studentId: student.id });

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

// ─── Parent: Create online recharge order (Real Razorpay) ───────────────────
exports.createOnlineRechargeOrder = async (req, res, next) => {
  try {
    const audit = auditFromReq(req);
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
      const parsedAmt = parseFloat(amount);
      if (isNaN(parsedAmt) || parsedAmt < 10 || parsedAmt > 50000) {
        return res.status(400).json({ success: false, message: 'Recharge amount must be between ₹10 and ₹50,000' });
      }
      finalAmount = parsedAmt;
      finalDuration = Math.max(1, Math.floor(finalAmount / pricePerMinute));
    } else {
      return res.status(400).json({ success: false, message: 'Please specify call duration or recharge amount' });
    }

    // 3. Create REAL Razorpay order (or fallback for dev without keys)
    let razorpayOrderId;
    const razorpay = getRazorpay();

    if (razorpay) {
      // Real Razorpay SDK order creation
      const order = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100), // Razorpay uses paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}_${sId}`,
        notes: {
          studentId: String(student.id),
          studentName: student.name,
          schoolId: String(school.id),
          schoolName: school.name,
          parentId: String(parentId),
          durationMinutes: String(finalDuration),
        },
      });
      razorpayOrderId = order.id;
    } else {
      // Development fallback when Razorpay keys not configured
      razorpayOrderId = `order_dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.warn('⚠️  Razorpay not configured — using dev order ID:', razorpayOrderId);
    }

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

    audit('payment_order_created', 'recharge', recharge.id, {
      amount: finalAmount,
      razorpayOrderId,
      studentId: student.id,
    });

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
        razorpayKeyId: config.razorpay.keyId || '',
        razorpayConfigured: isConfigured(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Confirm online payment (Razorpay callback / client verification) ───────
exports.confirmOnlineRecharge = async (req, res, next) => {
  try {
    const audit = auditFromReq(req);
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

    const payId = razorpayPaymentId || paymentId || transactionId;
    const ordId = razorpayOrderId || recharge.razorpayOrderId;

    if (!payId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    // Razorpay cryptographic signature verification
    const keySecret = config.razorpay.keySecret;
    if (keySecret && razorpaySignature && ordId) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${ordId}|${payId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        audit('payment_signature_failed', 'recharge', recharge.id, { razorpayOrderId: ordId });
        return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
      }
    } else if (keySecret) {
      // Keys configured but signature not provided — reject in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ success: false, message: 'Payment signature is required for verification' });
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
          razorpaySignature: razorpaySignature || null,
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
          description: `Video call recharge (${recharge.durationMinutes || Math.floor(recharge.amount / (recharge.pricePerMinute || 2.5))} mins @ ₹${recharge.pricePerMinute || 2.5}/min)`,
        },
      }),
    ]);

    audit('payment_verified', 'recharge', recharge.id, {
      amount: recharge.amount,
      paymentId: payId,
      newBalance,
    });

    // Create notification for the parent
    try {
      await prisma.notification.create({
        data: {
          userId: recharge.parentId || req.user.id,
          userRole: 'parent',
          title: 'Payment Successful',
          message: `₹${recharge.amount.toFixed(2)} credited for ${recharge.student.name} (${recharge.durationMinutes} mins)`,
          type: 'payment',
          metadata: JSON.stringify({ rechargeId: recharge.id, amount: recharge.amount }),
        },
      });
    } catch (notifErr) {
      console.error('Notification create error:', notifErr.message);
    }

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

// ─── Razorpay Webhook Endpoint — Idempotent Processing ─────────────────────
exports.handlePaymentWebhook = async (req, res, next) => {
  try {
    // 1. Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = config.razorpay.webhookSecret;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('Webhook signature verification failed');
        return res.status(400).json({ status: 'invalid_signature' });
      }
    } else if (webhookSecret && !signature) {
      // Secret configured but no signature in request — suspicious
      console.error('Webhook received without signature');
      return res.status(400).json({ status: 'missing_signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;
    const webhookEventId = req.body.event_id || `evt_${Date.now()}`;

    console.log(`📩 Webhook received: ${event} (${webhookEventId})`);

    // 2. Idempotency check — has this event already been processed?
    const existingProcessed = await prisma.recharge.findUnique({
      where: { webhookEventId },
    });
    if (existingProcessed) {
      console.log(`⏩ Webhook ${webhookEventId} already processed — skipping`);
      return res.json({ status: 'already_processed' });
    }

    // 3. Handle different event types
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      if (!paymentEntity) return res.json({ status: 'no_payment_entity' });

      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

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
              webhookEventId,
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

        console.log(`✅ Webhook: Payment ${razorpayPaymentId} credited for recharge #${recharge.id}`);
      } else if (recharge && recharge.status === 'success') {
        // Already processed via client callback — just store the webhook event ID
        await prisma.recharge.update({
          where: { id: recharge.id },
          data: { webhookEventId },
        });
        console.log(`⏩ Webhook: Recharge #${recharge.id} already successful`);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id;
        const recharge = await prisma.recharge.findFirst({
          where: { razorpayOrderId, status: 'pending' },
        });

        if (recharge) {
          await prisma.recharge.update({
            where: { id: recharge.id },
            data: {
              status: 'failed',
              failureReason: paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed',
              webhookEventId,
            },
          });
          console.log(`❌ Webhook: Payment failed for recharge #${recharge.id}`);
        }
      }
    } else if (event === 'refund.created' || event === 'refund.processed') {
      const refundEntity = payload?.refund?.entity;
      if (refundEntity) {
        const razorpayPaymentId = refundEntity.payment_id;
        const recharge = await prisma.recharge.findFirst({
          where: { razorpayPaymentId },
        });

        if (recharge) {
          const refundAmount = (refundEntity.amount || 0) / 100; // paise to rupees
          await prisma.recharge.update({
            where: { id: recharge.id },
            data: {
              refundId: refundEntity.id,
              refundAmount,
              refundStatus: event === 'refund.processed' ? 'processed' : 'initiated',
              refundedAt: new Date(),
              status: refundAmount >= recharge.amount ? 'refunded' : recharge.status,
              webhookEventId,
            },
          });

          // Debit wallet for refund if it was a full refund
          if (event === 'refund.processed' && refundAmount > 0) {
            const student = await prisma.student.findUnique({ where: { id: recharge.studentId } });
            if (student) {
              const newBalance = Math.max(0, parseFloat((student.walletBalance - refundAmount).toFixed(2)));
              await prisma.$transaction([
                prisma.student.update({
                  where: { id: recharge.studentId },
                  data: { walletBalance: newBalance },
                }),
                prisma.walletTransaction.create({
                  data: {
                    studentId: recharge.studentId,
                    type: 'debit',
                    amount: refundAmount,
                    balanceAfter: newBalance,
                    referenceType: 'refund',
                    referenceId: String(recharge.id),
                    description: `Refund processed (₹${refundAmount.toFixed(2)})`,
                  },
                }),
              ]);
            }
          }

          console.log(`💸 Webhook: Refund ${refundEntity.id} for recharge #${recharge.id}`);
        }
      }
    }

    // Always return 200 to Razorpay
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 even on error to prevent Razorpay retries for non-transient failures
    res.json({ status: 'error', message: error.message });
  }
};

// ─── SuperAdmin: Initiate Refund ────────────────────────────────────────────
exports.initiateRefund = async (req, res, next) => {
  try {
    const audit = auditFromReq(req);
    const { rechargeId, amount, reason } = req.body;

    const rId = parseInt(rechargeId, 10);
    if (isNaN(rId)) {
      return res.status(400).json({ success: false, message: 'Invalid recharge ID' });
    }

    const recharge = await prisma.recharge.findUnique({
      where: { id: rId },
      include: { student: true },
    });

    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Recharge not found' });
    }

    if (recharge.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Only successful payments can be refunded' });
    }

    if (recharge.refundId) {
      return res.status(400).json({ success: false, message: 'Refund already initiated for this payment' });
    }

    const refundAmount = amount ? parseFloat(amount) : recharge.amount;
    if (refundAmount <= 0 || refundAmount > recharge.amount) {
      return res.status(400).json({ success: false, message: 'Invalid refund amount' });
    }

    const razorpay = getRazorpay();
    let refundId;

    if (razorpay && recharge.razorpayPaymentId && !recharge.razorpayPaymentId.startsWith('pay_dev_')) {
      // Real Razorpay refund
      const refund = await razorpay.payments.refund(recharge.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        notes: {
          reason: reason || 'Admin initiated refund',
          rechargeId: String(recharge.id),
        },
      });
      refundId = refund.id;
    } else {
      // Dev mode refund
      refundId = `rfnd_dev_${Date.now()}`;
    }

    // Update recharge record
    const updatedRecharge = await prisma.recharge.update({
      where: { id: recharge.id },
      data: {
        refundId,
        refundAmount,
        refundStatus: 'initiated',
        refundedAt: new Date(),
        status: refundAmount >= recharge.amount ? 'refunded' : 'success',
        notes: `${recharge.notes || ''} | Refund: ${reason || 'Admin initiated'}`.trim(),
      },
    });

    // Debit wallet immediately for dev mode
    if (!razorpay || (recharge.razorpayPaymentId && recharge.razorpayPaymentId.startsWith('pay_dev_'))) {
      const newBalance = Math.max(0, parseFloat((recharge.student.walletBalance - refundAmount).toFixed(2)));
      await prisma.$transaction([
        prisma.student.update({
          where: { id: recharge.studentId },
          data: { walletBalance: newBalance },
        }),
        prisma.walletTransaction.create({
          data: {
            studentId: recharge.studentId,
            type: 'debit',
            amount: refundAmount,
            balanceAfter: newBalance,
            referenceType: 'refund',
            referenceId: String(recharge.id),
            description: `Refund: ₹${refundAmount.toFixed(2)} (${reason || 'Admin initiated'})`,
          },
        }),
      ]);
    }

    audit('refund_initiated', 'recharge', recharge.id, {
      refundId,
      refundAmount,
      reason,
    });

    res.json({
      success: true,
      message: `Refund of ₹${refundAmount.toFixed(2)} initiated successfully`,
      data: updatedRecharge,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get wallet + transactions ──────────────────────────────────────────────
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

// ─── Payment Transaction History ────────────────────────────────────────────
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
