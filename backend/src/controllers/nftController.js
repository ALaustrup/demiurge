const { pool } = require('../config/database');
const { uploadToIPFS, uploadMetadata } = require('../services/ipfs');
const { mintNFT } = require('../services/blockchain');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * Create and mint NFT
 */
const createNFT = async (req, res) => {
  try {
    const { name, description, mediaType } = req.body;
    const file = req.file;

    if (!name || !description || !mediaType || !file) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Upload file to IPFS
    const ipfsResult = await uploadToIPFS(file.buffer, file.originalname);

    // Create metadata
    const metadata = {
      name,
      description,
      image: ipfsResult.url,
      mediaType,
      attributes: [],
    };

    // Upload metadata to IPFS
    const metadataResult = await uploadMetadata(metadata);

    // Mint NFT on blockchain (requires user's private key - in production, use wallet provider)
    // For now, we'll store the NFT info and mint later when user connects wallet
    const tokenURI = metadataResult.url;
    const ipfsHash = ipfsResult.hash;

    // Store NFT in database
    const result = await pool.query(
      `INSERT INTO nfts (token_id, owner_id, creator_id, contract_address, ipfs_hash, token_uri, name, description, media_type, media_url, battle_power, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        null, // token_id will be set after minting
        req.user.id,
        req.user.id,
        process.env.NFT_CONTRACT_ADDRESS || '',
        ipfsHash,
        tokenURI,
        name,
        description,
        mediaType,
        ipfsResult.url,
        100, // default battle power
        1, // default level
      ]
    );

    res.status(201).json({
      message: 'NFT created successfully',
      nft: {
        id: result.rows[0].id,
        name,
        description,
        mediaType,
        ipfsHash,
        tokenURI,
        mediaUrl: ipfsResult.url,
      },
    });
  } catch (error) {
    console.error('Create NFT error:', error);
    res.status(500).json({ message: 'Failed to create NFT' });
  }
};

/**
 * Get user's NFTs
 */
const getUserNFTs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, token_id, name, description, media_type, media_url, battle_power, level, created_at
       FROM nfts
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      nfts: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({ message: 'Failed to get NFTs' });
  }
};

/**
 * Get NFT by ID
 */
const getNFTById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT n.*, u.username as owner_username, c.username as creator_username
       FROM nfts n
       LEFT JOIN users u ON n.owner_id = u.id
       LEFT JOIN users c ON n.creator_id = c.id
       WHERE n.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'NFT not found' });
    }

    res.json({ nft: result.rows[0] });
  } catch (error) {
    console.error('Get NFT error:', error);
    res.status(500).json({ message: 'Failed to get NFT' });
  }
};

/**
 * Get all NFTs (gallery)
 */
const getAllNFTs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT n.*, u.username as owner_username, c.username as creator_username
       FROM nfts n
       LEFT JOIN users u ON n.owner_id = u.id
       LEFT JOIN users c ON n.creator_id = c.id
       ORDER BY n.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM nfts');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      nfts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all NFTs error:', error);
    res.status(500).json({ message: 'Failed to get NFTs' });
  }
};

/**
 * Level up NFT
 */
const levelUpNFT = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM nfts WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'NFT not found or not owned by user' });
    }

    const nft = result.rows[0];

    // Update level and battle power
    await pool.query(
      'UPDATE nfts SET level = level + 1, battle_power = battle_power + 10 WHERE id = $1',
      [id]
    );

    res.json({
      message: 'NFT leveled up successfully',
      newLevel: nft.level + 1,
      newBattlePower: nft.battle_power + 10,
    });
  } catch (error) {
    console.error('Level up NFT error:', error);
    res.status(500).json({ message: 'Failed to level up NFT' });
  }
};

module.exports = {
  createNFT: [upload.single('file'), createNFT],
  getUserNFTs,
  getNFTById,
  getAllNFTs,
  levelUpNFT,
};

