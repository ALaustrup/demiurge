const { Pool } = require('pg');

// Parse DATABASE_URL or use explicit config
let poolConfig;
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  } catch (error) {
    // Fallback to connection string
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'demiurge_db',
    user: process.env.DB_USER || 'demiurge',
    password: process.env.DB_PASSWORD || 'demiurge_password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

const connectDB = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL database connected');
    
    // Initialize tables
    await initializeTables();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      wallet_address VARCHAR(255) UNIQUE,
      bits INTEGER DEFAULT 0,
      social_score INTEGER DEFAULT 0,
      social_tier VARCHAR(50) DEFAULT 'bronze',
      hero_nft_id INTEGER REFERENCES nfts(id),
      hero_regenerations_used INTEGER NOT NULL DEFAULT 0,
      hero_regenerations_limit INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createNFTsTable = `
    CREATE TABLE IF NOT EXISTS nfts (
      id SERIAL PRIMARY KEY,
      token_id INTEGER NOT NULL,
      owner_id INTEGER REFERENCES users(id),
      creator_id INTEGER REFERENCES users(id),
      contract_address VARCHAR(255) NOT NULL,
      ipfs_hash VARCHAR(255) NOT NULL,
      token_uri TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      media_type VARCHAR(50),
      media_url TEXT,
      battle_power INTEGER DEFAULT 100,
      level INTEGER DEFAULT 1,
      hp INTEGER DEFAULT 100,
      attack INTEGER DEFAULT 20,
      defense INTEGER DEFAULT 10,
      speed INTEGER DEFAULT 10,
      affinity VARCHAR(50) DEFAULT 'neutral',
      experience INTEGER DEFAULT 0,
      is_heroic BOOLEAN NOT NULL DEFAULT FALSE,
      is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
      is_soulbound BOOLEAN NOT NULL DEFAULT FALSE,
      heroic_username_inscription VARCHAR(255),
      is_hero_retired BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(token_id, contract_address)
    );
  `;
  
  const createMarketplaceListingsTable = `
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      nft_id INTEGER REFERENCES nfts(id),
      seller_id INTEGER REFERENCES users(id),
      price DECIMAL(20, 8) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createBattlesTable = `
    CREATE TABLE IF NOT EXISTS battles (
      id SERIAL PRIMARY KEY,
      battle_id BIGINT NOT NULL,
      attacker_nft_id INTEGER REFERENCES nfts(id),
      defender_nft_id INTEGER REFERENCES nfts(id),
      attacker_id INTEGER REFERENCES users(id),
      defender_id INTEGER REFERENCES users(id),
      winner_id INTEGER REFERENCES users(id),
      bits_reward INTEGER,
      battle_type VARCHAR(50) NOT NULL DEFAULT 'normal',
      is_ranked BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `;
  
  const createWalletNoncesTable = `
    CREATE TABLE IF NOT EXISTS wallet_nonces (
      id SERIAL PRIMARY KEY,
      address VARCHAR NOT NULL,
      nonce VARCHAR NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );
  `;
  
  const createMovesTable = `
    CREATE TABLE IF NOT EXISTS moves (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      description TEXT,
      type VARCHAR NOT NULL,
      power INTEGER NOT NULL,
      accuracy INTEGER NOT NULL,
      energy_cost INTEGER NOT NULL DEFAULT 0,
      effect JSONB,
      target VARCHAR NOT NULL DEFAULT 'enemy',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  const createNFTMovesTable = `
    CREATE TABLE IF NOT EXISTS nft_moves (
      id SERIAL PRIMARY KEY,
      nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
      move_id INTEGER NOT NULL REFERENCES moves(id) ON DELETE CASCADE,
      UNIQUE (nft_id, move_id)
    );
  `;
  
  const createBattleTurnsTable = `
    CREATE TABLE IF NOT EXISTS battle_turns (
      id SERIAL PRIMARY KEY,
      battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
      turn_number INTEGER NOT NULL,
      acting_nft_id INTEGER NOT NULL REFERENCES nfts(id),
      target_nft_id INTEGER NOT NULL REFERENCES nfts(id),
      move_id INTEGER REFERENCES moves(id),
      damage_done INTEGER,
      crit BOOLEAN DEFAULT FALSE,
      effectiveness NUMERIC(3,2),
      status_applied VARCHAR,
      attacker_hp_after INTEGER,
      defender_hp_after INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_id);
    CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_id);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status);
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
    CREATE INDEX IF NOT EXISTS idx_wallet_nonces_address ON wallet_nonces(address);
    CREATE INDEX IF NOT EXISTS idx_wallet_nonces_expires_at ON wallet_nonces(expires_at);
    CREATE INDEX IF NOT EXISTS idx_nft_moves_nft_id ON nft_moves(nft_id);
    CREATE INDEX IF NOT EXISTS idx_nft_moves_move_id ON nft_moves(move_id);
    CREATE INDEX IF NOT EXISTS idx_battle_turns_battle_id ON battle_turns(battle_id);
    CREATE INDEX IF NOT EXISTS idx_nfts_owner_heroic ON nfts(owner_id, is_heroic);
    
    -- Ladder system tables
    CREATE TABLE IF NOT EXISTS seasons (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS heroic_rankings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hero_nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
      season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      highest_rating INTEGER NOT NULL,
      last_match_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, season_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_heroic_rankings_season_rating ON heroic_rankings(season_id, rating DESC);
    CREATE INDEX IF NOT EXISTS idx_heroic_rankings_user_season ON heroic_rankings(user_id, season_id);
  `;
  
  // Migration: Add combat stats columns to existing nfts table if they don't exist
  const migrateNFTsTable = async () => {
    try {
      // Check if columns exist, if not add them
      const columns = ['hp', 'attack', 'defense', 'speed', 'affinity', 'experience'];
      for (const col of columns) {
        await pool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='nfts' AND column_name='${col}'
            ) THEN
              ${col === 'affinity' 
                ? `ALTER TABLE nfts ADD COLUMN ${col} VARCHAR(50) DEFAULT 'neutral';`
                : `ALTER TABLE nfts ADD COLUMN ${col} INTEGER DEFAULT ${col === 'hp' ? 100 : col === 'attack' ? 20 : col === 'defense' ? 10 : col === 'speed' ? 10 : 0};`
              }
            END IF;
          END $$;
        `);
      }
      
      // Backfill stats for existing NFTs based on battle_power and level
      await pool.query(`
        UPDATE nfts 
        SET 
          hp = COALESCE(hp, GREATEST(50, battle_power / 2 + level * 10)),
          attack = COALESCE(attack, GREATEST(10, battle_power / 5 + level * 2)),
          defense = COALESCE(defense, GREATEST(5, battle_power / 10 + level)),
          speed = COALESCE(speed, GREATEST(5, battle_power / 10 + level)),
          affinity = COALESCE(affinity, 'neutral'),
          experience = COALESCE(experience, 0)
        WHERE hp IS NULL OR attack IS NULL OR defense IS NULL OR speed IS NULL OR affinity IS NULL OR experience IS NULL;
      `);
      
      console.log('✅ NFT combat stats migration completed');
    } catch (error) {
      console.error('⚠️ NFT migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add heroic columns to nfts table
  const migrateHeroicColumns = async () => {
    try {
      const heroicColumns = [
        { name: 'is_heroic', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
        { name: 'is_dynamic', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
        { name: 'is_soulbound', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
        { name: 'heroic_username_inscription', type: 'VARCHAR(255)' },
      ];

      for (const col of heroicColumns) {
        await pool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='nfts' AND column_name='${col.name}'
            ) THEN
              ALTER TABLE nfts ADD COLUMN ${col.name} ${col.type};
            END IF;
          END $$;
        `);
      }

      // Add index if it doesn't exist
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_nfts_owner_heroic ON nfts(owner_id, is_heroic);
      `);

      console.log('✅ Heroic columns migration completed');
    } catch (error) {
      console.error('⚠️ Heroic migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add hero_nft_id to users table
  const migrateUsersHeroColumn = async () => {
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='users' AND column_name='hero_nft_id'
          ) THEN
            ALTER TABLE users ADD COLUMN hero_nft_id INTEGER REFERENCES nfts(id);
          END IF;
        END $$;
      `);
      console.log('✅ Users hero_nft_id migration completed');
    } catch (error) {
      console.error('⚠️ Users hero migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add hero regeneration columns to users table
  const migrateUsersHeroRegenColumns = async () => {
    try {
      const columns = [
        { name: 'hero_regenerations_used', type: 'INTEGER NOT NULL DEFAULT 0' },
        { name: 'hero_regenerations_limit', type: 'INTEGER NOT NULL DEFAULT 5' },
      ];

      for (const col of columns) {
        await pool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='users' AND column_name='${col.name}'
            ) THEN
              ALTER TABLE users ADD COLUMN ${col.name} ${col.type};
            END IF;
          END $$;
        `);
      }
      console.log('✅ Users hero regeneration columns migration completed');
    } catch (error) {
      console.error('⚠️ Users hero regen migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add is_hero_retired to nfts table
  const migrateNFTsHeroRetiredColumn = async () => {
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='nfts' AND column_name='is_hero_retired'
          ) THEN
            ALTER TABLE nfts ADD COLUMN is_hero_retired BOOLEAN NOT NULL DEFAULT FALSE;
          END IF;
        END $$;
      `);
      console.log('✅ NFTs is_hero_retired migration completed');
    } catch (error) {
      console.error('⚠️ NFTs hero retired migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add battle_type to battles table
  const migrateBattlesTypeColumn = async () => {
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='battles' AND column_name='battle_type'
          ) THEN
            ALTER TABLE battles ADD COLUMN battle_type VARCHAR(50) NOT NULL DEFAULT 'normal';
          END IF;
        END $$;
      `);
      console.log('✅ Battles battle_type migration completed');
    } catch (error) {
      console.error('⚠️ Battles type migration error (may already be migrated):', error.message);
    }
  };

  // Migration: Add is_ranked to battles table
  const migrateBattlesRankedColumn = async () => {
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='battles' AND column_name='is_ranked'
          ) THEN
            ALTER TABLE battles ADD COLUMN is_ranked BOOLEAN NOT NULL DEFAULT FALSE;
          END IF;
        END $$;
      `);
      console.log('✅ Battles is_ranked migration completed');
    } catch (error) {
      console.error('⚠️ Battles ranked migration error (may already be migrated):', error.message);
    }
  };
  
  try {
    await pool.query(createUsersTable);
    await pool.query(createNFTsTable);
    await pool.query(createMarketplaceListingsTable);
    await pool.query(createBattlesTable);
    await pool.query(createWalletNoncesTable);
    await pool.query(createMovesTable);
    await pool.query(createNFTMovesTable);
    await pool.query(createBattleTurnsTable);
    await pool.query(createIndexes);
    await migrateNFTsTable();
    await migrateHeroicColumns();
    await migrateUsersHeroColumn();
    await migrateUsersHeroRegenColumns();
    await migrateNFTsHeroRetiredColumn();
    await migrateBattlesTypeColumn();
    await migrateBattlesRankedColumn();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    throw error;
  }
};

module.exports = {
  pool,
  connectDB,
};

