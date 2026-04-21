const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  model: { type: String, required: true }, // e.g., 'Lead'
  field: { type: String, required: true }, // e.g., 'leadId'
  prefix: { type: String, default: 'LD-' },
  seq: { type: Number, default: 1000 }
});

CounterSchema.index({ company_id: 1, model: 1, field: 1 }, { unique: true });

module.exports = mongoose.model('Counter', CounterSchema);
