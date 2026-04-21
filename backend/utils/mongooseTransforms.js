function withIdTransform(schema) {
  const transform = {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  };

  schema.set('toJSON', transform);
  schema.set('toObject', transform);
}

module.exports = { withIdTransform };

