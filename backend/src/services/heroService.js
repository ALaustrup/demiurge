const { pool } = require('../config/database');
const { uploadMetadata } = require('./ipfs');
const { loadNFTWithMoves } = require('./battleService');

/**
 * Affinity types for heroes
 */
const AFFINITIES = ['fire', 'water', 'bio', 'tech', 'void', 'neutral'];

/**
 * Generate deterministic stats for a hero based on user ID
 * This ensures the same user always gets the same hero stats
 */
function generateHeroStats(userId, username) {
  // Use user ID as seed for deterministic generation
  const seed = userId;
  const rng = (() => {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  })();

  // Choose affinity based on username hash
  const affinityIndex = Math.floor(
    (username.charCodeAt(0) + username.length) % AFFINITIES.length
  );
  const affinity = AFFINITIES[affinityIndex];

  // Allocate 100 stat points across hp, attack, defense, speed
  // Base distribution with some randomness
  const baseHp = 80 + Math.floor(rng() * 40); // 80-120
  const baseAttack = 20 + Math.floor(rng() * 10); // 20-30
  const baseDefense = 15 + Math.floor(rng() * 10); // 15-25
  const baseSpeed = 15 + Math.floor(rng() * 10); // 15-25

  // Normalize to ensure total is around 100
  const total = baseHp + baseAttack + baseDefense + baseSpeed;
  const scale = 100 / total;

  return {
    hp: Math.floor(baseHp * scale),
    attack: Math.floor(baseAttack * scale),
    defense: Math.floor(baseDefense * scale),
    speed: Math.floor(baseSpeed * scale),
    affinity,
    level: 1,
    experience: 0,
    battlePower: Math.floor((baseHp + baseAttack + baseDefense + baseSpeed) * scale / 5),
  };
}

/**
 * Create hero metadata JSON
 */
function createHeroMetadata(username, stats, inscription) {
  return {
    name: `${username}'s Heroic`,
    description: `Dynamic Hero NFT for Demiurge NFT WARS. ${inscription}`,
    image: 'https://via.placeholder.com/512/8b5cf6/ffffff?text=HEROIC', // Placeholder
    external_url: '',
    attributes: [
      { trait_type: 'Heroic', value: true },
      { trait_type: 'Dynamic', value: true },
      { trait_type: 'Soulbound', value: true },
      { trait_type: 'Affinity', value: stats.affinity },
      { trait_type: 'Level', value: stats.level },
      { trait_type: 'HP', value: stats.hp },
      { trait_type: 'Attack', value: stats.attack },
      { trait_type: 'Defense', value: stats.defense },
      { trait_type: 'Speed', value: stats.speed },
      { trait_type: 'Username Inscription', value: inscription },
    ],
  };
}

/**
 * Get user's hero NFT if it exists
 */
async function getUserHero(userId) {
  const userResult = await pool.query(
    'SELECT id, username, hero_nft_id FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  if (!user.hero_nft_id) {
    return null;
  }

  const heroResult = await pool.query(
    `SELECT n.*, u.username as owner_username
     FROM nfts n
     JOIN users u ON n.owner_id = u.id
     WHERE n.id = $1 AND n.is_heroic = TRUE`,
    [user.hero_nft_id]
  );

  if (heroResult.rows.length === 0) {
    // Hero reference exists but NFT doesn't - clean up
    await pool.query('UPDATE users SET hero_nft_id = NULL WHERE id = $1', [userId]);
    return null;
  }

  const hero = heroResult.rows[0];
  return {
    id: hero.id,
    tokenId: hero.token_id,
    name: hero.name,
    description: hero.description,
    affinity: hero.affinity,
    level: hero.level,
    hp: hero.hp,
    attack: hero.attack,
    defense: hero.defense,
    speed: hero.speed,
    experience: hero.experience,
    isHeroic: hero.is_heroic,
    isDynamic: hero.is_dynamic,
    isSoulbound: hero.is_soulbound,
    heroicUsernameInscription: hero.heroic_username_inscription,
    mediaUrl: hero.media_url,
    ipfsHash: hero.ipfs_hash,
    tokenUri: hero.token_uri,
  };
}

/**
 * Forge a new Heroic DNFT for a user
 * TODO: Implement on-chain minting in a later phase
 */
