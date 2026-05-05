const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/rolesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET is allowed for all staff to populate icons/filters
router.get('/', getRoles);

// Management restricted
router.post('/', authorize('Admin'), createRole);
router.put('/:id', authorize('Admin'), updateRole);
router.delete('/:id', authorize('Admin'), deleteRole);

module.exports = router;
