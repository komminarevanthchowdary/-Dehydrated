const express = require('express');
const Order = require('../models/Order');
const { protect, attachUser } = require('../middleware/auth');
const { orderRules, handleValidation } = require('../middleware/validate');

const router = express.Router();

// Generate order ID
const generateOrderId = () => 'RP-' + Math.floor(100000 + Math.random() * 900000);

// POST /api/orders
router.post('/', protect, attachUser, orderRules, handleValidation, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, subtotal, shipping, total } = req.body;

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shipping,
      total
    });

    res.status(201).json({
      success: true,
      order: {
        orderId: order.orderId,
        items: order.items,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders
router.get('/', protect, attachUser, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders/:orderId
router.get('/:orderId', protect, attachUser, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
