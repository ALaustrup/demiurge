const { pool } = require('../config/database');
const { initiateBattle } = require('../services/blockchain');
const { getUserHero } = require('../services/heroService');
const { getCurrentSeason } = require('../services/ladderService');

/**
 * Initiate a battle
 */
const createBattle = async (req, res) => {
  try {
    const { attackerNFTId, defenderNFTId, battleType = 'normal', ranked = false } = req.body;

    let finalAttackerNFTId = attackerNFTId;
    let finalBattleType = battleType;
    let finalIsRanked = false;

    // Validate ranked battles
    if (ranked === true) {
      if (battleType !== 'heroic') {
        return res.status(400).json({ message: 'Ranked battles must be heroic type' });
      }

      // Check for active season
      const season = await getCurrentSeason();
      if (!season) {
        return res.status(400).json({ message: 'Ranked mode is currently unavailable; no active season.' });
      }

      finalIsRanked = true;
    }

    // Handle heroic battles
    if (battleType === 'heroic') {
      // Get user's hero
      const hero = await getUserHero(req.user.id);
      if (!hero) {
        return res.status(400).json({ message: 'No Heroic DNFT found; forge one first.' });
      }

      // Check hero is not retired
      const heroCheck = await pool.query(
        'SELECT is_hero_retired FROM nfts WHERE id = $1',
        [hero.id]
      );
      if (heroCheck.rows[0]?.is_hero_retired) {
        return res.status(400).json({ message: 'Your Heroic DNFT is retired. Please regenerate it.' });
      }

      finalAttackerNFTId = hero.id;
    } else {
      // Normal battle - verify attacker owns the NFT
      if (!attackerNFTId) {
        return res.status(400).json({ message: 'Attacker NFT ID is required for normal battles' });
      }

      const attackerNFT = await pool.query(
        'SELECT * FROM nfts WHERE id = $1 AND owner_id = $2 AND (is_heroic IS NULL OR is_heroic = FALSE) AND (is_hero_retired IS NULL OR is_hero_retired = FALSE)',
        [attackerNFTId, req.user.id]
      );

      if (attackerNFT.rows.length === 0) {
        return res.status(404).json({ message: 'Attacker NFT not found, not owned, or is a hero (use heroic battle type)' });
      }

      // Prevent using heroes in normal battles
      if (attackerNFT.rows[0].is_heroic) {
        return res.status(400).json({ message: 'Heroic NFTs can only be used in heroic battles. Set battleType to "heroic".' });
      }
    }

    if (!defenderNFTId) {
      return res.status(400).json({ message: 'Defender NFT ID is required' });
    }

    // Get defender NFT
    const defenderNFT = await pool.query(
      'SELECT * FROM nfts WHERE id = $1 AND (is_hero_retired IS NULL OR is_hero_retired = FALSE)',
      [defenderNFTId]
    );

    if (defenderNFT.rows.length === 0) {
      return res.status(404).json({ message: 'Defender NFT not found or is retired' });
    }

    if (finalAttackerNFTId === defenderNFTId) {
      return res.status(400).json({ message: 'Cannot battle own NFT' });
    }

    // Prevent battling own NFT (unless explicitly allowed)
    if (defenderNFT.rows[0].owner_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot battle your own NFT' });
    }

    // Create battle in database
    const battleResult = await pool.query(
      `INSERT INTO battles (battle_id, attacker_nft_id, defender_nft_id, attacker_id, defender_id, battle_type, is_ranked, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        Date.now(), // Simple battle ID
        finalAttackerNFTId,
        defenderNFTId,
        req.user.id,
        defenderNFT.rows[0].owner_id,
        finalBattleType,
        finalIsRanked,
        'pending',
      ]
    );

    res.status(201).json({
      message: 'Battle initiated successfully',
      battle: battleResult.rows[0],
    });
  } catch (error) {
    console.error('Create battle error:', error);
    res.status(500).json({ message: 'Failed to create battle: ' + error.message });
  }
};

/**
 * Complete a battle (legacy - now uses new battle engine)
 */
const completeBattle = async (req, res) => {
  try {
    const { battleId } = req.params;
    const { resolveBattle } = require('../services/battleService');

    // Use new battle engine
    const result = await resolveBattle(parseInt(battleId), req.user.id);

    res.json({
      message: 'Battle completed',
      battleId: result.battleId,
      winnerUserId: result.winnerUserId,
      loserUserId: result.loserUserId,
      winnerNftId: result.winnerNftId,
      loserNftId: result.loserNftId,
      bitsReward: result.bitsReward,
      status: result.status,
      turns: result.turns,
      attacker: result.attacker,
      defender: result.defender,
    });
  } catch (error) {
    console.error('Complete battle error:', error);
    if (error.message === 'Battle not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Battle already completed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to complete battle: ' + error.message });
  }
};

/**
 * Resolve a battle (new endpoint with full battle log)
 */
const resolveBattle = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolveBattle: resolveBattleService } = require('../services/battleService');

    const result = await resolveBattleService(parseInt(id), req.user.id);

    res.json(result);
  } catch (error) {
    console.error('Resolve battle error:', error);
    if (error.message === 'Battle not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Battle already completed') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to resolve battle: ' + error.message });
  }
};

/**
 * Get user's battles
 */
const getUserBattles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
              an.name as attacker_nft_name, an.media_url as attacker_nft_image,
              dn.name as defender_nft_name, dn.media_url as defender_nft_image,
              u1.username as attacker_username,
              u2.username as defender_username,
              u3.username as winner_username
       FROM battles b
       JOIN nfts an ON b.attacker_nft_id = an.id
       JOIN nfts dn ON b.defender_nft_id = dn.id
       JOIN users u1 ON b.attacker_id = u1.id
       JOIN users u2 ON b.defender_id = u2.id
       LEFT JOIN users u3 ON b.winner_id = u3.id
       WHERE b.attacker_id = $1 OR b.defender_id = $1
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      battles: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get user battles error:', error);
    res.status(500).json({ message: 'Failed to get battles' });
  }
};

/**
 * Get user's heroic battles only
 */
const getMyHeroBattles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
              an.name as attacker_nft_name, an.media_url as attacker_nft_image,
              dn.name as defender_nft_name, dn.media_url as defender_nft_image,
              u1.username as attacker_username,
              u2.username as defender_username,
              u3.username as winner_username
       FROM battles b
       JOIN nfts an ON b.attacker_nft_id = an.id
       JOIN nfts dn ON b.defender_nft_id = dn.id
       JOIN users u1 ON b.attacker_id = u1.id
       JOIN users u2 ON b.defender_id = u2.id
       LEFT JOIN users u3 ON b.winner_id = u3.id
       WHERE (b.attacker_id = $1 OR b.defender_id = $1) AND b.battle_type = 'heroic'
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      battles: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get heroic battles error:', error);
    res.status(500).json({ message: 'Failed to get heroic battles' });
  }
};

/**
 * Get battle by ID
 */
const getBattleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, 
              an.name as attacker_nft_name, an.media_url as attacker_nft_image, an.battle_power as attacker_power,
              dn.name as defender_nft_name, dn.media_url as defender_nft_image, dn.battle_power as defender_power,
              u1.username as attacker_username,
              u2.username as defender_username,
              u3.username as winner_username
       FROM battles b
       JOIN nfts an ON b.attacker_nft_id = an.id
       JOIN nfts dn ON b.defender_nft_id = dn.id
       JOIN users u1 ON b.attacker_id = u1.id
       JOIN users u2 ON b.defender_id = u2.id
       LEFT JOIN users u3 ON b.winner_id = u3.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Battle not found' });
    }

    res.json({ battle: result.rows[0] });
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(500).json({ message: 'Failed to get battle' });
  }
};

module.exports = {
  createBattle,
  completeBattle,
  resolveBattle,
  getUserBattles,
  getBattleById,
  getMyHeroBattles,
};

