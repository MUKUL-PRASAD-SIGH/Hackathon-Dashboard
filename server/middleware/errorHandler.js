// Standardized error response format
const createErrorResponse = (code, message, details = null, statusCode = 400) => ({
  success: false,
  error: {
    code,
    message,
    details: process.env.NODE_ENV === 'development' ? details : null,
    timestamp: new Date().toISOString()
  }
});

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('🚨 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', err.message, err.details)
    );
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json(
      createErrorResponse('UNAUTHORIZED', 'Authentication required')
    );
  }

  if (err.code === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json(
      createErrorResponse('RATE_LIMIT_EXCEEDED', err.message)
    );
  }

  // Default server error
  res.status(500).json(
    createErrorResponse('SERVER_ERROR', 'Internal server error', err.message, 500)
  );
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  createErrorResponse,
  asyncHandler
};