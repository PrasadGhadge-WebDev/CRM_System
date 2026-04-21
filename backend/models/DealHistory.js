const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const DealHistorySchema = new mongoose.Schema(
  {
    deal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g., 'created', 'status_change', 'value_change', 'assigned'
    old_value: { type: mongoose.Schema.Types.Mixed },
    new_value: { type: mongoose.Schema.Types.Mixed },
    field: { type: String }, // optional, if specific field changed
    change_reason: { type: String }, // optional note about why the change happened
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(DealHistorySchema);

module.exports = mongoose.model('DealHistory', DealHistorySchema);
