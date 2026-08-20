const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('superadmin', 'school'), studentController.createStudent);
router.get('/', authorize('superadmin', 'school'), studentController.listStudents);
router.get('/:id', authorize('superadmin', 'school', 'student'), studentController.getStudent);
router.put('/:id', authorize('superadmin', 'school'), studentController.updateStudent);
router.patch('/:id/status', authorize('superadmin', 'school'), studentController.toggleStudentStatus);
router.post('/:id/parents', authorize('superadmin', 'school'), studentController.linkParent);
router.put('/parents/:id', authorize('superadmin', 'school'), studentController.updateParent);
router.delete('/:studentId/parents/:parentId', authorize('superadmin', 'school'), studentController.unlinkParent);

module.exports = router;
