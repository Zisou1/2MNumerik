const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
};

// Format error response
const errorResponse = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode
  };
};

// Format success response
const successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

// Sanitize user data (remove sensitive information)
const sanitizeUser = (user) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

module.exports = {
  generateToken,
  verifyToken,
  errorResponse,
  successResponse,
  sanitizeUser
};
