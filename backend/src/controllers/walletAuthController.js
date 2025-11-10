const {
  createWalletChallenge,
  verifyWalletSignature,
  linkOrLoginUserByWallet,
} = require('../services/walletAuthService');

/**
 * Create wallet challenge (step 1)
 */
const challenge = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    const { message } = await createWalletChallenge(address);

    res.json({ message });
  } catch (error) {
    console.error('Wallet challenge error:', error);
    if (error.message.includes('Invalid Ethereum address')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create wallet challenge' });
  }
};

/**
 * Verify wallet signature and login/link (step 2)
 */
const verify = async (req, res) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ message: 'Address and signature are required' });
    }

    // Get existing user ID from JWT if present (for linking)
    const existingUserId = req.user ? req.user.id : null;

    // Verify signature
    const verifiedAddress = await verifyWalletSignature(address, signature);

    // Link or login user
    const { user, token } = await linkOrLoginUserByWallet(verifiedAddress, existingUserId);

    res.json({
      message: existingUserId ? 'Wallet linked successfully' : 'Wallet login successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Wallet verify error:', error);
    
    if (error.message.includes('No valid challenge')) {
      return res.status(401).json({ message: error.message });
    }
    
    if (error.message.includes('Signature verification failed')) {
      return res.status(401).json({ message: 'Invalid wallet signature' });
    }
    
    if (error.message.includes('already linked to another account')) {
      return res.status(409).json({ message: error.message });
    }
    
    if (error.message.includes('Invalid Ethereum address')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Wallet verification failed' });
  }
};

module.exports = {
  challenge,
  verify,
};

