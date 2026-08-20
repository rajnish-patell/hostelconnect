const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/recharge.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public Webhook route — must be before authenticate middleware
// Raw body is parsed in server.js for signature verification
router.post('/webhook', rechargeController.handlePaymentWebhook);

router.use(authenticate);

router.post('/manual', authorize('school', 'superadmin'), rechargeController.manualRecharge);
router.post('/online/order', authorize('parent'), rechargeController.createOnlineRechargeOrder);
router.post('/online/confirm', authorize('parent', 'superadmin'), rechargeController.confirmOnlineRecharge);
router.post('/refund', authorize('superadmin'), rechargeController.initiateRefund);
router.get('/wallet', authorize('student', 'parent', 'school', 'superadmin'), rechargeController.getWallet);
router.get('/wallet/:studentId', authorize('parent', 'school', 'superadmin'), rechargeController.getWallet);
router.get('/transactions', authorize('parent', 'school', 'superadmin'), rechargeController.listTransactions);

module.exports = router;
