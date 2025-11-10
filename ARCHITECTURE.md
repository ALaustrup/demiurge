# 🏗️ Architecture Overview

## System Architecture

Demiurge is built as a full-stack decentralized application with three main components:

```
┌─────────────┐
│   Frontend  │  Next.js + React + Chakra UI
│  (Port 3000)│
└──────┬──────┘
       │ HTTP/WebSocket
┌──────▼──────┐
│   Backend   │  Express.js + PostgreSQL + MongoDB
│  (Port 5000)│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼────┐
│IPFS │ │Blockchain│  Hardhat + Solidity
└─────┘ └──────┘
```

## Component Breakdown

### 1. Blockchain Layer (`/blockchain`)

**Smart Contracts:**
- **DemiurgeNFT.sol**: ERC-721 NFT contract for minting and managing NFTs
- **NFTMarketplace.sol**: Marketplace contract for buying/selling NFTs
- **NFTWars.sol**: Battle system contract for NFT battles

**Key Features:**
- NFT minting with IPFS hash verification
- Metadata storage (name, description, media type, battle power, level)
- Marketplace listings and transactions
- Battle initiation and completion
- Level-up mechanics

**Technology:**
- Solidity ^0.8.20
- Hardhat for development and testing
- OpenZeppelin contracts for security

### 2. Backend Layer (`/backend`)

**API Structure:**
```
/api/auth          - User authentication (register, login)
/api/nft           - NFT operations (create, list, get)
/api/marketplace   - Marketplace operations (list, buy, cancel)
/api/battle        - Battle operations (create, complete)
/api/chat          - Chat operations (private, global)
/api/user          - User profile and leaderboard
```

**Database Schema:**

**PostgreSQL (Primary):**
- `users`: User accounts with wallet addresses, bits, social scores
- `nfts`: NFT records linked to blockchain tokens
- `marketplace_listings`: Active marketplace listings
- `battles`: Battle history and results

**MongoDB (Chat):**
- `chatmessages`: Real-time chat messages (private and global)

**Services:**
- **IPFS Service**: Upload/download files and metadata
- **Blockchain Service**: Interact with smart contracts
- **Socket.IO**: Real-time chat functionality

**Technology:**
- Express.js
- PostgreSQL (via pg)
- MongoDB (via mongoose)
- Socket.IO for WebSocket
- JWT for authentication
- Multer for file uploads

### 3. Frontend Layer (`/frontend`)

**Pages Structure:**
- `/` - Homepage
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/gallery` - NFT gallery
- `/marketplace` - Marketplace
- `/battles` - NFT WARS battles
- `/chat` - Chat interface
- `/profile` - User profile

**State Management:**
- Zustand for global state (auth, user data)
- React hooks for component state

**Technology:**
- Next.js 14 (App Router)
- React 18
- Chakra UI for components
- TailwindCSS for styling
- Axios for API calls
- Socket.IO client for real-time features

## Data Flow

### NFT Creation Flow

1. User uploads media file via frontend
2. Backend uploads file to IPFS
3. Backend creates metadata JSON and uploads to IPFS
4. Backend stores NFT record in PostgreSQL
5. User connects wallet and mints NFT on blockchain
6. Smart contract emits event with token ID
7. Backend updates NFT record with token ID

### Marketplace Flow

1. User lists NFT for sale
2. Backend creates listing in PostgreSQL
3. NFT is transferred to marketplace contract
4. Buyer purchases NFT
5. Smart contract handles payment and transfer
6. Backend updates ownership and listing status

### Battle Flow

1. User initiates battle with two NFTs
2. Backend creates battle record
3. Smart contract records battle
4. Battle is completed (winner determined)
5. Bits are awarded to winner
6. Social scores are updated

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: Middleware checks user ownership
3. **File Upload**: Size limits and type validation
4. **Smart Contracts**: OpenZeppelin security patterns
5. **Database**: Parameterized queries to prevent SQL injection
6. **CORS**: Configured for frontend domain only

## Scalability

- **Database**: Indexed queries for performance
- **Caching**: Can add Redis for frequently accessed data
- **CDN**: IPFS provides distributed storage
- **Load Balancing**: Docker containers can be scaled horizontally
- **WebSocket**: Socket.IO supports multiple instances with Redis adapter

## Deployment

### Development
- Local Hardhat node
- Docker Compose for databases
- Local IPFS node

### Production
- Deploy contracts to Ethereum mainnet/testnet
- Use hosted IPFS gateway (Pinata, Infura)
- Deploy backend to cloud (AWS, Heroku, Railway)
- Deploy frontend to Vercel or similar
- Use managed databases (AWS RDS, MongoDB Atlas)

## Future Enhancements

1. **Wallet Integration**: MetaMask, WalletConnect
2. **Payment Gateway**: Stripe for fiat payments
3. **Analytics**: User behavior tracking
4. **Notifications**: Email/push notifications
5. **Mobile App**: React Native version
6. **Layer 2**: Optimize gas costs with Polygon/Arbitrum
7. **Governance**: DAO for platform decisions

