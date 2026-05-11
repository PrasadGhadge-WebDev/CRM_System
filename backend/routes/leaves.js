const express = require('express');
const router = express.Router();
const { 
  applyLeave, 
  getLeaves, 
  actionLeave, 
  cancelLeave 
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', applyLeave);
router.get('/', getLeaves);
router.delete('/:id', cancelLeave);

// Admin/HR actions
router.post('/:id/action', authorize('Admin', 'HR', 'Manager'), actionLeave);

module.exports = router;
