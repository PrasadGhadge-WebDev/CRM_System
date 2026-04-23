const express = require('express');
const controller = require('../controllers/customersController');
const { validateObjectId } = require('../middleware/validateObjectId');
const { protect } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit, preventDemoExport } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

router.get('/analytics', controller.getCustomerAnalytics);
router.get('/export', preventDemoExport, controller.exportCustomersCsv);
router.post('/import', controller.importCustomersCsv);
router.post('/convert', controller.convertLead);
router.get('/', controller.listCustomers);
router.post('/', controller.createCustomer);
router.get('/:id', validateObjectId('id'), controller.getCustomer);
router.put('/:id', validateObjectId('id'), preventDemoEdit, controller.updateCustomer);
router.delete('/:id', validateObjectId('id'), preventDemoDelete, controller.deleteCustomer);
router.post('/:id/notes', validateObjectId('id'), controller.addNote);
router.get('/:id/notes', validateObjectId('id'), controller.listNotes);

module.exports = router;
