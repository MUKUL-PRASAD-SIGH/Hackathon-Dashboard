const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/security');

// In-memory user storage (replace with database in production)
const users = new Map();
const verifiedEmails = new Set();

class User {
  constructor(userData) {
    this.id = this.generateId();
    this.name = userData.name;
    this.email = userData.email.toLowerCase().trim();
    this.password = userData.password; // Will be hashed
    this.emailVerified = false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.lastLogin = null;
    this.loginAttempts = 0;
    this.lockedUntil = null;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async hashPassword() {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  generateAuthToken() {
    const payload = {
      id: this.id,
      email: this.email,
      name: this.name
    };
    return generateToken(payload);
  }

  toJSON() {
    // Return user data without sensitive information
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  }

  // Static methods for user management
  static async create(userData) {
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Name, email, and password are required');
    }

    // Check if user already exists
    if (User.findByEmail(userData.email)) {
      throw new Error('User with this email already exists');
    }

    // Check if email is verified
    if (!verifiedEmails.has(userData.email.toLowerCase().trim())) {
      throw new Error('Email not verified. Please verify your email first.');
    }

    // Create new user
    const user = new User(userData);
    await user.hashPassword();
    user.emailVerified = true;

    // Save user
    users.set(user.id, user);
    
    // Remove email from verified set (one-time use)
    verifiedEmails.delete(userData.email.toLowerCase().trim());

    return user;
  }

  static findById(id) {
    return users.get(id);
  }

  static findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const user of users.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  static async authenticate(email, password) {
    const user = User.findByEmail(email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 1000);
      throw new Error(`Account locked. Try again in ${remainingTime} seconds.`);
    }

    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts++;
      user.updatedAt = new Date().toISOString();
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
        throw new Error('Account locked due to too many failed login attempts');
      }
      
      throw new Error('Invalid email or password');
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    return user;
  }

  static markEmailAsVerified(email) {
    const normalizedEmail = email.toLowerCase().trim();
    verifiedEmails.add(normalizedEmail);
  }

  static isEmailVerified(email) {
    const normalizedEmail = email.toLowerCase().trim();
    return verifiedEmails.has(normalizedEmail);
  }

  static removeEmailVerification(email) {
    const normalizedEmail = email.toLowerCase().trim();
    verifiedEmails.delete(normalizedEmail);
  }

  static getAllUsers() {
    return Array.from(users.values()).map(user => user.toJSON());
  }

  static getUserCount() {
    return users.size;
  }

  static deleteUser(id) {
    return users.delete(id);
  }

  // Update user data
  async update(updateData) {
    const allowedFields = ['name', 'email'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'email') {
          // Check if new email already exists
          const existingUser = User.findByEmail(updateData[field]);
          if (existingUser && existingUser.id !== this.id) {
            throw new Error('Email already in use');
          }
          this[field] = updateData[field].toLowerCase().trim();
        } else {
          this[field] = updateData[field];
        }
      }
    }
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    const isValidCurrentPassword = await this.comparePassword(currentPassword);
    
    if (!isValidCurrentPassword) {
      throw new Error('Current password is incorrect');
    }

    this.password = newPassword;
    await this.hashPassword();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
}

module.exports = User;