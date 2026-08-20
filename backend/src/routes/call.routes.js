const express = require('express');
const router = express.Router();
const callController = require('../controllers/call.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/initiate', authorize('student'), callController.initiateCall);
router.post('/:callId/accept', authorize('parent'), callController.acceptCall);
router.post('/:callId/end', authorize('student', 'parent'), callController.endCall);
router.put('/:callId/end', authorize('student', 'parent'), callController.endCall);
router.post('/:callId/reject', authorize('parent', 'student'), callController.rejectCall);
router.get('/history', authorize('student', 'parent', 'school', 'superadmin'), callController.getCallHistory);

module.exports = router;
