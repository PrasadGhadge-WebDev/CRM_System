const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportController');
const { protect } = require('../middleware/auth');
const { preventDemoEdit } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', controller.getTickets);
router.get('/:id', controller.getTicketById);
router.post('/', preventDemoEdit, controller.createTicket);
router.patch('/:id', preventDemoEdit, controller.updateTicket);
router.patch('/:id/escalate', preventDemoEdit, controller.escalateTicket);
router.patch('/:id/note', preventDemoEdit, controller.addNote);
router.delete('/:id', preventDemoEdit, controller.deleteTicket);

module.exports = router;
