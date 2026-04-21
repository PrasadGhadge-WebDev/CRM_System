const express = require('express');
const controller = require('../controllers/metricsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', controller.getMetrics);
router.get('/team', controller.getTeamPerformance);

module.exports = router;
