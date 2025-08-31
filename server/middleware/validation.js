const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      }
    });
  }
  next();
};

// Email validation rules
const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  validateRequest
];

// OTP validation rules
const validateOtp = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  validateRequest
];

// Registration validation rules
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, dots, underscores, and hyphens'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest
];

// Login validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

module.exports = {
  validateEmail,
  validateOtp,
  validateRegistration,
  validateLogin,
  validateRequest
};