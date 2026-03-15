const express = require('express');
const path = require('path');
const { getFile } = require('../utils/tempFileStore');
const { verifyToken } = require('../middleware/security');

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

router.get('/:token', authMiddleware, (req, res) => {
  const record = getFile(req.params.token);
  if (!record) {
    return res.status(404).json({ success: false, error: { message: 'File expired or not found' } });
  }

  const userId = String(req.user.id);
  if (!record.allowedUserIds.includes(userId)) {
    return res.status(403).json({ success: false, error: { message: 'Access denied' } });
  }

  res.download(record.filePath, record.originalName || path.basename(record.filePath));
});

module.exports = router;
