# 🎨 Demiurge Platform - Comprehensive Overview

## Executive Summary

**Demiurge** is a full-stack decentralized NFT platform featuring a custom blockchain backend, comprehensive marketplace, gamified battle system, and real-time social features. The platform enables users to create, mint, trade, and battle NFTs while earning Bits and climbing social tiers.

---

## 🏗️ System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│         Next.js 14 + React 18 + Chakra UI                │
│                    Port: 3000                            │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTP/REST + WebSocket
┌────────────────────▼──────────────────────────────────────┐
│                    BACKEND LAYER                          │
│      Express.js + PostgreSQL + MongoDB + Socket.IO       │
│                    Port: 5000                             │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐ ┌─────▼─────┐ ┌──▼──────┐
│ PostgreSQL │ │  MongoDB  │ │   IPFS  │
│  (Port     │ │  (Port    │ │  (Port  │
│   5432)    │ │   27017)  │ │  5001)  │
└────────────┘ └───────────┘ └─────────┘
        │
┌───────▼────┐
│ Blockchain │
│  Hardhat   │
│  (Port     │
│   8545)    │
└────────────┘
```

---

## 🧰 Complete Tech Stack

### **Frontend Stack**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.0.4 | React framework with App Router |
| **React** | 18.2.0 | UI library |
| **TypeScript** | 5.3.3 | Type safety |
| **Chakra UI** | 2.8.2 | Component library |
| **TailwindCSS** | 3.4.0 | Utility-first CSS |
| **Zustand** | 4.4.7 | State management |
| **Axios** | 1.6.2 | HTTP client |
| **Socket.IO Client** | 4.6.1 | Real-time communication |
| **Ethers.js** | 6.9.2 | Blockchain interaction |
| **React Player** | 2.13.0 | Media playback |
| **React Hot Toast** | 2.4.1 | Notifications |

### **Backend Stack**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 4.18.2 | Web framework |
| **PostgreSQL** | 16 | Primary database (users, NFTs, marketplace, battles) |
| **MongoDB** | 7 | Chat messages storage |
| **Socket.IO** | 4.6.1 | WebSocket server |
| **JWT** | 9.0.2 | Authentication |
| **bcryptjs** | 2.4.3 | Password hashing |
| **Multer** | 2.0.2 | File upload handling |
| **pg** | 8.11.3 | PostgreSQL client |
| **mongoose** | 8.0.3 | MongoDB ODM |
| **ipfs-http-client** | 60.0.1 | IPFS integration |
| **ethers** | 6.9.2 | Blockchain interaction |

### **Blockchain Stack**

| Technology | Version | Purpose |
|------------|---------|---------|
| **Solidity** | ^0.8.20 | Smart contract language |
| **Hardhat** | Latest | Development framework |
| **OpenZeppelin** | ^5.0 | Security-tested contracts |
| **Ethers.js** | 6.9.2 | Contract interaction |

### **Infrastructure & DevOps**

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD (configured) |
| **IPFS** | Decentralized file storage |

---

## ✨ Implemented Features

### **1. User Authentication & Management**

#### ✅ **Registration System**
- Username, email, and password registration
- Automatic wallet address generation (Ethereum-compatible)
- Password hashing with bcrypt
- JWT token generation
- Initial Bits (0) and social score (0) assignment
- Default social tier: Bronze

#### ✅ **Login System**
- Email/password authentication
- JWT token-based session management
- Automatic token refresh
- Protected route middleware

#### ✅ **User Profile**
- Display user stats (Bits, social score, tier)
- Wallet address display
- Battle statistics
- Account creation date

#### ✅ **Social Scoring System**
- **Tiers**: Bronze → Silver → Gold → Platinum → Diamond
- **Bits**: Earned through battles and activities
- **Social Score**: Calculated from Bits and activity
- **Leaderboard**: Ranked by social score and Bits

### **2. NFT Creation & Management**

#### ✅ **NFT Creation Page** (`/create`)
- File upload (images, videos, audio)
- Media type selection
- Name and description input
- File preview before upload
- IPFS upload integration
- Metadata JSON generation
- Database storage

#### ✅ **NFT Gallery** (`/gallery`)
- **Display Features**:
  - Grid layout with NFT cards
  - Media preview (images, videos, audio)
  - NFT details (name, description, owner, creator)
  - Battle power and level display
  - Created date

- **Search & Filter**:
  - Search by name/description
  - Filter by media type (image, video, audio)
  - Sort by: newest, oldest, battle power, level

- **User Actions**:
  - View NFT details in modal
  - List owned NFTs for sale
  - View creator and owner information

#### ✅ **NFT Smart Contract** (`DemiurgeNFT.sol`)
- ERC-721 standard implementation
- IPFS hash verification
- Token metadata storage
- Creator tracking
- Battle power and level attributes
- User token tracking

### **3. Marketplace System**

#### ✅ **Marketplace Page** (`/marketplace`)
- **Listing Display**:
  - Active listings grid
  - Price display
  - Seller information
  - NFT media preview
  - Battle power and level

- **Search & Sort**:
  - Search by name/description
  - Sort by: price (low/high), battle power, level

- **Purchase Flow**:
  - Buy button for each listing
  - Transaction confirmation
  - Ownership transfer
  - Listing status update

#### ✅ **Marketplace Smart Contract** (`NFTMarketplace.sol`)
- Listing creation
- Purchase execution
- Price management
- Ownership transfer
- Reentrancy protection

#### ✅ **Backend Marketplace API**
- Create listings
- Browse active listings
- Purchase NFTs
- Cancel listings
- Query by seller/status

### **4. NFT WARS Battle System**

#### ✅ **Battles Page** (`/battles`)
- **Battle History**:
  - Display user's battles
  - Attacker vs Defender
  - Winner display
  - Status (pending/completed)
  - Bits rewards

- **Battle Creation**:
  - Select attacker NFT (from user's collection)
  - Select defender NFT (from all NFTs)
  - Initiate battle
  - Battle validation

- **Battle Completion**:
  - Complete pending battles
  - Winner determination (based on battle power)
  - Bits reward distribution
  - Social score updates

#### ✅ **Battle Smart Contract** (`NFTWars.sol`)
- Battle initiation
- Battle completion
- Winner determination
- Level-up mechanics
- Battle power calculations

#### ✅ **Backend Battle API**
- Create battles
- Complete battles
- Fetch user battles
- Calculate winners
- Distribute rewards

### **5. Real-Time Chat System**

#### ✅ **Chat Page** (`/chat`)
- **Global Chat**:
  - Real-time message broadcasting
  - Username display
  - Timestamp display
  - Message history

- **Private Chat**:
  - One-on-one messaging
  - User selection
  - Private message history
  - Real-time updates

- **Features**:
  - Socket.IO integration
  - Auto-scroll to latest messages
  - Tab-based interface
  - Message status indicators

#### ✅ **Backend Chat System**
- Socket.IO server
- Global chat rooms
- Private chat rooms (per user)
- Message persistence (MongoDB)
- User presence tracking

### **6. IPFS Integration**

#### ✅ **IPFS Service**
- File upload to IPFS
- Metadata JSON upload
- IPFS hash retrieval
- Public gateway URLs
- Error handling

#### ✅ **Storage**
- Media files (images, videos, audio)
- NFT metadata JSON
- Decentralized storage
- Content addressing

### **7. Mock Data Generation**

#### ✅ **Mock Data Script** (`generateMockData.js`)
- **Users**: 200+ mock accounts
- **NFTs**: Hundreds of NFTs with various:
  - Names (Cyber Samurai, Neon Dragon, etc.)
  - Descriptions
  - Media types (image, video, audio)
  - Battle powers (100-1000)
  - Levels (1-10)
- **Listings**: Active marketplace listings
- **Battles**: Historical battle records
- **Data Clearing**: Prevents duplicates

### **8. UI/UX Features**

#### ✅ **Cyberpunk Theme**
- **Color Palette**:
  - Dark backgrounds (#1a1a2e)
  - Neon accents (green, pink, purple)
  - Gradient text effects
  - Glow effects

- **Typography**:
  - Orbitron (headings)
  - JetBrains Mono (body)
  - Custom font weights

- **Components**:
  - Cyberpunk-styled buttons
  - Neon borders
  - Animated gradients
  - Hover effects
  - Card shadows

#### ✅ **Responsive Design**
- Mobile-friendly layouts
- Grid systems
- Flexible containers
- Touch-friendly interactions

#### ✅ **Navigation**
- Navbar with dynamic links
- Authentication-aware navigation
- Protected routes
- Active link highlighting

---

## 📊 Database Schema

### **PostgreSQL Tables**

#### **users**
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- wallet_address (VARCHAR UNIQUE)
- bits (INTEGER DEFAULT 0)
- social_score (INTEGER DEFAULT 0)
- social_tier (VARCHAR DEFAULT 'bronze')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **nfts**
```sql
- id (SERIAL PRIMARY KEY)
- token_id (INTEGER)
- owner_id (INTEGER REFERENCES users)
- creator_id (INTEGER REFERENCES users)
- contract_address (VARCHAR)
- ipfs_hash (VARCHAR)
- token_uri (TEXT)
- name (VARCHAR)
- description (TEXT)
- media_type (VARCHAR)
- media_url (TEXT)
- battle_power (INTEGER DEFAULT 100)
- level (INTEGER DEFAULT 1)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **marketplace_listings**
```sql
- id (SERIAL PRIMARY KEY)
- nft_id (INTEGER REFERENCES nfts)
- seller_id (INTEGER REFERENCES users)
- price (DECIMAL(20, 8))
- status (VARCHAR DEFAULT 'active')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **battles**
```sql
- id (SERIAL PRIMARY KEY)
- battle_id (BIGINT)
- attacker_nft_id (INTEGER REFERENCES nfts)
- defender_nft_id (INTEGER REFERENCES nfts)
- attacker_id (INTEGER REFERENCES users)
- defender_id (INTEGER REFERENCES users)
- winner_id (INTEGER REFERENCES users)
- bits_reward (INTEGER)
- status (VARCHAR DEFAULT 'pending')
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

