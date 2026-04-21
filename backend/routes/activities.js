const express = require('express');
const router = express.Router();
const {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} = require('../controllers/activitiesController');
const { protect } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', listActivities);
router.post('/', createActivity);
router.put('/:id', preventDemoEdit, updateActivity);
router.delete('/:id', preventDemoDelete, deleteActivity);

module.exports = router;
