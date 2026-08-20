const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require superadmin role
router.use(authenticate);
router.use(authorize('superadmin'));

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/payments', adminController.listPayments);
router.get('/payments/failed', adminController.listFailedPayments);
router.get('/refunds', adminController.listRefunds);
router.get('/activity-logs', adminController.listActivityLogs);
router.get('/revenue/summary', adminController.getRevenueSummary);

module.exports = router;
