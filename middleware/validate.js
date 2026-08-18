const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required')
    .matches(/^[0-9]{7,15}$/).withMessage('Valid phone number required'),
  body('countryCode').optional().trim().escape()
];

const otpRules = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric')
];

const addressRules = [
  body('line1').trim().notEmpty().withMessage('Address line 1 is required').escape(),
  body('line2').optional().trim().escape(),
  body('city').trim().notEmpty().withMessage('City is required').escape(),
  body('state').trim().notEmpty().withMessage('State is required').escape(),
  body('zip').trim().notEmpty().withMessage('ZIP code is required').escape()
];

const orderRules = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').trim().notEmpty().withMessage('Item name required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('Valid quantity required'),
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name required').escape(),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone required'),
  body('shippingAddress.line1').trim().notEmpty().withMessage('Address required').escape(),
  body('shippingAddress.city').trim().notEmpty().withMessage('City required').escape(),
  body('shippingAddress.state').trim().notEmpty().withMessage('State required').escape(),
  body('shippingAddress.zip').trim().notEmpty().withMessage('ZIP required').escape(),
  body('paymentMethod').isIn(['card', 'upi', 'cod']).withMessage('Valid payment method required')
];

const partnerRules = [
  body('companyName').trim().notEmpty().withMessage('Company name is required').escape(),
  body('contactPerson').trim().notEmpty().withMessage('Contact person is required').escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required')
];

module.exports = {
  handleValidation,
  registerRules,
  otpRules,
  addressRules,
  orderRules,
  partnerRules
};
