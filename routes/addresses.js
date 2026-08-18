const express = require('express');
const User = require('../models/User');
const { protect, attachUser } = require('../middleware/auth');
const { addressRules, handleValidation } = require('../middleware/validate');

const router = express.Router();

// GET /api/addresses
router.get('/', protect, attachUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/addresses
router.post('/', protect, attachUser, addressRules, handleValidation, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.addresses.length >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 addresses allowed' });
    }

    const { line1, line2, city, state, zip } = req.body;
    const newAddress = { line1, line2: line2 || '', city, state, zip, isPrimary: user.addresses.length === 0 };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/addresses/:id/primary
router.put('/:id/primary', protect, attachUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    user.addresses.forEach(a => a.isPrimary = false);
    address.isPrimary = true;
    await user.save();

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error('Set primary address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/addresses/:id
router.delete('/:id', protect, attachUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const wasPrimary = address.isPrimary;
    user.addresses.pull(req.params.id);

    // If deleted was primary, set first remaining as primary
    if (wasPrimary && user.addresses.length > 0) {
      user.addresses[0].isPrimary = true;
    }

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
