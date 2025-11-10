const { pool } = require('../config/database');
const { listNFT, buyNFT } = require('../services/blockchain');

/**
 * List NFT on marketplace
 */
const listNFTForSale = async (req, res) => {
  try {
    const { nftId, price } = req.body;

    if (!nftId || !price) {
      return res.status(400).json({ message: 'NFT ID and price are required' });
    }

    // Verify NFT ownership
    const nftResult = await pool.query(
      'SELECT * FROM nfts WHERE id = $1 AND owner_id = $2',
      [nftId, req.user.id]
    );

    if (nftResult.rows.length === 0) {
      return res.status(404).json({ message: 'NFT not found or not owned by user' });
    }

    const nft = nftResult.rows[0];

    // Check if already listed
    const existingListing = await pool.query(
      'SELECT * FROM marketplace_listings WHERE nft_id = $1 AND status = $2',
      [nftId, 'active']
    );

    if (existingListing.rows.length > 0) {
      return res.status(400).json({ message: 'NFT is already listed' });
    }

    // Create listing in database
    const listingResult = await pool.query(
      `INSERT INTO marketplace_listings (nft_id, seller_id, price, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nftId, req.user.id, price, 'active']
    );

    // List on blockchain (requires user's private key)
    // For now, we'll just store in database
    // In production, integrate with wallet provider

    res.status(201).json({
      message: 'NFT listed successfully',
      listing: listingResult.rows[0],
    });
  } catch (error) {
    console.error('List NFT error:', error);
    res.status(500).json({ message: 'Failed to list NFT' });
  }
};

/**
 * Get marketplace listings
 */
const getListings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT l.*, n.name, n.description, n.media_type, n.media_url, n.battle_power, n.level,
              u.username as seller_username
       FROM marketplace_listings l
       JOIN nfts n ON l.nft_id = n.id
       JOIN users u ON l.seller_id = u.id
       WHERE l.status = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      ['active', limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM marketplace_listings WHERE status = $1',
      ['active']
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      listings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Failed to get listings' });
  }
};

/**
 * Buy NFT from marketplace
 */
const buyNFTFromMarketplace = async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ message: 'Listing ID is required' });
    }

    // Get listing
    const listingResult = await pool.query(
      `SELECT l.*, n.*, u.username as seller_username
       FROM marketplace_listings l
       JOIN nfts n ON l.nft_id = n.id
       JOIN users u ON l.seller_id = u.id
       WHERE l.id = $1 AND l.status = $2`,
      [listingId, 'active']
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found or not active' });
    }

    const listing = listingResult.rows[0];

    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot buy your own NFT' });
    }

    // Update listing status
    await pool.query(
      'UPDATE marketplace_listings SET status = $1 WHERE id = $2',
      ['sold', listingId]
    );

    // Transfer NFT ownership
    await pool.query(
      'UPDATE nfts SET owner_id = $1 WHERE id = $2',
      [req.user.id, listing.nft_id]
    );

    // Transfer Bits (simplified - in production, use proper payment system)
    await pool.query(
      'UPDATE users SET bits = bits - $1 WHERE id = $2',
      [listing.price, req.user.id]
    );

    await pool.query(
      'UPDATE users SET bits = bits + $1 WHERE id = $2',
      [listing.price, listing.seller_id]
    );

    res.json({
      message: 'NFT purchased successfully',
      nft: {
        id: listing.nft_id,
        name: listing.name,
      },
    });
  } catch (error) {
    console.error('Buy NFT error:', error);
    res.status(500).json({ message: 'Failed to buy NFT' });
  }
};

/**
 * Cancel listing
 */
const cancelListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listingResult = await pool.query(
      'SELECT * FROM marketplace_listings WHERE id = $1 AND seller_id = $2',
      [listingId, req.user.id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    await pool.query(
      'UPDATE marketplace_listings SET status = $1 WHERE id = $2',
      ['cancelled', listingId]
    );

    res.json({ message: 'Listing cancelled successfully' });
  } catch (error) {
    console.error('Cancel listing error:', error);
    res.status(500).json({ message: 'Failed to cancel listing' });
  }
};

module.exports = {
  listNFTForSale,
  getListings,
  buyNFTFromMarketplace,
  cancelListing,
};

