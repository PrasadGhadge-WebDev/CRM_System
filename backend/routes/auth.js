const express = require('express');
const {
  register,
  login,
  demoLogin,
  demoSwitchRole,
  getMe,
  updateMe,
  updatePassword,
  updateSettings,
  logout,
  verifyOnboarding,
  completeOnboarding,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { preventDemoSettings, preventDemoEdit } = require('../middleware/demoGuard');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo-login', demoLogin);
router.post('/demo-switch', protect, demoSwitchRole);
router.post('/onboarding/verify', verifyOnboarding);
router.post('/onboarding/complete', completeOnboarding);
router.get('/me', protect, getMe);
router.put('/me', protect, preventDemoEdit, updateMe);
router.put('/password', protect, preventDemoEdit, updatePassword);
router.put('/settings', protect, preventDemoSettings, updateSettings);
router.get('/logout', protect, logout);

module.exports = router;
