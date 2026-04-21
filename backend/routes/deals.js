const express = require('express');
const router = express.Router();
const {
  listDeals,
  createDeal,
  getDeal,
  updateDeal,
  deleteDeal,
  getDealAnalytics,
  getDealHistory,
} = require('../controllers/dealsController');
const { protect } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', listDeals);
router.get('/analytics', getDealAnalytics);
router.post('/', createDeal);
router.get('/:id', getDeal);
router.put('/:id', preventDemoEdit, updateDeal);
router.delete('/:id', preventDemoDelete, deleteDeal);
router.get('/:id/history', getDealHistory);

module.exports = router;
