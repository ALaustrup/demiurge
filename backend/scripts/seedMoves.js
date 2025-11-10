const { pool } = require('../src/config/database');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const defaultMoves = [
  // Fire moves
  {
    name: 'Fire Blast',
    description: 'A powerful fire attack',
    type: 'fire',
    power: 80,
    accuracy: 85,
    energy_cost: 10,
    target: 'enemy',
  },
  {
    name: 'Flame Thrower',
    description: 'Shoots a stream of fire',
    type: 'fire',
    power: 60,
    accuracy: 95,
    energy_cost: 8,
    target: 'enemy',
  },
  {
    name: 'Ember',
    description: 'A small flame attack',
    type: 'fire',
    power: 40,
    accuracy: 100,
    energy_cost: 5,
    target: 'enemy',
  },

  // Water moves
  {
    name: 'Hydro Pump',
    description: 'A powerful water blast',
    type: 'water',
    power: 80,
    accuracy: 80,
    energy_cost: 10,
    target: 'enemy',
  },
  {
    name: 'Water Gun',
    description: 'Shoots a stream of water',
    type: 'water',
    power: 40,
    accuracy: 100,
    energy_cost: 5,
    target: 'enemy',
  },
  {
    name: 'Bubble Beam',
    description: 'A beam of bubbles',
    type: 'water',
    power: 60,
    accuracy: 90,
    energy_cost: 7,
    target: 'enemy',
  },

  // Bio moves
  {
    name: 'Vine Whip',
    description: 'Attacks with vines',
    type: 'bio',
    power: 45,
    accuracy: 100,
    energy_cost: 6,
    target: 'enemy',
  },
  {
    name: 'Solar Beam',
    description: 'A powerful beam of light',
    type: 'bio',
    power: 90,
    accuracy: 75,
    energy_cost: 12,
    target: 'enemy',
  },
  {
    name: 'Leaf Blade',
    description: 'Slashes with sharp leaves',
    type: 'bio',
    power: 70,
    accuracy: 90,
    energy_cost: 8,
    target: 'enemy',
  },

  // Tech moves
  {
    name: 'Tech Slash',
    description: 'A high-tech cutting attack',
    type: 'tech',
    power: 70,
    accuracy: 95,
    energy_cost: 8,
    target: 'enemy',
  },
  {
    name: 'Data Stream',
    description: 'Overwhelms with data',
    type: 'tech',
    power: 60,
    accuracy: 90,
    energy_cost: 7,
    target: 'enemy',
  },
  {
    name: 'Code Breaker',
    description: 'Breaks through defenses',
    type: 'tech',
    power: 80,
    accuracy: 85,
    energy_cost: 10,
    target: 'enemy',
  },

  // Void moves
  {
    name: 'Void Pulse',
    description: 'A pulse of dark energy',
    type: 'void',
    power: 75,
    accuracy: 90,
    energy_cost: 9,
    target: 'enemy',
  },
  {
    name: 'Dark Matter',
    description: 'Attacks with dark matter',
    type: 'void',
    power: 85,
    accuracy: 80,
    energy_cost: 11,
    target: 'enemy',
  },
  {
    name: 'Shadow Ball',
    description: 'A ball of shadow energy',
    type: 'void',
    power: 65,
    accuracy: 95,
    energy_cost: 8,
    target: 'enemy',
  },

  // Neutral moves (default)
  {
    name: 'Tackle',
    description: 'A basic physical attack',
    type: 'neutral',
    power: 40,
    accuracy: 100,
    energy_cost: 0,
    target: 'enemy',
  },
  {
    name: 'Quick Attack',
    description: 'A fast attack',
    type: 'neutral',
    power: 30,
    accuracy: 100,
    energy_cost: 0,
    target: 'enemy',
  },
  {
    name: 'Strike',
    description: 'A standard strike',
    type: 'neutral',
    power: 50,
    accuracy: 95,
    energy_cost: 0,
    target: 'enemy',
  },
  {
    name: 'Power Hit',
    description: 'A powerful attack',
    type: 'neutral',
    power: 60,
    accuracy: 90,
    energy_cost: 5,
    target: 'enemy',
  },
];

async function seedMoves() {
  try {
    console.log('🌱 Seeding moves...');

    for (const move of defaultMoves) {
      await pool.query(
        `INSERT INTO moves (name, description, type, power, accuracy, energy_cost, target)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          move.name,
          move.description,
          move.type,
          move.power,
          move.accuracy,
          move.energy_cost,
          move.target,
        ]
      );
    }

    // Assign default neutral moves to all NFTs that don't have moves
    const nftsResult = await pool.query('SELECT id FROM nfts');
    const neutralMovesResult = await pool.query(
      "SELECT id FROM moves WHERE type = 'neutral' LIMIT 4"
    );

    if (neutralMovesResult.rows.length > 0) {
      for (const nft of nftsResult.rows) {
        // Check if NFT already has moves
        const existingMoves = await pool.query(
          'SELECT COUNT(*) FROM nft_moves WHERE nft_id = $1',
          [nft.id]
        );

        if (parseInt(existingMoves.rows[0].count) === 0) {
          // Assign neutral moves
          for (const move of neutralMovesResult.rows) {
            await pool.query(
              `INSERT INTO nft_moves (nft_id, move_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [nft.id, move.id]
            );
          }
        }
      }
    }

    console.log('✅ Moves seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding moves:', error);
    process.exit(1);
  }
}

seedMoves();

