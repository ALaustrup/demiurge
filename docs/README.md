# Demiurge

**The Sovereign Digital Pantheon for creators, gamers, and AI.**

Demiurge is a sovereign L1 blockchain where **Archons** (creators) and **Nomads** (explorers) mint, trade, and experience D-GEN NFTs, streamed over the Fabric P2P network and traded in the Abyss marketplace, powered by the Creator God Token (CGT).

## Concepts

### Archons (Creators)
Archons are creators who have "ascended" to creator status. Archons can mint D-GEN NFTs and participate in the creator economy. The Genesis Archon is pre-funded and marked as an Archon during chain initialization.

### Nomads (Explorers)
Nomads are explorers who roam, collect, and experience worlds created by Archons. They can own and trade D-GEN NFTs.

### CGT (Creator God Token)
CGT is the native token of the Demiurge chain. It powers transactions, fees, and the creator economy. The Genesis Archon starts with 1,000,000 CGT.

### Fabric (P2P Content)
Fabric is a P2P content network that anchors immutable content roots. D-GEN NFTs reference Fabric assets via `fabric_root_hash`.

### Abyss (Creator Market)
Abyss is the native marketplace for D-GEN NFTs, where creators can list their NFTs for sale with programmable royalties.

### D-GEN NFTs
D-GEN NFTs are AI-native, provenance-rich NFTs that can be minted by Archons. Each NFT includes:
- `fabric_root_hash`: Reference to Fabric content
- `forge_model_id`: Optional AI model identifier
- `forge_prompt_hash`: Optional AI prompt hash
- `royalty_recipient`: Optional royalty recipient address
- `royalty_bps`: Royalty percentage in basis points (0-10000)

## Quickstart

### 1. Start the Chain

From the repository root:

```bash
cargo run -p demiurge-chain
```

The node will:
- Initialize RocksDB at `.demiurge/data`
- Initialize the Genesis Archon (funded with 1M CGT and marked as Archon)
- Start the JSON-RPC server on `http://127.0.0.1:8545/rpc`

### 2. Start the Portal

In a separate terminal:

```bash
cd apps/portal-web
pnpm install
pnpm dev
```

The portal will be available at `http://localhost:3000`.

### 3. Visit the Portal

Open `http://localhost:3000` in your browser. You'll see:
- **Live Chain Status**: Real-time chain height and health
- **Genesis Archon Dashboard**: Balance, Archon status, and owned NFTs
- **Mint Test NFT**: Dev-only button to mint a test D-GEN NFT

## Developer Features

### Genesis Archon

The Genesis Archon address is:
```
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

This address is:
- Pre-funded with 1,000,000 CGT during genesis initialization
- Automatically marked as an Archon
- Ready to mint D-GEN NFTs immediately

### Dev Faucet

In debug builds, you can use the `cgt_devFaucet` RPC method to mint 10,000 CGT to any address:

```json
{
  "jsonrpc": "2.0",
  "method": "cgt_devFaucet",
  "params": {
    "address": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "id": 1
}
```

**Note**: The dev faucet is only available in debug builds (`cargo run`). It is disabled in release builds.

### D-GEN NFT Mint Flow

Mint a D-GEN NFT via the `cgt_mintDgenNft` RPC method:

```json
{
  "jsonrpc": "2.0",
  "method": "cgt_mintDgenNft",
  "params": {
    "owner": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "fabric_root_hash": "0000000000000000000000000000000000000000000000000000000000000000",
    "forge_model_id": null,
    "forge_prompt_hash": null,
    "name": "Genesis Relic",
    "description": "A test D-GEN NFT"
  },
  "id": 1
}
```

**Requirements**:
- The `owner` address must be an Archon
- `fabric_root_hash` must be a 64-character hex string (32 bytes)

## JSON-RPC API

The Demiurge node exposes the following JSON-RPC methods:

### Chain Info
- `cgt_getChainInfo`: Get current chain height

### Wallet
- `cgt_getBalance`: Get CGT balance for an address
- `cgt_isArchon`: Check if an address has Archon status

### NFTs
- `cgt_getNftsByOwner`: Get all NFTs owned by an address
- `cgt_mintDgenNft`: Mint a new D-GEN NFT (Archons only)

### Marketplace
- `cgt_getListing`: Get marketplace listing by ID
- `cgt_getFabricAsset`: Get Fabric asset by root hash

### Dev Tools
- `cgt_devFaucet`: Mint 10,000 CGT to an address (debug builds only)

### Transactions
- `cgt_sendRawTransaction`: Submit a raw transaction to the mempool
- `cgt_getBlockByHeight`: Get a block by height (stubbed for now)

## Architecture

See [docs/architecture.md](./architecture.md) for detailed architecture documentation.

## Project Structure

```
DEMIURGE/
├── chain/                 # Rust L1 blockchain node
│   ├── src/
│   │   ├── core/         # Core types (Block, Transaction, State)
│   │   ├── runtime/      # Runtime modules (bank_cgt, nft_dgen, etc.)
│   │   ├── forge.rs       # Forge PoW implementation
│   │   ├── node.rs        # Node structure and state management
│   │   ├── rpc.rs         # JSON-RPC server
│   │   └── main.rs        # Entry point
│   └── Cargo.toml
├── apps/
│   ├── portal-web/        # Next.js portal website
│   └── desktop/           # Qt desktop app (optional)
├── indexer/               # Indexer services (optional)
├── docs/                  # Documentation
└── Cargo.toml            # Rust workspace root
```

## License

[Add your license here]

