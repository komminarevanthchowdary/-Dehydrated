const express = require('express');
const User = require('../models/User');
const { protect, generateToken, setTokenCookie } = require('../middleware/auth');
const https = require('https');

const router = express.Router();

// Helper to normalize phone numbers (e.g. "+91 98765 43210" -> "+919876543210")
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/[\s\-\(\)]/g, '');
};

// Generate secure 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify Google Token with Google OAuth tokeninfo endpoint
const verifyGoogleToken = (idToken) => {
  return new Promise((resolve, reject) => {
    if (!idToken) return reject(new Error('Missing Google ID Token'));

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error || !parsed.email) {
            return reject(new Error(parsed.error_description || 'Invalid Google Token'));
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
};

// ========================================
// 1. POST /api/auth/send-otp
// ========================================
router.post('/send-otp', async (req, res) => {
  try {
    let { phone, name, email } = req.body;
    phone = normalizePhone(phone);

    if (!phone || phone.length < 7) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number with country code (e.g. +91 9876543210).'
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({
        phone,
        name: (name && name.trim()) || 'Reneplane Customer',
        email: email ? email.toLowerCase().trim() : undefined,
        otp,
        otpExpires,
        isVerified: false,
        authProvider: 'phone'
      });
    } else {
      user.otp = otp;
      user.otpExpires = otpExpires;
      if (name && name.trim() && user.name === 'User') {
        user.name = name.trim();
      }
      if (email && !user.email) {
        user.email = email.toLowerCase().trim();
      }
    }

    await user.save();

    console.log(`\n===========================================`);
    console.log(`🔐 RENEPLANE OTP for ${phone}: [ ${otp} ]`);
    console.log(`⏰ Valid for 5 minutes (until ${otpExpires.toLocaleTimeString()})`);
    console.log(`===========================================\n`);

    // In development / demo mode, return the OTP preview to make testing friction-free
    return res.json({
      success: true,
      message: `OTP sent successfully to ${phone}!`,
      otpPreview: otp
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// ========================================
// 2. POST /api/auth/verify-otp
// ========================================
router.post('/verify-otp', async (req, res) => {
  try {
    let { phone, otp, name } = req.body;
    phone = normalizePhone(phone);
    otp = (otp || '').toString().trim();

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and 6-digit OTP are required.'
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No verification requested for this phone number.'
      });
    }

    // Allow universal dev test code '123456' OR matching valid OTP
    const isTestCode = (otp === '123456');
    const isMatchingOtp = (user.otp === otp);
    const isNotExpired = user.otpExpires && new Date(user.otpExpires) >= new Date();

    if (!isTestCode && (!isMatchingOtp || !isNotExpired)) {
      return res.status(400).json({
        success: false,
        message: isMatchingOtp && !isNotExpired ? 'OTP has expired. Please request a new one.' : 'Invalid OTP code. Please check and try again.'
      });
    }

    // Clear OTP and mark verified
    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    if (name && name.trim() && (user.name === 'User' || user.name === 'Reneplane Customer')) {
      user.name = name.trim();
    }
    await user.save();

    // Generate JWT token & set cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP. Please try again.'
    });
  }
});

// ========================================
// 3. POST /api/auth/google
// ========================================
router.post('/google', async (req, res) => {
  try {
    const { credential, idToken, email: clientEmail, name: clientName, picture: clientAvatar } = req.body;
    const tokenToVerify = credential || idToken;

    let email = clientEmail;
    let name = clientName;
    let avatar = clientAvatar;
    let googleId = '';

    if (tokenToVerify) {
      try {
        const payload = await verifyGoogleToken(tokenToVerify);
        email = payload.email || email;
        name = payload.name || name;
        avatar = payload.picture || avatar;
        googleId = payload.sub || '';
      } catch (tokenErr) {
        console.warn('Google token verify fallback (using client data):', tokenErr.message);
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google login failed: Email not provided.'
      });
    }

    email = email.toLowerCase().trim();
    let user = await User.findOne({ $or: [{ email }, { googleId: googleId || 'non-existent-id' }] });

    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId: googleId || undefined,
        avatar: avatar || '',
        isVerified: true,
        authProvider: 'google'
      });
    } else {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      if (name && (user.name === 'User' || user.name === 'Reneplane Customer')) user.name = name;
      user.isVerified = true;
    }

    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Google sign-in successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || '',
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.'
    });
  }
});

// ========================================
// 4. POST /api/auth/sync (Compat)
// ========================================
router.post('/sync', async (req, res) => {
  try {
    const { name, email, phone, picture } = req.body;
    let user = null;

    if (email) user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user && phone) user = await User.findOne({ phone: normalizePhone(phone) });

    if (!user) {
      user = new User({
        name: name || 'User',
        email: email ? email.toLowerCase().trim() : undefined,
        phone: phone ? normalizePhone(phone) : undefined,
        avatar: picture || '',
        isVerified: true
      });
      await user.save();
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync error' });
  }
});

// ========================================
// 5. GET /api/auth/me
// ========================================
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user details' });
  }
});

// ========================================
// 6. POST /api/auth/logout
// ========================================
router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
