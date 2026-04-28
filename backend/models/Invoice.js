const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const invoiceSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    deal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    invoice_number: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax_rate: {
      type: Number,
      default: 0,
    },
    tax_amount: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    paid_amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Unpaid',
      index: true,
    },
    due_date: {
      type: Date,
      required: true,
    },
    invoice_date: {
      type: Date,
      default: Date.now,
    },
    paid_date: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    terms_and_conditions: {
      type: String,
      trim: true,
    },
    gst_number: {
      type: String,
      trim: true,
    },
    company_info: {
      name: String,
      address: String,
      phone: String,
      email: String,
    },
    customer_info: {
      name: String,
      phone: String,
      email: String,
      address: String,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

withIdTransform(invoiceSchema);

module.exports = mongoose.model('Invoice', invoiceSchema);
