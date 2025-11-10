const { pool } = require("../config/database");
const { simulateRpgBattle, calculateXpGain, applyExperience } = require("./battleEngine");

/**
 * Get player's NFT with moves for RPG party
 */
async function getPlayerNftForParty(userId, nftId) {
  const res = await pool.query(
    `SELECT n.*, u.id AS owner_user_id
     FROM nfts n
     JOIN users u ON u.id = n.owner_id
     WHERE n.id = $1 AND n.owner_id = $2
       AND (n.is_heroic = FALSE OR n.is_heroic IS NULL)
       AND (n.is_hero_retired = FALSE OR n.is_hero_retired IS NULL)`,
    [nftId, userId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const nft = res.rows[0];

  // Load moves for this NFT
  const movesResult = await pool.query(
    `SELECT m.*
     FROM moves m
     JOIN nft_moves nm ON m.id = nm.move_id
     WHERE nm.nft_id = $1`,
    [nftId]
  );

  let moves = movesResult.rows;
  
    // If no moves, get default neutral moves
    if (moves.length === 0) {
      const defaultMovesResult = await pool.query(
      `SELECT * FROM moves WHERE type = 'neutral' ORDER BY id LIMIT 4`
    );
    moves = defaultMovesResult.rows;

      // If still no moves, create a basic move
      if (moves.length === 0) {
        const basicMoveResult = await pool.query(
        `INSERT INTO moves (name, description, type, power, accuracy, energy_cost, target)
         VALUES ('Tackle', 'A basic attack', 'neutral', 40, 100, 0, 'enemy')
         RETURNING *`
      );
      moves = [basicMoveResult.rows[0]];

      // Assign to NFT
      await pool.query(
        `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2)`,
        [nftId, moves[0].id]
      );
    }
  }

  return {
    id: nft.id,
    name: nft.name,
    level: nft.level || 1,
    hp: nft.hp || 100,
    attack: nft.attack || 20,
    defense: nft.defense || 10,
    speed: nft.speed || 10,
    affinity: nft.affinity || 'neutral',
    experience: nft.experience || 0,
    userId: nft.owner_user_id,
    moves: moves.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      power: m.power,
      accuracy: m.accuracy,
      energyCost: m.energy_cost || 0,
      target: m.target || 'enemy',
    })),
  };
}

/**
 * Generate a wild enemy with stats similar to player NFT
 */
function generateWildEnemyForNft(playerNft) {
  const baseName = playerNft.name || "Wild Entity";
  const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier

  // Get default moves (neutral type)
  const defaultMoves = [
    { id: 1, name: "Tackle", type: "neutral", power: 40, accuracy: 100, energyCost: 0, target: "enemy" },
    { id: 2, name: "Strike", type: "neutral", power: 50, accuracy: 95, energyCost: 0, target: "enemy" },
    { id: 3, name: "Bash", type: "neutral", power: 45, accuracy: 90, energyCost: 0, target: "enemy" },
    { id: 4, name: "Hit", type: "neutral", power: 35, accuracy: 100, energyCost: 0, target: "enemy" },
  ];

  const wild = {
    id: 0, // synthetic, no DB id
    name: "Wild " + baseName,
    level: Math.max(1, Math.round((playerNft.level || 1) * variation)),
    hp: Math.round((playerNft.hp || 100) * variation),
    attack: Math.round((playerNft.attack || 20) * variation),
    defense: Math.round((playerNft.defense || 10) * variation),
    speed: Math.round((playerNft.speed || 10) * variation),
    affinity: playerNft.affinity || "neutral",
    experience: 0,
    userId: 0, // system user
    moves: defaultMoves,
  };

  return wild;
}

/**
 * Start an RPG encounter
 */
async function startRpgEncounter(userId, attackerNftId) {
  // 1) Load player's NFT from DB
  const playerNft = await getPlayerNftForParty(userId, attackerNftId);
  if (!playerNft) {
    const error = new Error("Invalid party NFT.");
    error.code = "INVALID_PARTY_NFT";
    throw error;
  }

  // 2) Generate a wild enemy
  const wildEnemy = generateWildEnemyForNft(playerNft);

  // 3) Simulate battle using RPG battle function
  const seed = Date.now() + Math.random() * 1000;
  const result = simulateRpgBattle(playerNft, wildEnemy, {
    seed,
    maxTurns: 100,
  });

  // 4) Apply XP and Bits to player if they won
  if (result.winner === "player") {
    const xpResult = applyExperience(playerNft, result.xpGained);

    // Update NFT in DB
    await pool.query(
      `UPDATE nfts
       SET experience = $1,
           level = $2,
           hp = hp + $3,
           attack = attack + $4,
           defense = defense + $5,
           speed = speed + $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        xpResult.experience,
        xpResult.level,
        xpResult.statIncreases.hp,
        xpResult.statIncreases.attack,
        xpResult.statIncreases.defense,
        xpResult.statIncreases.speed,
        playerNft.id,
      ]
    );

    // Update user Bits
    await pool.query(
      `UPDATE users
       SET bits = bits + $1
       WHERE id = $2`,
      [result.bitsReward, userId]
    );
  }

  // 5) Return full battle payload for frontend replay
  return {
    attacker: {
      id: playerNft.id,
      name: playerNft.name,
      level: playerNft.level,
      hp: playerNft.hp,
      maxHp: playerNft.hp,
      attack: playerNft.attack,
      defense: playerNft.defense,
      speed: playerNft.speed,
      affinity: playerNft.affinity,
    },
    defender: {
      id: wildEnemy.id,
      name: wildEnemy.name,
      level: wildEnemy.level,
      hp: wildEnemy.hp,
      maxHp: wildEnemy.hp,
      attack: wildEnemy.attack,
      defense: wildEnemy.defense,
      speed: wildEnemy.speed,
      affinity: wildEnemy.affinity,
    },
    turns: result.turns,
    winner: result.winner,
    xpGained: result.xpGained,
    bitsReward: result.bitsReward,
  };
}

module.exports = {
  startRpgEncounter,
  getPlayerNftForParty,
};