### **MongoDB Collections**

#### **chatmessages**
```javascript
{
  senderId: Number,
  senderUsername: String,
  recipientId: Number, // null for global
  message: String,
  type: String, // 'global' or 'private'
  timestamp: Date
}
```

---

## 🔌 API Endpoints

### **Authentication** (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile (protected)

### **NFTs** (`/api/nft`)
- `POST /create` - Create NFT (with file upload)
- `GET /gallery` - Get all NFTs
- `GET /my` - Get user's NFTs (protected)
- `GET /:id` - Get NFT by ID
- `POST /:id/list` - List NFT for sale (protected)

### **Marketplace** (`/api/marketplace`)
- `GET /listings` - Get active listings
- `POST /list` - Create listing (protected)
- `POST /:id/buy` - Purchase NFT (protected)
- `POST /:id/cancel` - Cancel listing (protected)

### **Battles** (`/api/battle`)
- `POST /` - Create battle (protected)
- `GET /my` - Get user's battles (protected)
- `POST /:id/complete` - Complete battle (protected)

### **Chat** (`/api/chat`)
- `GET /messages` - Get chat history
- `GET /messages/private/:userId` - Get private messages (protected)
- Socket.IO events: `send-global-message`, `send-private-message`

### **Users** (`/api/user`)
- `GET /leaderboard` - Get leaderboard
- `GET /:id` - Get user by ID

