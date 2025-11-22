# Demiurge Architecture

## Overview

Demiurge is a sovereign L1 blockchain built in Rust, designed for a creator economy centered around D-GEN NFTs, Fabric content, and the Abyss marketplace.

## Core Components

### 1. Blockchain Node (`chain/`)

The Rust-based blockchain node implements:

#### State Management
- **Pluggable Backend**: Supports in-memory (for tests) and RocksDB (for production) backends
- **Thread-Safe**: State is wrapped in `Arc<Mutex<...>>` for concurrent RPC access
- **Key-Value Store**: Simple key-value abstraction over storage backends

#### Proof of Work (Forge)
- **Memory-Hard**: Uses Argon2id for memory-hard hashing
- **Final Hash**: SHA-256 of Argon2id output
- **Difficulty Target**: Configurable difficulty based on first 16 bytes of hash

#### Runtime Modules
Runtime modules handle domain-specific logic:

- **`bank_cgt`**: CGT token balances, transfers, and minting
- **`avatars_profiles`**: Archon role flags and identity management
- **`nft_dgen`**: D-GEN NFT minting, transfers, and metadata
- **`fabric_manager`**: Fabric asset registration and fee pools
- **`abyss_registry`**: NFT marketplace listings, buying, and royalties

#### JSON-RPC Server
- **Framework**: Axum + Tokio
- **Endpoint**: `http://127.0.0.1:8545/rpc`
- **Methods**: See [README.md](./README.md#json-rpc-api) for full API

### 2. Portal Website (`apps/portal-web/`)

Next.js 15+ portal with:
- **Live Chain Status**: Real-time polling of chain height
- **Genesis Archon Dashboard**: Balance, Archon status, and NFT display
- **Mint Test NFT**: Dev-only button for minting test NFTs
- **Dark Theme**: Glassmorphic UI with TailwindCSS and Framer Motion

### 3. Desktop App (`apps/desktop/`) [Optional]

Qt 6.10 QML desktop application for:
- Chain status monitoring
- Wallet balance viewing
- Archon status checking

**Note**: The desktop app is optional and does not block builds or development.

## Data Flow

### Genesis Initialization

1. Node starts and opens RocksDB at `.demiurge/data`
2. Checks for `demiurge/genesis_initialized` key
3. If not initialized:
   - Mints 1,000,000 CGT to Genesis Archon address
   - Marks Genesis Archon as Archon
   - Sets initialization flag

### NFT Minting Flow

1. Portal calls `cgt_mintDgenNft` RPC method
2. RPC handler validates:
   - Owner address is an Archon
   - `fabric_root_hash` is valid hex
3. Creates transaction and dispatches to `nft_dgen` module
4. Module:
   - Increments NFT counter
   - Stores NFT metadata
   - Updates owner's NFT list
5. Returns NFT ID and metadata

### State Storage

State is stored as key-value pairs in RocksDB:

- **CGT Balances**: `bank:balance:{address}` → `u64` (bincode serialized)
- **Archon Flags**: `avatars:archon:{address}` → `[1u8]` or `[0u8]`
- **NFT Metadata**: `nft:token:{id}` → `DGenMetadata` (bincode serialized)
- **Owner NFTs**: `nft:owner:{address}` → `Vec<NftId>` (bincode serialized)
- **NFT Counter**: `nft:counter` → `NftId` (bincode serialized)

## Security Considerations

### Dev Mode vs Production

- **Dev Faucet**: Only available in debug builds (`#[cfg(debug_assertions)]`)
- **Signature Validation**: Currently bypassed for dev convenience
- **Nonce Checks**: Currently bypassed for dev convenience

**Note**: For production, proper signature validation and nonce checks must be implemented.

### Genesis Authority

The Genesis authority is the all-zero address (`[0u8; 32]`). Only this address can:
- Mint CGT via `bank_cgt::mint_to`
- Initialize genesis state

## Future Enhancements

### Phase 2.5+
- Block persistence and retrieval
- State root computation
- Full transaction validation (signatures, nonces)

### Phase 3+
- P2P networking
- Block production (mining)
- Consensus mechanism
- Full signature validation

### Phase 4+
- Fabric P2P network integration
- Abyss marketplace full implementation
- Wallet integration
- Multi-signature support

## Development

### Building

```bash
# Build Rust chain
cargo build -p demiurge-chain

# Build portal
cd apps/portal-web
pnpm build
```

### Testing

```bash
# Run Rust tests
cargo test -p demiurge-chain

# Run portal lint
cd apps/portal-web
pnpm lint
```

### Running

```bash
# Start chain node
cargo run -p demiurge-chain

# Start portal (in separate terminal)
cd apps/portal-web
pnpm dev
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_DEMIURGE_RPC_URL`: RPC endpoint URL (default: `http://127.0.0.1:8545/rpc`)
- `NEXT_PUBLIC_GENESIS_ARCHON_ADDRESS`: Genesis Archon address (default: `aa...aa`)

### Chain Configuration

See `chain/src/config.rs` for:
- Genesis Archon address
- Initial CGT balance
- Dev faucet amount

## Troubleshooting

### Node Won't Start

- Check that `.demiurge/data` directory is writable
- Ensure port 8545 is not in use
- Check logs for RocksDB errors

### Portal Can't Connect

- Verify node is running: `curl http://127.0.0.1:8545/rpc -d '{"jsonrpc":"2.0","method":"cgt_getChainInfo","params":null,"id":1}'`
- Check `NEXT_PUBLIC_DEMIURGE_RPC_URL` environment variable
- Check browser console for CORS errors

### NFT Minting Fails

- Verify address is an Archon: `cgt_isArchon`
- Check `fabric_root_hash` is 64 hex characters
- Ensure node is in debug mode for dev features