async function forgeHero(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Load user
    const userResult = await client.query(
      'SELECT id, username, wallet_address FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Check if user already has a hero
    if (user.hero_nft_id) {
      const existingHero = await getUserHero(userId);
      if (existingHero) {
        await client.query('COMMIT');
        return existingHero;
      }
    }

    // Generate hero stats
    const stats = generateHeroStats(user.id, user.username);

    // Create username inscription
    const inscription = `HEROIC DNFT • ${user.username.toUpperCase()} • FORGED IN THE DEMIURGE`;

    // Create metadata
    const metadata = createHeroMetadata(user.username, stats, inscription);

    // Upload metadata to IPFS (or use placeholder for now)
    let ipfsHash, tokenUri;
    try {
      const ipfsResult = await uploadMetadata(metadata);
      ipfsHash = ipfsResult.hash;
      tokenUri = ipfsResult.url;
    } catch (error) {
      console.warn('IPFS upload failed, using placeholder:', error.message);
      // Use placeholder if IPFS fails
      ipfsHash = 'placeholder_heroic_' + userId;
      tokenUri = 'https://ipfs.io/ipfs/placeholder';
    }

    // TODO: Mint on-chain in a later phase
    // For now, create off-chain record with placeholder token_id
    // const mintResult = await mintHeroOnChain(user.wallet_address, tokenUri, ipfsHash, ...);
    // const tokenId = mintResult.tokenId;
    // await setSoulboundOnChain(tokenId, true);

    // Use a placeholder token_id for now (negative to distinguish from real tokens)
    const placeholderTokenId = -(userId + 1000000); // Negative to avoid conflicts

    // Insert hero NFT into database
    const heroResult = await client.query(
      `INSERT INTO nfts (
        token_id, owner_id, creator_id, contract_address, ipfs_hash, token_uri,
        name, description, media_type, media_url,
        battle_power, level, hp, attack, defense, speed, affinity, experience,
        is_heroic, is_dynamic, is_soulbound, heroic_username_inscription
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        placeholderTokenId,
        user.id,
        user.id, // Creator is the user
        process.env.NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
        ipfsHash,
        tokenUri,
        metadata.name,
        metadata.description,
        'image',
        metadata.image,
        stats.battlePower,
        stats.level,
        stats.hp,
        stats.attack,
        stats.defense,
        stats.speed,
        stats.affinity,
        stats.experience,
        true, // is_heroic
        true, // is_dynamic
        true, // is_soulbound
        inscription,
      ]
    );

    const hero = heroResult.rows[0];

    // Assign default moves to hero (neutral moves)
    const neutralMovesResult = await client.query(
      "SELECT id FROM moves WHERE type = 'neutral' ORDER BY id LIMIT 4"
    );

    if (neutralMovesResult.rows.length > 0) {
      for (const move of neutralMovesResult.rows) {
        await client.query(
          `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [hero.id, move.id]
        );
      }
    }

    // Update user's hero_nft_id
    await client.query('UPDATE users SET hero_nft_id = $1 WHERE id = $2', [
      hero.id,
      user.id,
    ]);

    await client.query('COMMIT');

    return {
      id: hero.id,
      tokenId: hero.token_id,
      name: hero.name,
      description: hero.description,
      affinity: hero.affinity,
      level: hero.level,
      hp: hero.hp,
      attack: hero.attack,
      defense: hero.defense,
      speed: hero.speed,
      experience: hero.experience,
      isHeroic: hero.is_heroic,
      isDynamic: hero.is_dynamic,
      isSoulbound: hero.is_soulbound,
      heroicUsernameInscription: hero.heroic_username_inscription,
      mediaUrl: hero.media_url,
      ipfsHash: hero.ipfs_hash,
      tokenUri: hero.token_uri,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get or create hero for user (idempotent)
 */
async function getOrCreateHeroForUser(userId) {
  const existingHero = await getUserHero(userId);
  if (existingHero) {
    return existingHero;
  }
  return await forgeHero(userId);
}

/**
 * Create a new hero for a user (internal helper, bypasses existence check)
 * Used for regeneration
 */
async function createNewHeroForUser(user, client) {
  // Generate hero stats (use current timestamp for variation in regen)
  const stats = generateHeroStats(user.id, user.username + Date.now());

  // Create username inscription
  const inscription = `HEROIC DNFT • ${user.username.toUpperCase()} • FORGED IN THE DEMIURGE`;

  // Create metadata
  const metadata = createHeroMetadata(user.username, stats, inscription);

  // Upload metadata to IPFS (or use placeholder for now)
  let ipfsHash, tokenUri;
  try {
    const ipfsResult = await uploadMetadata(metadata);
    ipfsHash = ipfsResult.hash;
    tokenUri = ipfsResult.url;
  } catch (error) {
    console.warn('IPFS upload failed, using placeholder:', error.message);
    ipfsHash = 'placeholder_heroic_' + user.id + '_' + Date.now();
    tokenUri = 'https://ipfs.io/ipfs/placeholder';
  }

  // Use a placeholder token_id for now (negative to distinguish from real tokens)
  const placeholderTokenId = -(user.id + 1000000 + Date.now());

  // Insert hero NFT into database
  const heroResult = await client.query(
    `INSERT INTO nfts (
      token_id, owner_id, creator_id, contract_address, ipfs_hash, token_uri,
      name, description, media_type, media_url,
      battle_power, level, hp, attack, defense, speed, affinity, experience,
      is_heroic, is_dynamic, is_soulbound, heroic_username_inscription
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *`,
    [
      placeholderTokenId,
      user.id,
      user.id,
      process.env.NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      ipfsHash,
      tokenUri,
      metadata.name,
      metadata.description,
      'image',
      metadata.image,
      stats.battlePower,
      stats.level,
      stats.hp,
      stats.attack,
      stats.defense,
      stats.speed,
      stats.affinity,
      stats.experience,
      true, // is_heroic
      true, // is_dynamic
      true, // is_soulbound
      inscription,
    ]
  );

  const hero = heroResult.rows[0];

  // Assign default moves to hero (neutral moves)
  const neutralMovesResult = await client.query(
    "SELECT id FROM moves WHERE type = 'neutral' ORDER BY id LIMIT 4"
  );

  if (neutralMovesResult.rows.length > 0) {
    for (const move of neutralMovesResult.rows) {
      await client.query(
        `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [hero.id, move.id]
      );
    }
  }

  return {
    id: hero.id,
    tokenId: hero.token_id,
    name: hero.name,
    description: hero.description,
    affinity: hero.affinity,
    level: hero.level,
    hp: hero.hp,
    attack: hero.attack,
    defense: hero.defense,
    speed: hero.speed,
    experience: hero.experience,
    isHeroic: hero.is_heroic,
    isDynamic: hero.is_dynamic,
    isSoulbound: hero.is_soulbound,
    heroicUsernameInscription: hero.heroic_username_inscription,
    mediaUrl: hero.media_url,
    ipfsHash: hero.ipfs_hash,
    tokenUri: hero.token_uri,
  };
}

/**
 * Regenerate hero for user (retire old, create new)
 * Cost: HERO_REGEN_COST_BITS (default 10000)
 */
const HERO_REGEN_COST_BITS = 10000;

async function regenerateHeroForUser(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Load user with current hero
    const userResult = await client.query(
      `SELECT id, username, wallet_address, hero_nft_id, bits, 
              hero_regenerations_used, hero_regenerations_limit
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Check if user has a hero
    if (!user.hero_nft_id) {
      throw new Error('No Heroic DNFT to regenerate');
    }

    // Check regeneration limit
    if (user.hero_regenerations_used >= user.hero_regenerations_limit) {
      throw new Error('Regeneration limit reached');
    }

    // Check Bits balance
    if (user.bits < HERO_REGEN_COST_BITS) {
      throw new Error(`Not enough Bits to regenerate hero. Required: ${HERO_REGEN_COST_BITS}, Have: ${user.bits}`);
    }

    // Load current hero
    const heroResult = await client.query(
      'SELECT id FROM nfts WHERE id = $1 AND is_heroic = TRUE',
      [user.hero_nft_id]
    );

    if (heroResult.rows.length === 0) {
      throw new Error('Current hero not found');
    }

    const oldHeroId = heroResult.rows[0].id;

    // TODO: In a future phase, integrate external payment verification here.
    // Example:
    // await paymentService.verifyHeroRegenPayment({
    //   userId,
    //   chain: "eth" | "sol" | "btc",
    //   txHash: payload.txHash
    // });

    // Mark old hero as retired
    await client.query(
      'UPDATE nfts SET is_hero_retired = TRUE WHERE id = $1',
      [oldHeroId]
    );

    // Create new hero
    const newHero = await createNewHeroForUser(user, client);

    // Deduct Bits and increment regeneration count
    await client.query(
      `UPDATE users 
       SET bits = bits - $1,
           hero_regenerations_used = hero_regenerations_used + 1,
           hero_nft_id = $2
       WHERE id = $3`,
      [HERO_REGEN_COST_BITS, newHero.id, userId]
    );

    await client.query('COMMIT');

    return {
      hero: newHero,
      regenerationsUsed: user.hero_regenerations_used + 1,
      regenerationsLimit: user.hero_regenerations_limit,
      bitsSpent: HERO_REGEN_COST_BITS,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getUserHero,
  forgeHero,
  getOrCreateHeroForUser,
  regenerateHeroForUser,
  HERO_REGEN_COST_BITS,
};

