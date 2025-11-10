const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { ethers } = require('ethers');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate wallet address (for demo, in production use proper wallet generation)
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, wallet_address, bits, social_score, social_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, wallet_address, bits, social_score, social_tier`,
      [username, email, passwordHash, walletAddress, 0, 0, 'bronze']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        bits: user.bits,
        socialScore: user.social_score,
        socialTier: user.social_tier,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, wallet_address, bits, social_score, social_tier FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        bits: user.bits,
        socialScore: user.social_score,
        socialTier: user.social_tier,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, wallet_address, bits, social_score, social_tier, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.wallet_address,
      bits: user.bits,
      socialScore: user.social_score,
      socialTier: user.social_tier,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};

