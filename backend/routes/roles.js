const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/rolesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Manager')); // Only admins/managers manage roles

router.get('/', getRoles);
router.post('/', authorize('Admin'), createRole);
router.put('/:id', authorize('Admin'), updateRole);
router.delete('/:id', authorize('Admin'), deleteRole);

module.exports = router;
