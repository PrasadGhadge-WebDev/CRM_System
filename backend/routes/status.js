const express = require('express');
const router = express.Router();
const { getStatuses, upsertStatus, reorderStatuses, deleteStatus } = require('../controllers/statusController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// All staff can view statuses to populate dropdowns/filters
router.get('/', getStatuses);

// Management restricted
router.post('/', authorize('Admin'), upsertStatus);
router.put('/reorder', authorize('Admin'), reorderStatuses);
router.delete('/:id', authorize('Admin'), deleteStatus);

module.exports = router;
