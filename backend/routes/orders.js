const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);
router.post('/', ordersController.createOrder);

module.exports = router;
