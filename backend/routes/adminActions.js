const express = require('express');
const { approveUser, rejectUser } = require('../controllers/adminActionController');

const router = express.Router();

router.get('/approve/:token', approveUser);
router.get('/reject/:token', rejectUser);

module.exports = router;
