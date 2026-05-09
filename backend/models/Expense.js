const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const expenseSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    custom_id: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    tax_amount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    vendor_name: {
      type: String,
      trim: true,
    },
    payment_method: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'],
      default: 'Cash',
    },
    transaction_id: {
      type: String,
      trim: true,
    },
    receipt_url: {
      type: String,
    },
    note: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paid_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Failed'],
      default: 'Pending',
      index: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approved_date: {
      type: Date,
    },
    payment_date: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

withIdTransform(expenseSchema);

module.exports = mongoose.model('Expense', expenseSchema);
