const express = require('express');
const router = express.Router();
const controller = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Unified settings access
router.get('/', controller.getSettings);
router.put('/', authorize('Admin', 'Manager'), controller.updateSettings);

// Sources CRUD
router.post('/sources', authorize('Admin', 'Manager'), controller.saveLeadSource);
router.delete('/sources/:id', authorize('Admin'), controller.deleteLeadSource);

// Statuses CRUD
router.post('/statuses', authorize('Admin', 'Manager'), controller.saveLeadStatus);
router.put('/statuses/reorder', authorize('Admin', 'Manager'), controller.reorderStatuses);
router.delete('/statuses/:id', authorize('Admin'), controller.deleteLeadStatus);

module.exports = router;
