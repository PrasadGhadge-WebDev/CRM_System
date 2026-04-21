const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadAttachment,
  listAttachments,
  deleteAttachment,
} = require('../controllers/attachmentsController');
const { protect } = require('../middleware/auth');
const { preventDemoDelete } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', listAttachments);
router.post('/', upload.single('file'), uploadAttachment);
router.delete('/:id', preventDemoDelete, deleteAttachment);

module.exports = router;
