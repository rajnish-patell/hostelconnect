const prisma = require('../utils/prisma');

// GET /admin/dashboard/stats — Aggregated platform statistics
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalSchools,
      activeSchools,
      totalStudents,
      activeStudents,
      totalParents,
      totalCalls,
      completedCalls,
      rechargeStats,
      failedPayments,
      pendingPayments,
      refundedPayments,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { isActive: true } }),
      prisma.student.count(),
      prisma.student.count({ where: { isActive: true } }),
      prisma.parent.count(),
      prisma.callSession.count(),
      prisma.callSession.count({ where: { status: 'completed' } }),
      prisma.recharge.aggregate({
        where: { status: 'success' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.recharge.count({ where: { status: 'failed' } }),
      prisma.recharge.count({ where: { status: 'pending' } }),
      prisma.recharge.count({ where: { status: 'refunded' } }),
    ]);

    // Total call minutes
    const callDurationAgg = await prisma.callSession.aggregate({
      where: { status: 'completed' },
      _sum: { durationSeconds: true },
    });

    const totalRevenue = rechargeStats._sum.amount || 0;
    const totalSuccessfulPayments = rechargeStats._count || 0;
    const totalCallMinutes = Math.floor((callDurationAgg._sum.durationSeconds || 0) / 60);

    res.json({
      success: true,
      data: {
        schools: { total: totalSchools, active: activeSchools },
        students: { total: totalStudents, active: activeStudents },
        parents: { total: totalParents },
        calls: { total: totalCalls, completed: completedCalls, totalMinutes: totalCallMinutes },
        payments: {
          totalRevenue,
          successfulPayments: totalSuccessfulPayments,
          failedPayments,
          pendingPayments,
          refundedPayments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/payments — Paginated payment list with filters
exports.listPayments = async (req, res, next) => {
  try {
    const { status, schoolId, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (status) where.status = status;
    if (schoolId) where.schoolId = parseInt(schoolId, 10);

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [payments, total] = await Promise.all([
      prisma.recharge.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, studentId: true, school: { select: { id: true, name: true, schoolCode: true } } },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      prisma.recharge.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/payments/failed — Failed payments
exports.listFailedPayments = async (req, res, next) => {
  try {
    const payments = await prisma.recharge.findMany({
      where: { status: 'failed' },
      include: {
        student: {
          select: { id: true, name: true, studentId: true, school: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

// GET /admin/refunds — Refund history
exports.listRefunds = async (req, res, next) => {
  try {
    const refunds = await prisma.recharge.findMany({
      where: {
        OR: [
          { status: 'refunded' },
          { refundId: { not: null } },
        ],
      },
      include: {
        student: {
          select: { id: true, name: true, studentId: true, school: { select: { id: true, name: true } } },
        },
      },
      orderBy: { refundedAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: refunds });
  } catch (error) {
    next(error);
  }
};

// GET /admin/activity-logs — Paginated audit logs
exports.listActivityLogs = async (req, res, next) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;

    const where = {};
    if (action) where.action = action;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/revenue/summary — Revenue grouped by school
exports.getRevenueSummary = async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        schoolCode: true,
      },
    });

    const revenueBySchool = await Promise.all(
      schools.map(async (school) => {
        const agg = await prisma.recharge.aggregate({
          where: { schoolId: school.id, status: 'success' },
          _sum: { amount: true },
          _count: true,
        });
        return {
          schoolId: school.id,
          schoolName: school.name,
          schoolCode: school.schoolCode,
          totalRevenue: agg._sum.amount || 0,
          totalTransactions: agg._count || 0,
        };
      })
    );

    const totalRevenue = revenueBySchool.reduce((sum, s) => sum + s.totalRevenue, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        bySchool: revenueBySchool,
      },
    });
  } catch (error) {
    next(error);
  }
};