---

## 🎮 User Flows

### **NFT Creation Flow**
1. User navigates to `/create`
2. Uploads media file (image/video/audio)
3. Enters name, description, selects media type
4. Backend uploads file to IPFS
5. Backend creates metadata JSON
6. Backend uploads metadata to IPFS
7. NFT record stored in database
8. User can mint on blockchain (future: wallet integration)

### **Marketplace Purchase Flow**
1. User browses `/marketplace`
2. Searches/filters listings
3. Clicks "Buy" on desired NFT
4. Backend validates purchase
5. Smart contract executes transfer
6. Ownership updated in database
7. Listing marked as sold
8. Bits transferred (if applicable)

### **Battle Flow**
1. User navigates to `/battles`
2. Selects attacker NFT (from their collection)
3. Selects defender NFT (from all NFTs)
4. Initiates battle
5. Battle record created (status: pending)
6. User completes battle
7. Winner determined (higher battle power)
8. Bits awarded to winner
9. Social scores updated
10. Battle marked as completed

### **Chat Flow**
1. User navigates to `/chat`
2. Socket.IO connection established
3. User joins global chat room
4. User joins private chat room (by user ID)
5. Messages sent/received in real-time
6. Messages persisted to MongoDB
7. Message history loaded on page load

---

## 🔒 Security Features

### **Authentication & Authorization**
- JWT tokens with expiration
- Password hashing (bcrypt, 10 rounds)
- Protected routes middleware
- Token validation on each request

### **Data Protection**
- Parameterized SQL queries (prevents SQL injection)
- Input validation
- File upload size limits (50MB)
- CORS configuration
- Helmet.js security headers

