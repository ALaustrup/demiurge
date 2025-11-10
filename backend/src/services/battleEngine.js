/**
 * Pokemon-style Battle Engine
 * Pure logic module for turn-based battle simulation
 */

// Type effectiveness chart
const TYPE_CHART = {
  fire: { fire: 1, water: 0.5, bio: 2, tech: 1, void: 1, neutral: 1 },
  water: { fire: 2, water: 1, bio: 1, tech: 0.5, void: 1, neutral: 1 },
  bio: { fire: 0.5, water: 1, bio: 1, tech: 2, void: 1, neutral: 1 },
  tech: { fire: 1, water: 2, bio: 0.5, tech: 1, void: 1, neutral: 1 },
  void: { fire: 1.5, water: 1.5, bio: 1.5, tech: 1.5, void: 1, neutral: 1 },
  neutral: { fire: 1, water: 1, bio: 1, tech: 1, void: 1, neutral: 1 },
};

/**
 * Simple Linear Congruential Generator for deterministic RNG
 */
class SeededRNG {
  constructor(seed) {
    this.seed = seed || Date.now();
  }

  next() {
    // LCG: (a * seed + c) mod m
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
}

/**
 * Calculate damage for a move
 */
function calculateDamage({ attacker, defender, move, rng }) {
  // 1) Accuracy check
  const roll = rng() * 100;
  if (roll > move.accuracy) {
    return {
      hit: false,
      damage: 0,
      crit: false,
      effectiveness: 1,
    };
  }

  // 2) Type effectiveness
  const typeMultiplier = TYPE_CHART[move.type]?.[defender.affinity] ?? 1;

  // 3) Crit chance (10%)
  const critChance = 0.1;
  const crit = rng() < critChance;
  const critMultiplier = crit ? 1.5 : 1;

  // 4) Base damage formula (Pokemon-style)
  const base =
    ((2 * attacker.level) / 5 + 2) *
    move.power *
    (attacker.attack / Math.max(1, defender.defense)) /
    50 +
    2;

  // 5) Random factor (0.85-1.0)
  const randomFactor = 0.85 + rng() * 0.15;

  const rawDamage = base * typeMultiplier * critMultiplier * randomFactor;
  const damage = Math.max(1, Math.floor(rawDamage));

  return {
    hit: true,
    damage,
    crit,
    effectiveness: typeMultiplier,
  };
}

/**
 * Simulate a full battle
 */
function simulateBattle(attacker, defender, options = {}) {
  const { seed, maxTurns = 100 } = options;
  const rng = new SeededRNG(seed);

  // Initialize HP (use current HP or base HP)
  let attackerHp = attacker.hp || attacker.baseHp || 100;
  let defenderHp = defender.hp || defender.baseHp || 100;

  const attackerMaxHp = attackerHp;
  const defenderMaxHp = defenderHp;

  const turns = [];
  let turnNumber = 0;

  // Ensure both NFTs have moves
  if (!attacker.moves || attacker.moves.length === 0) {
    throw new Error(`Attacker NFT ${attacker.id} has no moves`);
  }
  if (!defender.moves || defender.moves.length === 0) {
    throw new Error(`Defender NFT ${defender.id} has no moves`);
  }

  while (attackerHp > 0 && defenderHp > 0 && turnNumber < maxTurns) {
    turnNumber++;

    // Determine turn order by speed (higher speed goes first)
    // Tie-breaker: attacker goes first
    let first, second;
    if (attacker.speed > defender.speed) {
      first = { nft: attacker, hp: attackerHp, isAttacker: true };
      second = { nft: defender, hp: defenderHp, isAttacker: false };
    } else if (defender.speed > attacker.speed) {
      first = { nft: defender, hp: defenderHp, isAttacker: false };
      second = { nft: attacker, hp: attackerHp, isAttacker: true };
    } else {
      // Speed tie: attacker goes first
      first = { nft: attacker, hp: attackerHp, isAttacker: true };
      second = { nft: defender, hp: defenderHp, isAttacker: false };
    }

    // First attacker's turn
    if (first.hp > 0) {
      const move = first.nft.moves[Math.floor(rng() * first.nft.moves.length)];
      const damageResult = calculateDamage({
        attacker: first.nft,
        defender: second.nft,
        move,
        rng,
      });

      if (damageResult.hit) {
        second.hp = Math.max(0, second.hp - damageResult.damage);
      }

      // Update HP tracking
      if (first.isAttacker) {
        attackerHp = first.hp;
        defenderHp = second.hp;
      } else {
        defenderHp = first.hp;
        attackerHp = second.hp;
      }

      turns.push({
        turnNumber,
        actingNftId: first.nft.id,
        targetNftId: second.nft.id,
        moveId: move.id,
        moveName: move.name,
        damageDone: damageResult.hit ? damageResult.damage : 0,
        crit: damageResult.crit,
        effectiveness: damageResult.effectiveness,
        statusApplied: null, // TODO: Implement status effects
        attackerHpAfter: attackerHp,
        defenderHpAfter: defenderHp,
      });

      if (second.hp <= 0) break;
    }

    // Second attacker's turn
    if (second.hp > 0) {
      const move = second.nft.moves[Math.floor(rng() * second.nft.moves.length)];
      const damageResult = calculateDamage({
        attacker: second.nft,
        defender: first.nft,
        move,
        rng,
      });

      if (damageResult.hit) {
        first.hp = Math.max(0, first.hp - damageResult.damage);
      }

      // Update HP tracking
      if (first.isAttacker) {
        attackerHp = first.hp;
        defenderHp = second.hp;
      } else {
        defenderHp = first.hp;
        attackerHp = second.hp;
      }

      turns.push({
        turnNumber,
        actingNftId: second.nft.id,
        targetNftId: first.nft.id,
        moveId: move.id,
        moveName: move.name,
        damageDone: damageResult.hit ? damageResult.damage : 0,
        crit: damageResult.crit,
        effectiveness: damageResult.effectiveness,
        statusApplied: null,
        attackerHpAfter: attackerHp,
        defenderHpAfter: defenderHp,
      });

      if (first.hp <= 0) break;
    }
  }

  // Determine winner
  const attackerWon = attackerHp > 0 && defenderHp <= 0;
  const defenderWon = defenderHp > 0 && attackerHp <= 0;

  if (!attackerWon && !defenderWon) {
    // Timeout - attacker wins by default (or could be a draw)
    return {
      winnerUserId: attacker.userId,
      loserUserId: defender.userId,
      winnerNftId: attacker.id,
      loserNftId: defender.id,
      attackerFinalHp: attackerHp,
      defenderFinalHp: defenderHp,
      turns,
      timeout: true,
    };
  }

  return {
    winnerUserId: attackerWon ? attacker.userId : defender.userId,
    loserUserId: attackerWon ? defender.userId : attacker.userId,
    winnerNftId: attackerWon ? attacker.id : defender.id,
    loserNftId: attackerWon ? defender.id : attacker.id,
    attackerFinalHp: attackerHp,
    defenderFinalHp: defenderHp,
    turns,
    timeout: false,
  };
}

/**
 * Calculate XP gain for winner
 */
function calculateXpGain(winner, loser) {
  const baseXp = 50;
  const levelDiff = loser.level - winner.level;
  const xpGain = Math.max(10, baseXp + 10 * levelDiff);
  return xpGain;
}

/**
 * Calculate XP needed for next level
 */
function getXpNeededForLevel(level) {
  return level * 100;
}

/**
 * Apply experience and check for level-up
 */
function applyExperience(combatant, xpGained) {
  let newExperience = combatant.experience + xpGained;
  let newLevel = combatant.level;
  let leveledUp = false;

  // Check for level-ups
  while (newExperience >= getXpNeededForLevel(newLevel)) {
    newExperience -= getXpNeededForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  // Calculate stat increases on level-up
  const statIncreases = leveledUp
    ? {
        hp: Math.floor((newLevel - combatant.level) * 5),
        attack: Math.floor((newLevel - combatant.level) * 2),
        defense: Math.floor((newLevel - combatant.level) * 1.5),
        speed: Math.floor((newLevel - combatant.level) * 1.5),
      }
    : { hp: 0, attack: 0, defense: 0, speed: 0 };

  return {
    experience: newExperience,
    level: newLevel,
    leveledUp,
    statIncreases,
  };
}

/**
 * Simulate a PvE RPG battle (no DB persistence, simpler return format)
 * Used for overworld encounters
 */
function simulateRpgBattle(attacker, defender, options = {}) {
  const { seed, maxTurns = 100 } = options;
  const rng = new SeededRNG(seed);

  // Initialize HP
  let attackerHp = attacker.hp || attacker.baseHp || 100;
  let defenderHp = defender.hp || defender.baseHp || 100;

  const attackerMaxHp = attackerHp;
  const defenderMaxHp = defenderHp;

  const turns = [];
  let turnNumber = 0;

  // Ensure both have moves
  if (!attacker.moves || attacker.moves.length === 0) {
    throw new Error(`Attacker NFT ${attacker.id} has no moves`);
  }
  if (!defender.moves || defender.moves.length === 0) {
    throw new Error(`Defender has no moves`);
  }

  while (attackerHp > 0 && defenderHp > 0 && turnNumber < maxTurns) {
    turnNumber++;

    // Determine turn order by speed
    let first, second;
    if (attacker.speed > defender.speed) {
      first = { nft: attacker, hp: attackerHp, isAttacker: true };
      second = { nft: defender, hp: defenderHp, isAttacker: false };
    } else if (defender.speed > attacker.speed) {
      first = { nft: defender, hp: defenderHp, isAttacker: false };
      second = { nft: attacker, hp: attackerHp, isAttacker: true };
    } else {
      first = { nft: attacker, hp: attackerHp, isAttacker: true };
      second = { nft: defender, hp: defenderHp, isAttacker: false };
    }

    // First attacker's turn
    if (first.hp > 0) {
      const move = first.nft.moves[Math.floor(rng() * first.nft.moves.length)];
      const damageResult = calculateDamage({
        attacker: first.nft,
        defender: second.nft,
        move,
        rng,
      });

      if (damageResult.hit) {
        second.hp = Math.max(0, second.hp - damageResult.damage);
      }

      if (first.isAttacker) {
        attackerHp = first.hp;
        defenderHp = second.hp;
      } else {
        defenderHp = first.hp;
        attackerHp = second.hp;
      }

      turns.push({
        turnNumber,
        actingNftId: first.nft.id,
        targetNftId: second.nft.id,
        moveId: move.id,
        moveName: move.name,
        damageDone: damageResult.hit ? damageResult.damage : 0,
        crit: damageResult.crit,
        effectiveness: damageResult.effectiveness,
        statusApplied: null,
        attackerHpAfter: attackerHp,
        defenderHpAfter: defenderHp,
      });

      if (second.hp <= 0) break;
    }

    // Second attacker's turn
    if (second.hp > 0) {
      const move = second.nft.moves[Math.floor(rng() * second.nft.moves.length)];
      const damageResult = calculateDamage({
        attacker: second.nft,
        defender: first.nft,
        move,
        rng,
      });

      if (damageResult.hit) {
        first.hp = Math.max(0, first.hp - damageResult.damage);
      }

      if (first.isAttacker) {
        attackerHp = first.hp;
        defenderHp = second.hp;
      } else {
        defenderHp = first.hp;
        attackerHp = second.hp;
      }

      turns.push({
        turnNumber,
        actingNftId: second.nft.id,
        targetNftId: first.nft.id,
        moveId: move.id,
        moveName: move.name,
        damageDone: damageResult.hit ? damageResult.damage : 0,
        crit: damageResult.crit,
        effectiveness: damageResult.effectiveness,
        statusApplied: null,
        attackerHpAfter: attackerHp,
        defenderHpAfter: defenderHp,
      });

      if (first.hp <= 0) break;
    }
  }

  // Determine winner
  const playerWon = attackerHp > 0 && defenderHp <= 0;
  const enemyWon = defenderHp > 0 && attackerHp <= 0;

  // Calculate XP and Bits (only if player wins)
  let xpGained = 0;
  let bitsReward = 0;
  if (playerWon) {
    xpGained = calculateXpGain(attacker, defender);
    bitsReward = 50 + (defender.level || 1) * 10;
  }

  return {
    winner: playerWon ? 'player' : 'enemy',
    turns,
    attackerFinalHp: attackerHp,
    defenderFinalHp: defenderHp,
    xpGained,
    bitsReward,
    timeout: !playerWon && !enemyWon,
  };
}

module.exports = {
  simulateBattle,
  simulateRpgBattle,
  calculateDamage,
  calculateXpGain,
  applyExperience,
  getXpNeededForLevel,
  TYPE_CHART,
};

