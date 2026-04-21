const TrashEntry = require('../models/TrashEntry');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const User = require('../models/User');
const Activity = require('../models/Activity');
const LeadStatus = require('../models/LeadStatus');
const LeadSource = require('../models/LeadSource');
const CustomerType = require('../models/CustomerType');
const IndustryType = require('../models/IndustryType');
const LeadNote = require('../models/LeadNote');
const Attachment = require('../models/Attachment');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const SupportTicket = require('../models/SupportTicket');

const MODEL_MAP = {
  company: Company,
  customer: Customer,
  lead: Lead,
  deal: Deal,
  product: Product,
  user: User,
  activity: Activity,
  'lead-status': LeadStatus,
  'lead-source': LeadSource,
  'customer-type': CustomerType,
  'industry-type': IndustryType,
  lead_note: LeadNote,
  attachment: Attachment,
  note: Note,
  notification: Notification,
  support_ticket: SupportTicket,
};

function buildTrashTitle(entityType, data = {}) {
  return (
    data.name ||
    data.company_name ||
    data.label ||
    data.username ||
    data.email ||
    data.subject ||
    data.title ||
    `${entityType} ${data._id || ''}`.trim()
  );
}

async function moveDocumentToTrash({ entityType, document, deletedBy, data: explicitData }) {
  if (!document) return null;

  const data = explicitData || (typeof document.toObject === 'function' ? document.toObject() : { ...document });
  delete data.id;

  await TrashEntry.findOneAndUpdate(
    { entity_type: entityType, entity_id: String(data._id) },
    {
      entity_type: entityType,
      entity_id: String(data._id),
      company_id: data.company_id || (document && document.company_id) || undefined,
      title: buildTrashTitle(entityType, data),
      data,
      deleted_by: deletedBy || undefined,
      deleted_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (typeof document.deleteOne === 'function') {
    await document.deleteOne();
  }

  return data;
}

async function restoreTrashEntry(entry) {
  const Model = MODEL_MAP[entry.entity_type];
  if (!Model) {
    throw new Error(`Restore is not supported for ${entry.entity_type}`);
  }

  const restored = { ...(entry.data || {}) };
  const relatedLeadNotes = Array.isArray(restored._leadNotes) ? restored._leadNotes : [];
  delete restored._leadNotes;
  delete restored.id;

  await Model.collection.insertOne(restored);

  if (entry.entity_type === 'lead' && relatedLeadNotes.length) {
    await LeadNote.collection.insertMany(
      relatedLeadNotes.map((note) => {
        const serialized = { ...note };
        delete serialized.id;
        return serialized;
      }),
      { ordered: false },
    );
  }

  await entry.deleteOne();

  return restored;
}

module.exports = {
  MODEL_MAP,
  buildTrashTitle,
  moveDocumentToTrash,
  restoreTrashEntry,
};
