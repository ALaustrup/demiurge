//! Runtime module registry and dispatch system.
//!
//! This module provides the infrastructure for routing transactions to
//! runtime modules. In Phase 3, concrete modules (bank_cgt, nft_dgen, etc.)
//! are registered here and handle transaction execution.

use crate::core::state::State;
use crate::core::transaction::Transaction;

pub mod abyss_registry;
pub mod avatars_profiles;
pub mod bank_cgt;
pub mod fabric_manager;
pub mod nft_dgen;

pub use abyss_registry::{get_listing, AbyssRegistryModule, ListingId};
pub use avatars_profiles::{
    add_gnosis_xp, add_syzygy_score, create_aeon_profile, get_aeon_profile, is_archon,
    recompute_ascension, update_badges, AvatarsProfilesModule, AeonProfile,
};
pub use bank_cgt::{get_balance_cgt, BankCgtModule};
pub use fabric_manager::{get_fabric_asset, FabricManagerModule, FabricRootHash};
pub use nft_dgen::{get_nft, get_nfts_by_owner, NftDgenModule, NftId};

/// Trait that all runtime modules must implement.
///
/// Runtime modules handle specific domains of functionality:
/// - `bank_cgt`: CGT token balances and transfers
/// - `nft_dgen`: D-GEN NFT minting and transfers
/// - `avatars_profiles`: Archon role flags and identity profiles
pub trait RuntimeModule: Send + Sync {
    /// Returns the unique identifier for this module (e.g., "bank_cgt").
    fn module_id(&self) -> &'static str;

    /// Dispatches a call to this module.
    ///
    /// # Arguments
    /// - `call_id`: The specific function to call (e.g., "transfer", "mint_dgen")
    /// - `tx`: The full transaction (modules can access tx.from, tx.fee, etc.)
    /// - `state`: Mutable reference to chain state for reading/writing
    ///
    /// # Returns
    /// - `Ok(())` if the call succeeded
    /// - `Err(String)` with an error message if the call failed
    fn dispatch(&self, call_id: &str, tx: &Transaction, state: &mut State) -> Result<(), String>;
}

/// Runtime registry that holds all registered modules.
///
/// The Runtime is created fresh for each block execution in Phase 3.
/// In later phases, this may be stored in Node for reuse.
pub struct Runtime {
    /// List of registered runtime modules.
    modules: Vec<Box<dyn RuntimeModule>>,
}

impl Runtime {
    /// Create a new empty runtime registry.
    pub fn new() -> Self {
        Self {
            modules: Vec::new(),
        }
    }

    /// Add a module to the runtime registry.
    pub fn with_module(mut self, module: Box<dyn RuntimeModule>) -> Self {
        self.modules.push(module);
        self
    }

    /// Create a runtime with all default modules registered.
    pub fn with_default_modules() -> Self {
        Self::new()
            .with_module(Box::new(BankCgtModule::new()))
            .with_module(Box::new(AvatarsProfilesModule::new()))
            .with_module(Box::new(NftDgenModule::new()))
            .with_module(Box::new(FabricManagerModule::new()))
            .with_module(Box::new(AbyssRegistryModule::new()))
    }

    /// Dispatch a transaction to the appropriate runtime module.
    ///
    /// Looks up the module by `module_id` and calls its `dispatch` method
    /// with the transaction's `call_id` and the full transaction.
    ///
    /// # Returns
    /// - `Ok(())` if the transaction was successfully dispatched and executed
    /// - `Err(String)` if the module was not found or execution failed
    pub fn dispatch_tx(&mut self, tx: &Transaction, state: &mut State) -> Result<(), String> {
        let module = self
            .modules
            .iter()
            .find(|m| m.module_id() == tx.module_id)
            .ok_or_else(|| format!("Unknown module: {}", tx.module_id))?;

        module.dispatch(&tx.call_id, tx, state)
    }
}

impl Default for Runtime {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::state::State;
    use crate::core::transaction::{Address, Transaction};

    #[test]
    fn test_runtime_with_default_modules() {
        let runtime = Runtime::with_default_modules();
        assert_eq!(runtime.modules.len(), 5);
    }

    #[test]
    fn test_dispatch_unknown_module() {
        let mut runtime = Runtime::with_default_modules();
        let mut state = State::in_memory();
        let tx = Transaction {
            from: [0; 32],
            nonce: 0,
            module_id: "unknown_module".to_string(),
            call_id: "test".to_string(),
            payload: vec![],
            fee: 0,
            signature: vec![],
        };

        let result = runtime.dispatch_tx(&tx, &mut state);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown module"));
    }
}
