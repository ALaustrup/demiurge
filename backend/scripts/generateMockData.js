const { pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const { uploadMetadata } = require('../src/services/ipfs');

// Mock NFT data
const nftNames = [
  'Cyber Samurai', 'Neon Dragon', 'Quantum Hacker', 'Digital Ghost', 'Matrix Warrior',
  'Plasma Blade', 'Data Stream', 'Code Breaker', 'Virtual Assassin', 'Neural Link',
  'Cyber Phoenix', 'Electric Storm', 'Binary Beast', 'Pixel Demon', 'Glitch King',
  'Neon Ninja', 'Quantum Queen', 'Digital Deity', 'Code Crusher', 'Matrix Master',
  'Plasma Paladin', 'Data Destroyer', 'Virtual Vanguard', 'Neural Nexus', 'Cyber Centurion',
  'Electric Emperor', 'Binary Baron', 'Pixel Prince', 'Glitch Guardian', 'Neon Nomad'
];

const nftDescriptions = [
  'A legendary warrior from the digital realm',
  'Forged in the fires of the blockchain',
  'Born from pure code and electricity',
  'A guardian of the virtual world',
  'Master of the cyber dimension',
  'Wielder of quantum powers',
  'Protector of the data streams',
  'Champion of the matrix',
  'Legendary fighter of the net',
  'Guardian of the digital frontier'
];

const mediaTypes = ['image', 'video', 'audio'];
const usernames = [];
const emails = [];

// Generate unique usernames and emails
for (let i = 1; i <= 200; i++) {
  usernames.push(`cyber${i}`, `neon${i}`, `quantum${i}`, `matrix${i}`, `digital${i}`);
  emails.push(`cyber${i}@demiurge.io`, `neon${i}@demiurge.io`, `quantum${i}@demiurge.io`, `matrix${i}@demiurge.io`, `digital${i}@demiurge.io`);
}

const generateMockData = async () => {
  try {
    console.log('🚀 Starting mock data generation...');
    
    // Clear existing mock data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await pool.query('DELETE FROM battles');
    await pool.query('DELETE FROM marketplace_listings');
    await pool.query('DELETE FROM nfts');
    await pool.query('DELETE FROM users WHERE username LIKE \'cyber%\' OR username LIKE \'neon%\' OR username LIKE \'quantum%\' OR username LIKE \'matrix%\' OR username LIKE \'digital%\'');
    console.log('✅ Existing mock data cleared');
    
    // Generate users
    console.log('👥 Creating users...');
    const userIds = [];
    const passwordHash = await bcrypt.hash('password123', 10);
    
    for (let i = 0; i < 200; i++) {
      try {
        const wallet = ethers.Wallet.createRandom();
        const result = await pool.query(
          `INSERT INTO users (username, email, password_hash, wallet_address, bits, social_score, social_tier)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (username) DO NOTHING
           RETURNING id`,
          [
            usernames[i],
            emails[i],
            passwordHash,
            wallet.address,
            Math.floor(Math.random() * 10000) + 100, // 100-10100 bits
            Math.floor(Math.random() * 500) + 10, // 10-510 social score
            ['bronze', 'silver', 'gold', 'platinum', 'diamond'][Math.floor(Math.random() * 5)]
          ]
        );
        if (result.rows.length > 0) {
          userIds.push(result.rows[0].id);
        }
      } catch (error) {
        // Skip duplicate users
        continue;
      }
    }
    
    console.log(`✅ Created ${userIds.length} users`);
    
    // Generate NFTs
    console.log('🎨 Creating NFTs...');
    const nftIds = [];
    const ipfsHashes = [
      'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
      'QmWmyoMoctfbAaiE2VwnX6pPjdk-4p5R9kZS3MZyTYuGhL',
      'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
      'QmWmyoMoctfbAaiE2VwnX6pPjdk-4p5R9kZS3MZyTYuGhL',
      'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'
    ];
    
    for (let i = 0; i < 500; i++) {
      const ownerId = userIds[Math.floor(Math.random() * userIds.length)];
      const creatorId = userIds[Math.floor(Math.random() * userIds.length)];
      const name = nftNames[Math.floor(Math.random() * nftNames.length)] + ` #${i + 1}`;
      const description = nftDescriptions[Math.floor(Math.random() * nftDescriptions.length)];
      const mediaType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
      const ipfsHash = ipfsHashes[Math.floor(Math.random() * ipfsHashes.length)];
      const battlePower = Math.floor(Math.random() * 500) + 50; // 50-550
      const level = Math.floor(Math.random() * 10) + 1; // 1-10
      
      const tokenURI = `https://ipfs.io/ipfs/${ipfsHash}`;
      const mediaUrl = `https://picsum.photos/400/400?random=${i}`;
      
      const result = await pool.query(
        `INSERT INTO nfts (token_id, owner_id, creator_id, contract_address, ipfs_hash, token_uri, name, description, media_type, media_url, battle_power, level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          i + 1,
          ownerId,
          creatorId,
          process.env.NFT_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          ipfsHash,
          tokenURI,
          name,
          description,
          mediaType,
          mediaUrl,
          battlePower,
          level
        ]
      );
      nftIds.push(result.rows[0].id);
    }
    
    console.log(`✅ Created ${nftIds.length} NFTs`);
    
    // Generate marketplace listings
    console.log('💰 Creating marketplace listings...');
    for (let i = 0; i < 50; i++) {
      const nftId = nftIds[Math.floor(Math.random() * nftIds.length)];
      const sellerId = userIds[Math.floor(Math.random() * userIds.length)];
      const price = (Math.random() * 1000 + 10).toFixed(2); // 10-1010 bits
      
      await pool.query(
        `INSERT INTO marketplace_listings (nft_id, seller_id, price, status)
         VALUES ($1, $2, $3, $4)`,
        [nftId, sellerId, price, 'active']
      );
    }
    
    console.log('✅ Created 50 marketplace listings');
    
    // Generate battles
    console.log('⚔️ Creating battles...');
    for (let i = 0; i < 100; i++) {
      const attackerNFTId = nftIds[Math.floor(Math.random() * nftIds.length)];
      const defenderNFTId = nftIds[Math.floor(Math.random() * nftIds.length)];
      
      if (attackerNFTId === defenderNFTId) continue;
      
      const attackerNFT = await pool.query('SELECT owner_id FROM nfts WHERE id = $1', [attackerNFTId]);
      const defenderNFT = await pool.query('SELECT owner_id FROM nfts WHERE id = $1', [defenderNFTId]);
      
      if (attackerNFT.rows.length === 0 || defenderNFT.rows.length === 0) continue;
      
      const attackerId = attackerNFT.rows[0].owner_id;
      const defenderId = defenderNFT.rows[0].owner_id;
      
      const isCompleted = Math.random() > 0.3; // 70% completed
      const winnerId = isCompleted ? (Math.random() > 0.5 ? attackerId : defenderId) : null;
      const bitsReward = isCompleted ? (Math.random() > 0.5 ? 60 : 10) : null;
      
      await pool.query(
        `INSERT INTO battles (battle_id, attacker_nft_id, defender_nft_id, attacker_id, defender_id, winner_id, bits_reward, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          i + 1, // Use simple counter instead of timestamp
          attackerNFTId,
          defenderNFTId,
          attackerId,
          defenderId,
          winnerId,
          bitsReward,
          isCompleted ? 'completed' : 'pending',
          isCompleted ? new Date() : null
        ]
      );
    }
    
    console.log('✅ Created 100 battles');
    
    console.log('🎉 Mock data generation complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - NFTs: ${nftIds.length}`);
    console.log(`   - Listings: 50`);
    console.log(`   - Battles: 100`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating mock data:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const { connectDB } = require('../src/config/database');
  
  (async () => {
    try {
      await connectDB();
      await generateMockData();
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { generateMockData };

