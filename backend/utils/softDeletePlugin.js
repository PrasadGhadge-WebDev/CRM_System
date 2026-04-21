const mongoose = require('mongoose');

/**
 * Mongoose Soft Delete Plugin
 * Adds isDeleted, deletedAt, and deletedBy fields.
 * Includes hooks to filter deleted records by default.
 */
function softDeletePlugin(schema) {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  });

  // Query Middleware - Filter out deleted records by default
  const queryMethods = ['find', 'findOne', 'countDocuments', 'count', 'estimatedDocumentCount'];
  
  queryMethods.forEach(method => {
    schema.pre(method, function() {
      const options = this.getOptions();
      const query = this.getQuery();
      
      // Bypass filter if explicitly searching for isDeleted status or using special option
      if (options.isDeleted || options.includeDeleted) return;
      if (query && (query.isDeleted === true || query.isDeleted === false)) return;

      this.where({ isDeleted: { $ne: true } });
    });
  });

  schema.pre('aggregate', function() {
    const pipeline = this.pipeline();
    // Search for existing isDeleted filter in pipeline
    const existing = pipeline.some(stage => 
      stage.$match && (stage.$match.isDeleted === true || stage.$match.isDeleted === false)
    );
    if (!existing) {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  // Soft Delete Instance Method
  schema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId || null;
    return this.save({ validateBeforeSave: false });
  };

  // Restore Instance Method
  schema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save({ validateBeforeSave: false });
  };
}

module.exports = softDeletePlugin;
