const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'powder' },
  weight: { type: String, default: '200g' },
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
