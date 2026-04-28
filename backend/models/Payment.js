const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const paymentSchema = new mongoose.Schema(
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
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    payment_number: {
      type: String,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_method: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Online', 'Cheque', 'UPI', 'Other'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['Paid', 'Partial'],
      default: 'Paid',
    },
    transaction_id: {
      type: String,
      trim: true,
    },
    payment_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
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

withIdTransform(paymentSchema);

module.exports = mongoose.model('Payment', paymentSchema);
