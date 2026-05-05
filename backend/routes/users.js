const express = require('express');
const controller = require('../controllers/usersController');
const { validateObjectId } = require('../middleware/validateObjectId');

const { protect, authorize } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

// List users is allowed for all staff so they can see team members for assignment/filters
router.get('/', controller.listUsers);

// Restricted operations
router.post('/', authorize('Admin', 'HR'), controller.createUser);
router.get('/:id', validateObjectId('id'), authorize('Admin', 'HR'), controller.getUser);
router.put('/:id/reset-password', validateObjectId('id'), authorize('Admin', 'HR'), preventDemoEdit, controller.resetUserPassword);
router.put('/:id', validateObjectId('id'), authorize('Admin', 'HR'), preventDemoEdit, controller.updateUser);
router.delete('/:id', validateObjectId('id'), authorize('Admin', 'HR'), preventDemoDelete, controller.deleteUser);

module.exports = router;
