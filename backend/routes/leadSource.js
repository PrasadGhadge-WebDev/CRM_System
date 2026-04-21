const express = require('express');
const router = express.Router();
const { 
  getLeadSources, 
  upsertLeadSource, 
  deleteLeadSource 
} = require('../controllers/leadSourceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getLeadSources);
router.post('/', authorize('Admin'), upsertLeadSource);
router.delete('/:id', authorize('Admin'), deleteLeadSource);

module.exports = router;
