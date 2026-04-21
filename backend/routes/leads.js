const express = require('express');
const controller = require('../controllers/leadsController');
const { validateObjectId } = require('../middleware/validateObjectId');
const { protect } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit, preventDemoExport } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

router.get('/export-excel', preventDemoExport, controller.exportLeadsExcel);
router.get('/', controller.listLeads);
router.post('/bulk-delete', preventDemoDelete, controller.bulkDeleteLeads);
router.patch('/bulk-update', preventDemoEdit, controller.bulkUpdateLeads);
router.post('/', controller.createLead);
router.get('/:id', validateObjectId('id'), controller.getLead);
router.put('/:id', validateObjectId('id'), preventDemoEdit, controller.updateLead);
router.patch('/:id/followup', validateObjectId('id'), preventDemoEdit, controller.updateFollowup);
router.patch('/:id/status', validateObjectId('id'), preventDemoEdit, controller.updateLeadStatus);
router.delete('/:id', validateObjectId('id'), preventDemoDelete, controller.deleteLead);

router.get('/:id/notes', validateObjectId('id'), controller.listLeadNotes);
router.post('/:id/notes', validateObjectId('id'), controller.addLeadNote);
router.delete(
  '/:id/notes/:noteId',
  validateObjectId('id'),
  validateObjectId('noteId'),
  preventDemoDelete,
  controller.deleteLeadNote,
);

module.exports = router;
