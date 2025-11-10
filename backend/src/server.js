const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const { initializeSocket } = require('./config/socket');

// Import routes
const authRoutes = require('./routes/auth');
const nftRoutes = require('./routes/nft');
const marketplaceRoutes = require('./routes/marketplace');
const battleRoutes = require('./routes/battle');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const heroRoutes = require('./routes/hero');
const ladderRoutes = require('./routes/ladder');
const rpgRoutes = require('./routes/rpg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/ladder', ladderRoutes);
app.use('/api/rpg', rpgRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectMongoDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Initialize Socket.IO
    initializeSocket(server);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

