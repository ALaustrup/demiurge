//! Node structure for managing chain state and operations.
//!
//! The Node struct owns the persistent state, maintains a mempool for pending
//! transactions, and tracks chain height. In Phase 5, State is wrapped in
//! Arc<Mutex<...>> for thread-safe concurrent reads from JSON-RPC handlers.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use bincode;

use crate::config::{GENESIS_ARCHON_ADDRESS, GENESIS_ARCHON_INITIAL_BALANCE};
use crate::core::block::Block;
use crate::core::state::State;
use crate::core::transaction::{Address, Transaction};
use crate::runtime::{
    get_balance_cgt, get_fabric_asset, get_listing, get_nft, get_nfts_by_owner, is_archon,
    AvatarsProfilesModule, BankCgtModule, FabricRootHash, ListingId, NftId, RuntimeModule,
};

/// Chain information returned by JSON-RPC queries.
#[derive(Clone)]
pub struct ChainInfo {
    /// Current chain height (number of blocks).
    pub height: u64,
}

/// Node structure managing chain state and operations.
///
/// The Node owns:
/// - A thread-safe State (RocksDB-backed, wrapped in Arc<Mutex<...>>)
/// - A mempool for pending transactions
/// - Chain height tracking
///
/// In Phase 5, State is wrapped for concurrent read access from JSON-RPC handlers.
pub struct Node {
    /// Thread-safe persistent state storage.
    state: Arc<Mutex<State>>,
    /// Path to the RocksDB database.
    pub db_path: PathBuf,
    /// Mempool of pending transactions (not yet included in blocks).
    pub mempool: Arc<Mutex<Vec<Transaction>>>,
    /// Current chain height.
    pub height: Arc<Mutex<u64>>,
}

impl Node {
    /// Create a new node with RocksDB-backed state.
    ///
    /// # Arguments
    /// - `db_path`: Path to the RocksDB database directory
    ///
    /// # Returns
    /// A new Node instance with empty mempool and height 0
    ///
    /// # Note
    /// This function automatically initializes genesis state if not already done.
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let mut state = State::open_rocksdb(&db_path)?;
        
        // Initialize genesis state if needed
        init_genesis_state(&mut state)?;
        
