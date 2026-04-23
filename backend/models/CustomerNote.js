const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const CustomerNoteSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    attachments: [{ type: String }], // URLs to files if needed
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(CustomerNoteSchema);

module.exports = mongoose.model('CustomerNote', CustomerNoteSchema);
