const { pool } = require('../config/database');
const {
  simulateBattle,
  calculateXpGain,
  applyExperience,
} = require('./battleEngine');
const { applyRankedResult } = require('./ladderService');

/**
 * Load NFT with moves from database
 */
async function loadNFTWithMoves(nftId) {
  // Load NFT
  const nftResult = await pool.query(
    `SELECT n.*, u.id as user_id
     FROM nfts n
     JOIN users u ON n.owner_id = u.id
     WHERE n.id = $1`,
    [nftId]
  );

  if (nftResult.rows.length === 0) {
    throw new Error(`NFT ${nftId} not found`);
  }

  const nft = nftResult.rows[0];

  // Load moves for this NFT
  const movesResult = await pool.query(
    `SELECT m.*
     FROM moves m
     JOIN nft_moves nm ON m.id = nm.move_id
     WHERE nm.nft_id = $1`,
    [nftId]
  );

  // If no moves assigned, assign default moves (will be seeded)
  let moves = movesResult.rows;
  if (moves.length === 0) {
    // Get default moves (neutral type, basic stats)
    const defaultMovesResult = await pool.query(
      `SELECT * FROM moves WHERE type = 'neutral' ORDER BY id LIMIT 4`
    );
    moves = defaultMovesResult.rows;

    // If still no moves, create a basic move on the fly
    if (moves.length === 0) {
      const basicMoveResult = await pool.query(
        `INSERT INTO moves (name, description, type, power, accuracy, energy_cost, target)
         VALUES ('Tackle', 'A basic attack', 'neutral', 40, 100, 0, 'enemy')
         RETURNING *`
      );
      moves = [basicMoveResult.rows[0]];

      // Assign to NFT
      await pool.query(
        `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [nftId, moves[0].id]
      );
    } else {
      // Assign default moves to NFT
      for (const move of moves) {
        await pool.query(
          `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [nftId, move.id]
        );
      }
    }
  }

  return {
    id: nft.id,
    userId: nft.user_id,
    name: nft.name,
    level: nft.level || 1,
    hp: nft.hp || 100,
    baseHp: nft.hp || 100,
    attack: nft.attack || 20,
    defense: nft.defense || 10,
    speed: nft.speed || 10,
    affinity: nft.affinity || 'neutral',
    experience: nft.experience || 0,
    moves: moves.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      power: m.power,
      accuracy: m.accuracy,
      energyCost: m.energy_cost || 0,
      effect: m.effect,
      target: m.target || 'enemy',
    })),
  };
}

/**
 * Resolve a battle using the battle engine
 */
