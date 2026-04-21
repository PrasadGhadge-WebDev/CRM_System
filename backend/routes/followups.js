const express = require('express');
const controller = require('../controllers/followupsController');
const { protect } = require('../middleware/auth');
const { preventDemoEdit } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

router.post('/', preventDemoEdit, controller.createFollowup);

module.exports = router;

