const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Public auth routes
router.post('/superadmin/login', authController.superAdminLogin);
router.post('/school/login', authController.schoolLogin);
router.post('/student/login', authController.studentLogin);

// Parent OTP routes (and aliases /send-otp, /verify-otp, /resend-otp)
router.post('/parent/request-otp', authController.parentRequestOtp);
router.post('/parent/resend-otp', authController.parentResendOtp);
router.post('/parent/verify-otp', authController.parentVerifyOtp);
router.post('/send-otp', authController.parentRequestOtp);
router.post('/resend-otp', authController.parentResendOtp);
router.post('/verify-otp', authController.parentVerifyOtp);


// Password reset (public)
router.post('/password-reset/request', authController.requestPasswordReset);
router.post('/password-reset/confirm', authController.confirmPasswordReset);

// Authenticated routes
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
