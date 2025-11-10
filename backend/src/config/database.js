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
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      wallet_address VARCHAR(255) UNIQUE,
      bits INTEGER DEFAULT 0,
      social_score INTEGER DEFAULT 0,
      social_tier VARCHAR(50) DEFAULT 'bronze',
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
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `;
  
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_id);
    CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_id);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status);
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
  `;
  
  try {
    await pool.query(createUsersTable);
    await pool.query(createNFTsTable);
    await pool.query(createMarketplaceListingsTable);
    await pool.query(createBattlesTable);
    await pool.query(createIndexes);
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

