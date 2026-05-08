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
    payment_number: {
      type: String,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    deal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    total_amount: {
      type: Number,
      required: true,
      default: 0
    },
    paid_amount: {
      type: Number,
      required: true,
      default: 0
    },
    pending_amount: {
      type: Number,
      default: 0
    },
    payment_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    payment_mode: {
      type: String,
      enum: ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque', 'Online', 'Other'],
      default: 'UPI',
    },
    transaction_id: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
      index: true
    },
    collected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
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

paymentSchema.pre('save', function(next) {
  // Always update pending amount
  this.pending_amount = Math.max(0, this.total_amount - this.paid_amount);
  
  // Only auto-update status if it's currently one of the flow-based statuses
  // This prevents overwriting manual terminal states like 'Failed' or 'Refunded'
  const flowStatuses = ['Pending', 'Partial', 'Paid'];
  if (flowStatuses.includes(this.status)) {
    if (this.paid_amount >= this.total_amount && this.total_amount > 0) {
      this.status = 'Paid';
    } else if (this.paid_amount > 0) {
      this.status = 'Partial';
    } else {
      this.status = 'Pending';
    }
  }
  
  next();
});


paymentSchema.index({ company_id: 1, payment_number: 1 }, { unique: true });

withIdTransform(paymentSchema);

module.exports = mongoose.model('Payment', paymentSchema);
