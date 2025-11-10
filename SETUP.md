# 🚀 Setup Guide

This guide will help you set up and run the Demiurge NFT platform locally.

## Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ALaustrup/demiurge.git
cd demiurge

# Install root dependencies
npm install

# Install blockchain dependencies
cd blockchain
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Docker Services

From the root directory:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- MongoDB (port 27017)
- IPFS node (ports 4001, 5001, 8080)

### 3. Configure Environment Variables

#### Backend Configuration

Create `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://demiurge:demiurge_password@localhost:5432/demiurge_db
MONGODB_URI=mongodb://localhost:27017/demiurge_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
IPFS_URL=http://localhost:5001
BLOCKCHAIN_RPC_URL=http://localhost:8545
NFT_CONTRACT_ADDRESS=
MARKETPLACE_CONTRACT_ADDRESS=
WARS_CONTRACT_ADDRESS=
FRONTEND_URL=http://localhost:3000
```

#### Blockchain Configuration

Create `blockchain/.env`:

```bash
cp blockchain/.env.example blockchain/.env
```

Edit `blockchain/.env`:

```env
PRIVATE_KEY=your-private-key-here
RPC_URL=http://localhost:8545
```

#### Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Deploy Smart Contracts

```bash
cd blockchain

# Start local Hardhat node (in a separate terminal)
npm run node

# In another terminal, deploy contracts
npm run deploy:local
```

Copy the contract addresses from `blockchain/deployments.json` to your `backend/.env` file.

### 5. Start Development Servers

From the root directory:

```bash
# Start backend
npm run dev:backend

# Start frontend (in another terminal)
npm run dev:frontend
```

Or start both at once:

```bash
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## Testing

### Test Smart Contracts

```bash
cd blockchain
npm test
```

### Test Backend API

```bash
cd backend
npm test
```

## Troubleshooting

### Database Connection Issues

Ensure Docker containers are running:

```bash
docker-compose ps
```

If containers are not running:

```bash
docker-compose up -d
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml` to use different ports.

### IPFS Connection

Ensure IPFS is accessible:

```bash
curl http://localhost:5001/api/v0/version
```

### Contract Deployment

If contract deployment fails:
1. Ensure Hardhat node is running
2. Check that you have sufficient test ETH
3. Verify contract addresses in `deployments.json`

## Production Deployment

### Environment Variables

Update all `.env` files with production values:
- Use strong JWT secrets
- Use production database URLs
- Configure production IPFS gateway
- Set production blockchain RPC URLs

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Backend runs with Node.js directly
cd ../backend
npm start
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Next Steps

1. Create your first user account
2. Mint your first NFT
3. Explore the marketplace
4. Engage in NFT WARS battles
5. Chat with other users

## Support

For issues or questions, please open an issue on GitHub.

