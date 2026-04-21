const express = require('express');
const router = express.Router();
const { getStatuses, upsertStatus, reorderStatuses, deleteStatus } = require('../controllers/statusController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Manager'));

router.get('/', getStatuses);
router.post('/', authorize('Admin'), upsertStatus);
router.put('/reorder', authorize('Admin'), reorderStatuses);
router.delete('/:id', authorize('Admin'), deleteStatus);

module.exports = router;
