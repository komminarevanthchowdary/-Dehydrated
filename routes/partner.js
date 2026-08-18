const express = require('express');
const PartnerLead = require('../models/PartnerLead');
const { partnerRules, handleValidation } = require('../middleware/validate');

const router = express.Router();

// POST /api/partner
router.post('/', partnerRules, handleValidation, async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone } = req.body;

    const lead = await PartnerLead.create({
      companyName,
      contactPerson,
      email,
      phone
    });

    console.log(`\n===== New Partner Lead: ${companyName} - ${contactPerson} (${email}) =====\n`);

    res.status(201).json({
      success: true,
      message: 'Thank you for your interest! We will contact you soon.'
    });
  } catch (error) {
    console.error('Partner lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
