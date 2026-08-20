const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/superadmin/login', authController.superAdminLogin);
router.post('/school/login', authController.schoolLogin);
router.post('/student/login', authController.studentLogin);
router.post('/parent/request-otp', authController.parentRequestOtp);
router.post('/parent/verify-otp', authController.parentVerifyOtp);

module.exports = router;
