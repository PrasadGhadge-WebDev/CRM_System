const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const SupportTicketSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false, index: true },
    ticket_id: { type: String, unique: true, index: true }, // TKT-101 format
    ticket_no: { type: Number }, // Raw sequence number
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, default: 'open', index: true }, // open, in-progress, resolved, closed
    priority: { type: String, default: 'medium', index: true }, // low, medium, high, urgent
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, trim: true },
    is_escalated: { type: Boolean, default: false },
    escalation_reason: { type: String, trim: true },
    escalated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalated_at: { type: Date },
    solution: { type: String, trim: true },
    notes: [
      {
        text: { type: String, required: true },
        author_name: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Auto-generate sequential Ticket ID per company
SupportTicketSchema.pre('save', async function () {
  if (this.isNew) {
    const lastTicket = await this.constructor
      .findOne({ company_id: this.company_id })
      .sort({ ticket_no: -1 });

    this.ticket_no = lastTicket && lastTicket.ticket_no ? lastTicket.ticket_no + 1 : 101;
    this.ticket_id = `TKT-${this.ticket_no}`;
  }
});

withIdTransform(SupportTicketSchema);

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
