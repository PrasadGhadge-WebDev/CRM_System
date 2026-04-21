const express = require('express');
const controller = require('../controllers/companiesController');
const { validateObjectId } = require('../middleware/validateObjectId');
const { protect } = require('../middleware/auth');
const { preventDemoDelete, preventDemoEdit } = require('../middleware/demoGuard');

const router = express.Router();

router.use(protect);

router.get('/', controller.listCompanies);
router.post('/', controller.createCompany);
router.get('/:id', validateObjectId('id'), controller.getCompany);
router.put('/:id', validateObjectId('id'), preventDemoEdit, controller.updateCompany);
router.delete('/:id', validateObjectId('id'), preventDemoDelete, controller.deleteCompany);

module.exports = router;
