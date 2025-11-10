const { pool } = require("../config/database");

/**
 * Get user's party (first 3 battle-ready NFTs)
 */
async function getUserParty(userId) {
  const res = await pool.query(
    `SELECT id, name, level, hp, attack, defense, speed, affinity, experience, media_url
     FROM nfts
     WHERE owner_id = $1
       AND (is_heroic = FALSE OR is_heroic IS NULL)
       AND (is_hero_retired = FALSE OR is_hero_retired IS NULL)
     ORDER BY created_at ASC
     LIMIT 3`,
    [userId]
  );

  return res.rows.map((nft) => ({
    id: nft.id,
    name: nft.name,
    level: nft.level || 1,
    hp: nft.hp || 100,
    attack: nft.attack || 20,
    defense: nft.defense || 10,
    speed: nft.speed || 10,
    affinity: nft.affinity || 'neutral',
    experience: nft.experience || 0,
    media_url: nft.media_url,
  }));
}

module.exports = {
  getUserParty,
};

