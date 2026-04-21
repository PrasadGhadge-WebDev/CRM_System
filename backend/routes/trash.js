const express = require('express');
const controller = require('../controllers/trashController');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { preventDemoDelete } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

router.get('/', controller.listTrash);
router.post('/:id/restore', validateObjectId('id'), controller.restoreTrashItem);
router.delete('/:id', validateObjectId('id'), preventDemoDelete, controller.deleteTrashItem);

module.exports = router;
