const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STORE = new Map();
const EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const createToken = () => crypto.randomBytes(18).toString('hex');

const addFile = ({ filePath, originalName, mimeType, size, allowedUserIds }) => {
  const token = createToken();
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  STORE.set(token, {
    filePath,
    originalName,
    mimeType,
    size,
    expiresAt,
    allowedUserIds: (allowedUserIds || []).map(String)
  });
  return { token, expiresAt };
};

const getFile = (token) => {
  const record = STORE.get(token);
  if (!record) return null;
  if (record.expiresAt.getTime() <= Date.now()) {
    try {
      fs.unlinkSync(record.filePath);
    } catch {}
    STORE.delete(token);
    return null;
  }
  return record;
};

const removeFile = (token) => {
  const record = STORE.get(token);
  if (!record) return;
  try {
    fs.unlinkSync(record.filePath);
  } catch {}
  STORE.delete(token);
};

const cleanup = () => {
  const now = Date.now();
  for (const [token, record] of STORE.entries()) {
    if (record.expiresAt.getTime() <= now) {
      try {
        fs.unlinkSync(record.filePath);
      } catch {}
      STORE.delete(token);
    }
  }
};

setInterval(cleanup, 15 * 60 * 1000).unref();

module.exports = {
  ensureDir,
  addFile,
  getFile,
  removeFile,
  EXPIRY_MS,
  STORE
};
