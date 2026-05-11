const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const SupportTicketSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false, index: true },
    ticket_id: { type: String, index: true }, // 101 format
    ticket_no: { type: Number }, // Raw sequence number
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false, index: true },
    user_customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true }, // If the customer is a system user
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, default: 'Open', enum: ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'], index: true },
    priority: { type: String, default: 'Medium', enum: ['Low', 'Medium', 'High'], index: true }, 
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, trim: true },
    sub_category: { type: String, trim: true },
    department: { type: String, enum: ['Support', 'Sales', 'Technical'], default: 'Support' },
    deadline: { type: Date },
    expected_resolution_date: { type: Date },
    closed_at: { type: Date },
    is_escalated: { type: Boolean, default: false },
    escalation_reason: { type: String, trim: true },
    escalated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalated_at: { type: Date },
    solution: { type: String, trim: true },
    attachments: [
      {
        name: String,
        url: String,
        file_type: String,
        uploaded_at: { type: Date, default: Date.now }
      }
    ],
    messages: [
      {
        sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        sender_name: { type: String, required: true },
        sender_role: { type: String, required: true },
        text: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
      }
    ],
    notes: [
      {
        text: { type: String, required: true },
        author_name: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
      }
    ],
    history: [
      {
        action: { type: String, required: true }, // e.g., 'Created', 'Assigned', 'Status Changed', 'Note Added'
        performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performed_by_name: { type: String },
        details: { type: String },
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
    this.ticket_id = `TCK-${this.ticket_no}`;
  }
});

SupportTicketSchema.index({ company_id: 1, ticket_id: 1 }, { unique: true });
SupportTicketSchema.index({ company_id: 1, ticket_no: 1 }, { unique: true });

withIdTransform(SupportTicketSchema);

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