async function resolveBattle(battleId, requestingUserId) {
  // Start transaction
  const client = await pool.connect();
  
  // Determine multipliers based on battle type
  let xpMultiplier = 1.0;
  let bitsMultiplier = 1.0;

  try {
    await client.query('BEGIN');

    // Load battle
    const battleResult = await client.query(
      `SELECT * FROM battles WHERE id = $1`,
      [battleId]
    );

    if (battleResult.rows.length === 0) {
      throw new Error('Battle not found');
    }

    const battle = battleResult.rows[0];

    // Set multipliers based on battle type
    if (battle.battle_type === 'heroic') {
      xpMultiplier = 1.25;
      bitsMultiplier = 1.25;
    }

    // Verify user is part of battle
    if (
      battle.attacker_id !== requestingUserId &&
      battle.defender_id !== requestingUserId
    ) {
      throw new Error('Unauthorized: You are not part of this battle');
    }

    // If battle is already completed, return existing data
    if (battle.status === 'completed') {
      client.release(); // Release client before early return
      
      // Load existing turns
      const turnsResult = await pool.query(
        `SELECT bt.*, m.name as move_name
         FROM battle_turns bt
         LEFT JOIN moves m ON bt.move_id = m.id
         WHERE bt.battle_id = $1
         ORDER BY bt.turn_number ASC`,
        [battleId]
      );

      // Load NFT stats
      const attackerNFTResult = await pool.query(
        `SELECT id, level, experience, hp, attack, defense, speed, affinity FROM nfts WHERE id = $1`,
        [battle.attacker_nft_id]
      );
      const defenderNFTResult = await pool.query(
        `SELECT id, level, experience, hp, attack, defense, speed, affinity FROM nfts WHERE id = $1`,
        [battle.defender_nft_id]
      );

      return {
        battleId,
        winnerUserId: battle.winner_id,
        loserUserId: battle.winner_id === battle.attacker_id ? battle.defender_id : battle.attacker_id,
        winnerNftId: battle.winner_id === battle.attacker_id ? battle.attacker_nft_id : battle.defender_nft_id,
        loserNftId: battle.winner_id === battle.attacker_id ? battle.defender_nft_id : battle.attacker_nft_id,
        bitsReward: battle.bits_reward || 0,
        status: 'completed',
        turns: turnsResult.rows.map((t) => ({
          turnNumber: t.turn_number,
          actingNftId: t.acting_nft_id,
          targetNftId: t.target_nft_id,
          moveId: t.move_id,
          moveName: t.move_name,
          damageDone: t.damage_done,
          crit: t.crit,
          effectiveness: parseFloat(t.effectiveness),
          statusApplied: t.status_applied,
          attackerHpAfter: t.attacker_hp_after,
          defenderHpAfter: t.defender_hp_after,
        })),
        attacker: {
          nftId: battle.attacker_nft_id,
          level: attackerNFTResult.rows[0]?.level || 1,
          experience: attackerNFTResult.rows[0]?.experience || 0,
          hp: attackerNFTResult.rows[0]?.hp || 100,
          attack: attackerNFTResult.rows[0]?.attack || 20,
          defense: attackerNFTResult.rows[0]?.defense || 10,
          speed: attackerNFTResult.rows[0]?.speed || 10,
          affinity: attackerNFTResult.rows[0]?.affinity || 'neutral',
        },
        defender: {
          nftId: battle.defender_nft_id,
          level: defenderNFTResult.rows[0]?.level || 1,
          experience: defenderNFTResult.rows[0]?.experience || 0,
          hp: defenderNFTResult.rows[0]?.hp || 100,
          attack: defenderNFTResult.rows[0]?.attack || 20,
          defense: defenderNFTResult.rows[0]?.defense || 10,
          speed: defenderNFTResult.rows[0]?.speed || 10,
          affinity: defenderNFTResult.rows[0]?.affinity || 'neutral',
        },
      };
    }

    // Load attacker and defender NFTs with moves
    const attacker = await loadNFTWithMoves(battle.attacker_nft_id);
    const defender = await loadNFTWithMoves(battle.defender_nft_id);

    // Simulate battle
    const battleResult_data = simulateBattle(attacker, defender, {
      seed: battle.battle_id || battle.id,
      maxTurns: 100,
    });

    // Calculate XP gain
    const winnerNFT =
      battleResult_data.winnerNftId === attacker.id ? attacker : defender;
    const loserNFT =
      battleResult_data.loserNftId === attacker.id ? attacker : defender;

    const baseXpGained = calculateXpGain(winnerNFT, loserNFT);
    const xpGained = Math.round(baseXpGained * xpMultiplier);

    // Apply XP to winner
    const winnerXpResult = applyExperience(winnerNFT, xpGained);

    // Calculate bits reward (based on opponent level) with multiplier
    const baseBitsReward = 50 + loserNFT.level * 10;
    const bitsReward = Math.round(baseBitsReward * bitsMultiplier);

    // Update battle status
    await client.query(
      `UPDATE battles 
       SET winner_id = $1, bits_reward = $2, status = $3, completed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [battleResult_data.winnerUserId, bitsReward, 'completed', battleId]
    );

    // Insert battle turns
    for (const turn of battleResult_data.turns) {
      await client.query(
        `INSERT INTO battle_turns 
         (battle_id, turn_number, acting_nft_id, target_nft_id, move_id, damage_done, crit, effectiveness, status_applied, attacker_hp_after, defender_hp_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          battleId,
          turn.turnNumber,
          turn.actingNftId,
          turn.targetNftId,
          turn.moveId,
          turn.damageDone,
          turn.crit,
          turn.effectiveness,
          turn.statusApplied,
          turn.attackerHpAfter,
          turn.defenderHpAfter,
        ]
      );
    }

    // Update winner NFT (XP, level, stats)
    await client.query(
      `UPDATE nfts 
       SET experience = $1, level = $2,
           hp = hp + $3, attack = attack + $4, defense = defense + $5, speed = speed + $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        winnerXpResult.experience,
        winnerXpResult.level,
        winnerXpResult.statIncreases.hp,
        winnerXpResult.statIncreases.attack,
        winnerXpResult.statIncreases.defense,
        winnerXpResult.statIncreases.speed,
        battleResult_data.winnerNftId,
      ]
    );

    // Reset HP to base for both NFTs (for next battle)
    await client.query(
      `UPDATE nfts SET hp = GREATEST(50, battle_power / 2 + level * 10) WHERE id IN ($1, $2)`,
      [battle.attacker_nft_id, battle.defender_nft_id]
    );

    // Award bits to winner
    await client.query(
      'UPDATE users SET bits = bits + $1, social_score = social_score + $2 WHERE id = $3',
      [bitsReward, Math.floor(bitsReward / 2), battleResult_data.winnerUserId]
    );

    // Award participation bits to loser
    await client.query(
      'UPDATE users SET bits = bits + $1 WHERE id = $2',
      [10, battleResult_data.loserUserId]
    );

    await client.query('COMMIT');

    // Apply ranked ladder updates if this is a ranked heroic battle (outside transaction)
    try {
      await applyRankedResult({
        battle,
        attackerUserId: battle.attacker_id,
        defenderUserId: battle.defender_id,
        winnerUserId: battleResult_data.winnerUserId,
      });
    } catch (ladderError) {
      // Log but don't fail the battle if ladder update fails
      console.error('Error updating ladder rankings:', ladderError);
    }

    // Load updated NFT stats
    const attackerNFTResult = await pool.query(
      `SELECT id, level, experience, hp, attack, defense, speed, affinity FROM nfts WHERE id = $1`,
      [attacker.id]
    );
    const defenderNFTResult = await pool.query(
      `SELECT id, level, experience, hp, attack, defense, speed, affinity FROM nfts WHERE id = $1`,
      [defender.id]
    );

    return {
      battleId,
      winnerUserId: battleResult_data.winnerUserId,
      loserUserId: battleResult_data.loserUserId,
      winnerNftId: battleResult_data.winnerNftId,
      loserNftId: battleResult_data.loserNftId,
      bitsReward,
      status: 'completed',
      turns: battleResult_data.turns,
      attacker: {
        nftId: attacker.id,
        level: attackerNFTResult.rows[0]?.level || attacker.level,
        experience: attackerNFTResult.rows[0]?.experience || attacker.experience,
        hp: attackerNFTResult.rows[0]?.hp || attacker.hp,
        attack: attackerNFTResult.rows[0]?.attack || attacker.attack,
        defense: attackerNFTResult.rows[0]?.defense || attacker.defense,
        speed: attackerNFTResult.rows[0]?.speed || attacker.speed,
        affinity: attackerNFTResult.rows[0]?.affinity || attacker.affinity,
      },
      defender: {
        nftId: defender.id,
        level: defenderNFTResult.rows[0]?.level || defender.level,
        experience: defenderNFTResult.rows[0]?.experience || defender.experience,
        hp: defenderNFTResult.rows[0]?.hp || defender.hp,
        attack: defenderNFTResult.rows[0]?.attack || defender.attack,
        defense: defenderNFTResult.rows[0]?.defense || defender.defense,
        speed: defenderNFTResult.rows[0]?.speed || defender.speed,
        affinity: defenderNFTResult.rows[0]?.affinity || defender.affinity,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  resolveBattle,
  loadNFTWithMoves,
};

