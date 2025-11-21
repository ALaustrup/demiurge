//! Avatars and profiles module for Archon role management.
//!
//! This module handles:
//! - Archon status flags (who has "ascended" to creator status)
//! - Optional profile data storage

use super::RuntimeModule;
use crate::core::state::State;
use crate::core::transaction::{Address, Transaction};

const PREFIX_ARCHON_FLAG: &[u8] = b"avatars:archon:";

/// Helper functions for Archon flag management

fn archon_flag_key(address: &Address) -> Vec<u8> {
    let mut key = Vec::with_capacity(PREFIX_ARCHON_FLAG.len() + address.len());
    key.extend_from_slice(PREFIX_ARCHON_FLAG);
    key.extend_from_slice(address);
    key
}

/// Check if an address has Archon status.
///
/// This is a public helper for use by other modules (e.g., nft_dgen).
pub fn is_archon(state: &State, addr: &Address) -> bool {
    state
        .get_raw(&archon_flag_key(addr))
        .map(|bytes| bytes == [1u8])
        .unwrap_or(false)
}

fn set_archon_flag(state: &mut State, addr: &Address, value: bool) -> Result<(), String> {
    let bytes = if value { vec![1u8] } else { vec![0u8] };
    state
        .put_raw(archon_flag_key(addr), bytes)
        .map_err(|e| e.to_string())
}

/// AvatarsProfilesModule handles Archon role management
pub struct AvatarsProfilesModule;

impl AvatarsProfilesModule {
    pub fn new() -> Self {
        Self
    }
}

impl RuntimeModule for AvatarsProfilesModule {
    fn module_id(&self) -> &'static str {
        "avatars_profiles"
    }

    fn dispatch(&self, call_id: &str, tx: &Transaction, state: &mut State) -> Result<(), String> {
        match call_id {
            "claim_archon" => handle_claim_archon(tx, state),
            other => Err(format!("avatars_profiles: unknown call_id '{}'", other)),
        }
    }
}

fn handle_claim_archon(tx: &Transaction, state: &mut State) -> Result<(), String> {
    // No payload needed for now; simply mark tx.from as an Archon.
    // Later we can add staking or Sigil NFT minting here.
    set_archon_flag(state, &tx.from, true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::state::State;
    use crate::core::transaction::{Address, Transaction};

    #[test]
    fn test_is_archon_default_false() {
        let state = State::in_memory();
        let addr = [1u8; 32];
        assert!(!is_archon(&state, &addr));
    }

    #[test]
    fn test_claim_archon() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        let tx = Transaction {
            from: addr,
            nonce: 0,
            module_id: "avatars_profiles".to_string(),
            call_id: "claim_archon".to_string(),
            payload: vec![],
            fee: 0,
            signature: vec![],
        };

        let module = AvatarsProfilesModule::new();
        module.dispatch("claim_archon", &tx, &mut state).unwrap();

        assert!(is_archon(&state, &addr));
    }
}
