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
    category: {
      type: String,
      required: true,
      index: true, // e.g., 'Rent', 'Salary', 'Marketing'
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
    note: {
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

withIdTransform(expenseSchema);

module.exports = mongoose.model('Expense', expenseSchema);
