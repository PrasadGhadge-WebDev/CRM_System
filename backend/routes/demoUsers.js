const express = require('express');
const controller = require('../controllers/demoUsersController');
const { validateObjectId } = require('../middleware/validateObjectId');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin'));

router.get('/count', controller.countDemoUsers);
router.get('/', controller.listDemoUsers);
router.get('/:id', validateObjectId('id'), controller.getDemoUser);
router.delete('/:id', validateObjectId('id'), controller.deleteDemoUser);
router.post('/:id/convert', validateObjectId('id'), controller.convertToUser);

module.exports = router;
