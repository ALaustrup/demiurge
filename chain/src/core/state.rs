//! State management for the Demiurge chain.
//!
//! This module provides a pluggable key-value store abstraction that supports
//! both in-memory (for tests) and RocksDB (for production) backends.

use std::collections::HashMap;
use std::path::Path;

use anyhow::Result;
use rocksdb::Options;
use rocksdb::DB;

use crate::core::block::Block;
use crate::forge::{forge_hash, meets_difficulty, ForgeConfig};
use crate::runtime::Runtime;

/// Trait for key-value storage backends.
pub trait KvBackend: Send + Sync {
    /// Get a value by key.
    fn get_raw(&self, key: &[u8]) -> Option<Vec<u8>>;

    /// Set a key-value pair.
    fn put_raw(&mut self, key: Vec<u8>, value: Vec<u8>) -> Result<()>;
}

/// In-memory backend using HashMap.
///
/// Used primarily for testing. All data is lost when the State is dropped.
pub struct InMemoryBackend {
    inner: HashMap<Vec<u8>, Vec<u8>>,
}

impl InMemoryBackend {
    /// Create a new in-memory backend.
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }
}

impl KvBackend for InMemoryBackend {
    fn get_raw(&self, key: &[u8]) -> Option<Vec<u8>> {
        self.inner.get(key).cloned()
    }

    fn put_raw(&mut self, key: Vec<u8>, value: Vec<u8>) -> Result<()> {
        self.inner.insert(key, value);
        Ok(())
    }
}

/// RocksDB backend for persistent storage.
///
/// This backend stores all data on disk using RocksDB, providing durability
/// and efficient key-value operations.
pub struct RocksDbBackend {
    db: DB,
}

impl RocksDbBackend {
    /// Open or create a RocksDB database at the given path.
    pub fn open(path: &Path) -> Result<Self> {
        let mut opts = Options::default();
        opts.create_if_missing(true);
        // Column families can be introduced later; for now use a single CF.
        let db = DB::open(&opts, path)?;
        Ok(Self { db })
    }
}

impl KvBackend for RocksDbBackend {
    fn get_raw(&self, key: &[u8]) -> Option<Vec<u8>> {
        self.db.get(key).ok().flatten()
    }

    fn put_raw(&mut self, key: Vec<u8>, value: Vec<u8>) -> Result<()> {
        self.db.put(key, value)?;
        Ok(())
    }
}

/// State wrapper that abstracts over different storage backends.
///
/// In Phase 2, this provides both in-memory (for tests) and RocksDB (for production)
/// backends. In Phase 3, this will also handle state root computation and transaction
/// execution via runtime modules.
pub struct State {
    backend: Box<dyn KvBackend>,
}

impl State {
    /// Create a new in-memory state (for testing).
    pub fn in_memory() -> Self {
        State {
            backend: Box::new(InMemoryBackend::new()),
        }
    }

    /// Open a RocksDB-backed state at the given path.
    pub fn open_rocksdb(path: &Path) -> Result<Self> {
        let backend = RocksDbBackend::open(path)?;
        Ok(State {
            backend: Box::new(backend),
        })
    }

    /// Get a value by key.
    ///
    /// Returns `None` if the key does not exist.
    pub fn get_raw(&self, key: &[u8]) -> Option<Vec<u8>> {
        self.backend.get_raw(key)
    }

    /// Set a key-value pair.
    ///
    /// If the key already exists, the value will be overwritten.
    pub fn put_raw(&mut self, key: Vec<u8>, value: Vec<u8>) -> Result<()> {
        self.backend.put_raw(key, value)
    }

    /// Execute a block, applying all transactions.
    ///
    /// This function:
    /// 1. Verifies Forge PoW
    /// 2. Dispatches each transaction to the appropriate runtime module
    ///
    /// For now, parent hash and state_root consistency are not enforced;
    /// they will be introduced once block storage and chain selection are added.
    pub fn execute_block(&mut self, block: &Block) -> Result<(), String> {
        // Verify Forge PoW
        let config = ForgeConfig::default();
        let header_bytes = block.header.serialize_without_nonce();
        let hash = forge_hash(&header_bytes, block.header.nonce, &config);

        if !meets_difficulty(&hash, block.header.difficulty_target) {
            return Err("Forge PoW verification failed".into());
        }

        // Create runtime with all default modules
        let mut runtime = Runtime::with_default_modules();

        // Dispatch each transaction to the appropriate module
        for tx in &block.body {
            runtime.dispatch_tx(tx, self)?;
        }

        // TODO: calculate and persist new state_root in header.

        Ok(())
    }
}

impl Default for State {
    fn default() -> Self {
        Self::in_memory()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_state_put_get() {
        let mut state = State::in_memory();

        // Put a value
        state
            .put_raw(b"test_key".to_vec(), b"test_value".to_vec())
            .expect("put should succeed");

        // Get it back
        let value = state.get_raw(b"test_key");
        assert_eq!(value, Some(b"test_value".to_vec()));

        // Non-existent key returns None
        let missing = state.get_raw(b"missing_key");
        assert_eq!(missing, None);
    }

    #[test]
    fn test_in_memory_state_overwrite() {
        let mut state = State::in_memory();

        state
            .put_raw(b"key".to_vec(), b"value1".to_vec())
            .expect("put should succeed");
        assert_eq!(state.get_raw(b"key"), Some(b"value1".to_vec()));

        state
            .put_raw(b"key".to_vec(), b"value2".to_vec())
            .expect("put should succeed");
        assert_eq!(state.get_raw(b"key"), Some(b"value2".to_vec()));
    }

    #[test]
    fn test_execute_block_with_easy_difficulty() {
        let mut state = State::in_memory();
        let block = Block {
            header: crate::core::block::BlockHeader {
                height: 0,
                prev_hash: [0; 32],
                state_root: [0; 32],
                timestamp: 0,
                difficulty_target: u128::MAX, // Easy difficulty - always passes
                nonce: 0,
            },
            body: vec![],
        };

        // Should succeed with easy difficulty
        assert!(state.execute_block(&block).is_ok());
    }
}
