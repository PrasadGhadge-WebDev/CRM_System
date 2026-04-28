const express = require('express');
const controller = require('../controllers/usersController');
const { validateObjectId } = require('../middleware/validateObjectId');

const { protect, authorize } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'HR'));

router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.get('/:id', validateObjectId('id'), controller.getUser);
router.put('/:id/reset-password', validateObjectId('id'), preventDemoEdit, controller.resetUserPassword);
router.put('/:id', validateObjectId('id'), preventDemoEdit, controller.updateUser);
router.delete('/:id', validateObjectId('id'), preventDemoDelete, controller.deleteUser);

module.exports = router;
