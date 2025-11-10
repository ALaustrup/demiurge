const crypto = require('crypto');
const { verifyMessage } = require('ethers');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Normalize Ethereum address to lowercase
 */
const normalizeAddress = (address) => {
  if (!address) return null;
  return address.toLowerCase();
};

/**
 * Generate a random nonce
 */
const generateNonce = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a wallet challenge (nonce-based)
 * @param {string} address - Ethereum address
 * @returns {Promise<{message: string, nonce: string}>}
 */
const createWalletChallenge = async (address) => {
  const normalizedAddress = normalizeAddress(address);
  
  if (!normalizedAddress || !normalizedAddress.match(/^0x[a-f0-9]{40}$/)) {
    throw new Error('Invalid Ethereum address');
  }

  // Generate nonce
  const nonce = generateNonce();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Create message to sign
  const message = `Demiurge sign-in\n\nWallet: ${normalizedAddress}\nNonce: ${nonce}\nIssued at: ${now.toISOString()}`;

  // Store nonce in database
  await pool.query(
    `INSERT INTO wallet_nonces (address, nonce, expires_at)
     VALUES ($1, $2, $3)`,
    [normalizedAddress, nonce, expiresAt]
  );

  return { message, nonce };
};

/**
 * Verify wallet signature and return verified address
 * @param {string} address - Ethereum address
 * @param {string} signature - Signature from wallet
 * @returns {Promise<string>} - Verified normalized address
 */
const verifyWalletSignature = async (address, signature) => {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress || !normalizedAddress.match(/^0x[a-f0-9]{40}$/)) {
    throw new Error('Invalid Ethereum address');
  }

  // Find latest unused, unexpired nonce for this address
  const nonceResult = await pool.query(
    `SELECT nonce, created_at, expires_at
     FROM wallet_nonces
     WHERE address = $1 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedAddress]
  );

  if (nonceResult.rows.length === 0) {
    throw new Error('No valid challenge found. Please request a new challenge.');
  }

  const { nonce, created_at } = nonceResult.rows[0];

  // Reconstruct message exactly as in challenge
  const message = `Demiurge sign-in\n\nWallet: ${normalizedAddress}\nNonce: ${nonce}\nIssued at: ${created_at.toISOString()}`;

  // Verify signature
  let recoveredAddress;
  try {
    recoveredAddress = verifyMessage(message, signature);
  } catch (error) {
    throw new Error('Invalid signature format');
  }

  const normalizedRecovered = normalizeAddress(recoveredAddress);

  if (normalizedRecovered !== normalizedAddress) {
    throw new Error('Signature verification failed. Address mismatch.');
  }

  // Mark nonce as used
  await pool.query(
    `UPDATE wallet_nonces SET used = TRUE WHERE address = $1 AND nonce = $2`,
    [normalizedAddress, nonce]
  );

  return normalizedAddress;
};

/**
 * Link wallet to existing user or create/login user by wallet
 * @param {string} verifiedAddress - Verified normalized address
 * @param {number|null} existingUserId - Optional existing user ID from JWT
 * @returns {Promise<{user: object, token: string}>}
 */
const linkOrLoginUserByWallet = async (verifiedAddress, existingUserId = null) => {
  // If user is already logged in (has JWT), link wallet to that account
  if (existingUserId) {
    const userResult = await pool.query(
      'SELECT id, username, email, wallet_address FROM users WHERE id = $1',
      [existingUserId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Check if wallet is already linked to this user
    if (user.wallet_address && normalizeAddress(user.wallet_address) === verifiedAddress) {
      // Already linked, return user
      return await getUserWithToken(user.id);
    }

    // Check if wallet is linked to another user
    const existingWalletUser = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [verifiedAddress]
    );

    if (existingWalletUser.rows.length > 0) {
      const otherUserId = existingWalletUser.rows[0].id;
      if (otherUserId !== user.id) {
        throw new Error('This wallet is already linked to another account');
      }
    }

    // Link wallet to user
    await pool.query(
      'UPDATE users SET wallet_address = $1 WHERE id = $2',
      [verifiedAddress, user.id]
    );

    return await getUserWithToken(user.id);
  }

  // No existing user - find or create user by wallet
  const existingUser = await pool.query(
    'SELECT id, username, email, wallet_address, bits, social_score, social_tier FROM users WHERE wallet_address = $1',
    [verifiedAddress]
  );

  if (existingUser.rows.length > 0) {
    // User exists, return with token
    const user = existingUser.rows[0];
    return await getUserWithToken(user.id);
  }

  // Create new user
  const username = `demiurge_${verifiedAddress.slice(2, 8)}`;
  
  // Generate a random password hash (user won't use password, but DB requires it)
  const dummyPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(dummyPassword, 10);

  const newUserResult = await pool.query(
    `INSERT INTO users (username, email, password_hash, wallet_address, bits, social_score, social_tier)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, email, wallet_address, bits, social_score, social_tier`,
    [username, null, passwordHash, verifiedAddress, 0, 0, 'bronze']
  );

  const newUser = newUserResult.rows[0];
  return await getUserWithToken(newUser.id);
};

/**
 * Get user and generate JWT token (reuse existing JWT logic)
 */
const getUserWithToken = async (userId) => {
  const userResult = await pool.query(
    'SELECT id, username, email, wallet_address, bits, social_score, social_tier FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  // Generate JWT token (same as email/password login)
  const token = jwt.sign(
    { userId: user.id, email: user.email || user.wallet_address },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.wallet_address,
      bits: user.bits,
      socialScore: user.social_score,
      socialTier: user.social_tier,
    },
    token,
  };
};

module.exports = {
  createWalletChallenge,
  verifyWalletSignature,
  linkOrLoginUserByWallet,
  normalizeAddress,
};