### **Smart Contract Security**
- OpenZeppelin contracts (battle-tested)
- Reentrancy protection
- Access control (Ownable)
- Input validation

---

## 🚀 Deployment Architecture

### **Development Environment**
- Local Hardhat node (port 8545)
- Docker Compose for databases
- Local IPFS node (port 5001)
- Hot-reload enabled

### **Production Ready**
- Docker containers for all services
- Environment variable configuration
- Health check endpoints
- Database migrations
- CI/CD pipeline (GitHub Actions)

---

## 📈 Performance Optimizations

### **Database**
- Indexed queries (users, NFTs, listings, battles)
- Efficient joins
- Pagination support

### **Frontend**
- Next.js App Router (server components)
- Image optimization
- Code splitting
- Lazy loading

### **Backend**
- Connection pooling (PostgreSQL)
- Compression middleware
- Request rate limiting (can be added)

---

## 🎨 Design System

### **Color Scheme**
- **Primary Dark**: `#1a1a2e`
- **Secondary Dark**: `#16213e`
- **Neon Green**: `#00ff88`
- **Neon Pink**: `#ec4899`
- **Neon Purple**: `#8b5cf6`
- **Cyber Blue**: `#0ea5e9`

### **Typography**
- **Headings**: Orbitron (bold, futuristic)
- **Body**: JetBrains Mono (monospace, technical)

### **Components**
- Cyberpunk-styled cards
- Neon borders and glows
- Gradient text effects
- Animated hover states
- Modal dialogs
- Toast notifications

---

## 📝 Current Status

### **✅ Fully Implemented**
- User authentication (register/login)
- NFT creation and gallery
- Marketplace (listings and purchases)
- Battle system (creation and completion)
- Real-time chat (global and private)
- IPFS integration
- Mock data generation
- Cyberpunk UI theme
- Responsive design
- Database schema
- API endpoints
- Smart contracts

### **🔄 Partially Implemented**
- Blockchain minting (backend ready, needs wallet integration)
- Wallet connection (infrastructure ready)

### **📋 Future Enhancements**
- MetaMask/WalletConnect integration
- Email notifications
- Push notifications
- Advanced analytics
- Mobile app (React Native)
- Layer 2 integration (Polygon/Arbitrum)
- DAO governance
- NFT staking
- Royalty system
- Collection creation
- NFT metadata editing

---

## 🧪 Testing & Quality

### **Code Quality**
- TypeScript for type safety
- ESLint configuration
- Consistent code style
- Error handling
- Logging

### **Database**
- Foreign key constraints
- Unique constraints
- Indexes for performance
- Data validation

---

## 📚 Documentation

- **README.md**: Quick start guide
- **ARCHITECTURE.md**: System architecture details
- **SETUP.md**: Detailed setup instructions
- **PLATFORM_OVERVIEW.md**: This document

---

## 🎯 Key Metrics

- **Users**: 200+ mock accounts generated
- **NFTs**: Hundreds of NFTs with various attributes
- **Listings**: Active marketplace listings
- **Battles**: Historical battle records
- **Pages**: 9 main pages implemented
- **API Endpoints**: 20+ endpoints
- **Smart Contracts**: 3 contracts deployed

---

## 🔗 Repository Structure

```
demiurge/
├── blockchain/          # Smart contracts & Hardhat
│   ├── contracts/       # Solidity contracts
│   ├── scripts/         # Deployment scripts
│   └── test/            # Contract tests
├── backend/            # Express.js API
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── config/      # Database & config
│   │   └── middleware/  # Auth & validation
│   └── scripts/         # Mock data generation
├── frontend/           # Next.js app
│   ├── src/
│   │   ├── app/         # Pages (App Router)
│   │   ├── components/  # Reusable components
│   │   ├── store/       # Zustand state
│   │   └── utils/       # Utilities & API client
│   └── public/          # Static assets
├── docker-compose.yml   # Docker services
└── README.md            # Project documentation
```

---

## 🎉 Summary

**Demiurge** is a production-ready NFT platform with:
- ✅ Complete authentication system
- ✅ NFT creation and management
- ✅ Full-featured marketplace
- ✅ Gamified battle system
- ✅ Real-time chat
- ✅ Decentralized storage (IPFS)
- ✅ Smart contract integration
- ✅ Beautiful cyberpunk UI
- ✅ Comprehensive API
- ✅ Mock data for testing

The platform is ready for development, testing, and can be extended with wallet integration and additional features as needed.

