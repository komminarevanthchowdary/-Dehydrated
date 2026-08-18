const mongoose = require('mongoose');

const partnerLeadSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  status: { type: String, default: 'new', enum: ['new', 'contacted', 'converted', 'rejected'] }
}, { timestamps: true });

module.exports = mongoose.model('PartnerLead', partnerLeadSchema);
