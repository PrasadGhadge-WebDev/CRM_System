const express = require('express');
const router = express.Router();
const { listNotes, createNote, deleteNote } = require('../controllers/notesController');
const { protect } = require('../middleware/auth');
const { preventDemoDelete } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', listNotes);
router.post('/', createNote);
router.delete('/:id', preventDemoDelete, deleteNote);

module.exports = router;
