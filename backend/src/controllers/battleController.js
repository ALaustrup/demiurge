const { pool } = require('../config/database');
const { initiateBattle } = require('../services/blockchain');

/**
 * Initiate a battle
 */
const createBattle = async (req, res) => {
  try {
    const { attackerNFTId, defenderNFTId } = req.body;

    if (!attackerNFTId || !defenderNFTId) {
      return res.status(400).json({ message: 'Both NFT IDs are required' });
    }

    // Verify attacker owns the NFT
    const attackerNFT = await pool.query(
      'SELECT * FROM nfts WHERE id = $1 AND owner_id = $2',
      [attackerNFTId, req.user.id]
    );

    if (attackerNFT.rows.length === 0) {
      return res.status(404).json({ message: 'Attacker NFT not found or not owned' });
    }

    // Get defender NFT
    const defenderNFT = await pool.query(
      'SELECT * FROM nfts WHERE id = $1',
      [defenderNFTId]
    );

    if (defenderNFT.rows.length === 0) {
      return res.status(404).json({ message: 'Defender NFT not found' });
    }

    if (attackerNFTId === defenderNFTId) {
      return res.status(400).json({ message: 'Cannot battle own NFT' });
    }

    // Create battle in database
    const battleResult = await pool.query(
      `INSERT INTO battles (battle_id, attacker_nft_id, defender_nft_id, attacker_id, defender_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        Date.now(), // Simple battle ID
        attackerNFTId,
        defenderNFTId,
        req.user.id,
        defenderNFT.rows[0].owner_id,
        'pending',
      ]
    );

    res.status(201).json({
      message: 'Battle initiated successfully',
      battle: battleResult.rows[0],
    });
  } catch (error) {
    console.error('Create battle error:', error);
    res.status(500).json({ message: 'Failed to create battle' });
  }
};

/**
 * Complete a battle
 */
const completeBattle = async (req, res) => {
  try {
    const { battleId } = req.params;

    const battleResult = await pool.query(
      `SELECT b.*, 
              an.battle_power as attacker_power, an.name as attacker_name,
              dn.battle_power as defender_power, dn.name as defender_name
       FROM battles b
       JOIN nfts an ON b.attacker_nft_id = an.id
       JOIN nfts dn ON b.defender_nft_id = dn.id
       WHERE b.id = $1`,
      [battleId]
    );

    if (battleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Battle not found' });
    }

    const battle = battleResult.rows[0];

    if (battle.status !== 'pending') {
      return res.status(400).json({ message: 'Battle already completed' });
    }

    // Determine winner (simplified logic - add randomness)
    const randomFactor = Math.floor(Math.random() * 20);
    const attackerTotalPower = battle.attacker_power + randomFactor;
    const defenderTotalPower = battle.defender_power + (20 - randomFactor);

    let winnerId;
    let bitsReward;

    if (attackerTotalPower > defenderTotalPower) {
      winnerId = battle.attacker_id;
      bitsReward = 60; // 10 base + 50 win bonus
    } else {
      winnerId = battle.defender_id;
      bitsReward = 10; // Base reward
    }

    // Update battle
    await pool.query(
      `UPDATE battles 
       SET winner_id = $1, bits_reward = $2, status = $3, completed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [winnerId, bitsReward, 'completed', battleId]
    );

    // Award bits to winner
    await pool.query(
      'UPDATE users SET bits = bits + $1 WHERE id = $2',
      [bitsReward, winnerId]
    );

    // Award participation bits to loser
    const loserId = winnerId === battle.attacker_id ? battle.defender_id : battle.attacker_id;
    await pool.query(
      'UPDATE users SET bits = bits + $1 WHERE id = $2',
      [5, loserId] // Participation reward
    );

    res.json({
      message: 'Battle completed',
      winner: winnerId === battle.attacker_id ? 'attacker' : 'defender',
      bitsReward,
    });
  } catch (error) {
    console.error('Complete battle error:', error);
    res.status(500).json({ message: 'Failed to complete battle' });
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
  getUserBattles,
  getBattleById,
};