        Ok(Self {
            state: Arc::new(Mutex::new(state)),
            db_path,
            mempool: Arc::new(Mutex::new(Vec::new())),
            height: Arc::new(Mutex::new(0)),
        })
    }

    /// Get current chain information.
    pub fn chain_info(&self) -> ChainInfo {
        let height = *self.height.lock().expect("height mutex poisoned");
        ChainInfo { height }
    }

    /// Get a block by height.
    ///
    /// # Arguments
    /// - `height`: The block height to query
    ///
    /// # Returns
    /// `Some(Block)` if the block exists, `None` otherwise
    ///
    /// # Note
    /// This is a stub implementation. In Phase 2.5+, block persistence will be
    /// implemented and blocks will be read from RocksDB.
    pub fn get_block_by_height(&self, _height: u64) -> Option<Block> {
        // TODO: Phase 2.5+ - implement block persistence and retrieval
        // For now, return None and document this limitation
        None
    }

    /// Submit a transaction to the mempool.
    ///
    /// # Arguments
    /// - `tx`: The transaction to add to the mempool
    ///
    /// # Note
    /// This adds the transaction to the mempool but does not immediately
    /// include it in a block. Block production and transaction inclusion
    /// will be implemented in later phases.
    pub fn submit_transaction(&self, tx: Transaction) {
        let mut mempool = self.mempool.lock().expect("mempool mutex poisoned");
        mempool.push(tx);
        // Later phases will include block production and actual inclusion.
    }

    /// Execute a function with read-only access to state.
    ///
    /// This helper provides thread-safe read access to the state for RPC handlers.
    pub fn with_state<R>(&self, f: impl FnOnce(&State) -> R) -> R {
        let state = self.state.lock().expect("state mutex poisoned");
        f(&state)
    }

    /// Get CGT balance for an address.
    pub fn get_balance_cgt(&self, addr: &Address) -> u64 {
        self.with_state(|state| get_balance_cgt(state, addr))
    }

    /// Check if an address has Archon status.
    pub fn is_archon(&self, addr: &Address) -> bool {
        self.with_state(|state| is_archon(state, addr))
    }

    /// Get NFT IDs owned by an address.
    pub fn get_nfts_by_owner(&self, owner: &Address) -> Vec<NftId> {
        self.with_state(|state| get_nfts_by_owner(state, owner))
    }

    /// Get NFT metadata by ID.
    pub fn get_nft(&self, id: NftId) -> Option<crate::runtime::nft_dgen::DGenMetadata> {
        self.with_state(|state| get_nft(state, id))
    }

    /// Get marketplace listing by ID.
    pub fn get_listing(&self, id: ListingId) -> Option<crate::runtime::abyss_registry::Listing> {
        self.with_state(|state| get_listing(state, id))
    }

    /// Get Fabric asset by root hash.
    pub fn get_fabric_asset(
        &self,
        root: &FabricRootHash,
    ) -> Option<crate::runtime::fabric_manager::FabricAsset> {
        self.with_state(|state| get_fabric_asset(state, root))
    }

    /// Execute a function with mutable access to state.
    ///
    /// This helper provides thread-safe mutable access to the state for operations
    /// like genesis initialization, dev faucet, and direct minting.
    pub fn with_state_mut<R>(&self, f: impl FnOnce(&mut State) -> R) -> R {
        let mut state = self.state.lock().expect("state mutex poisoned");
        f(&mut state)
    }
}

/// Initialize genesis state if not already initialized.
///
/// This function:
/// 1. Checks if genesis has already been initialized
/// 2. If not, mints CGT to the Genesis Archon address
/// 3. Marks the Genesis Archon address as an Archon
/// 4. Sets the genesis initialization flag
fn init_genesis_state(state: &mut State) -> Result<()> {
    const KEY_GENESIS_INITIALIZED: &[u8] = b"demiurge/genesis_initialized";

    // Check if already initialized
    if state.get_raw(KEY_GENESIS_INITIALIZED).is_some() {
        return Ok(());
    }

    // Initialize Genesis Archon: mint CGT and mark as Archon
    let genesis_addr = GENESIS_ARCHON_ADDRESS;

    // Mint CGT to Genesis Archon
    let bank_module = BankCgtModule::new();
    let mint_params = crate::runtime::bank_cgt::MintToParams {
        to: genesis_addr,
        amount: GENESIS_ARCHON_INITIAL_BALANCE,
    };
    let mint_tx = Transaction {
        from: [0u8; 32], // Genesis authority (all zeros)
        nonce: 0,
        module_id: "bank_cgt".to_string(),
        call_id: "mint_to".to_string(),
        payload: bincode::serialize(&mint_params)?,
        fee: 0,
        signature: vec![],
    };
    bank_module
        .dispatch("mint_to", &mint_tx, state)
        .map_err(|e| anyhow::anyhow!("Failed to mint genesis CGT: {}", e))?;

    // Mark Genesis Archon as Archon
    let avatars_module = AvatarsProfilesModule::new();
    let claim_tx = Transaction {
        from: genesis_addr,
        nonce: 0,
        module_id: "avatars_profiles".to_string(),
        call_id: "claim_archon".to_string(),
        payload: vec![],
        fee: 0,
        signature: vec![],
    };
    avatars_module
        .dispatch("claim_archon", &claim_tx, state)
        .map_err(|e| anyhow::anyhow!("Failed to claim genesis Archon: {}", e))?;

    // Mark genesis as initialized
    state
        .put_raw(KEY_GENESIS_INITIALIZED.to_vec(), vec![1u8])?;

    Ok(())
}
