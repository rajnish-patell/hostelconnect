const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Super Admin only
router.post('/', authorize('superadmin'), schoolController.createSchool);
router.get('/', authorize('superadmin'), schoolController.listSchools);
router.put('/:id', authorize('superadmin'), schoolController.updateSchool);
router.patch('/:id/status', authorize('superadmin'), schoolController.toggleSchoolStatus);

// Pricing endpoints
router.get('/:id/pricing', authorize('superadmin', 'school', 'parent', 'student'), schoolController.getSchoolPricing);
router.put('/:id/pricing', authorize('superadmin', 'school'), schoolController.updateSchoolPricing);

// Super Admin or School
router.get('/:id', authorize('superadmin', 'school'), schoolController.getSchool);
router.patch('/:id/settings', authorize('superadmin', 'school'), schoolController.updateSchoolSettings);

module.exports = router;
