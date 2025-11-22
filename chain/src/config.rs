//! Configuration constants for the Demiurge chain.
//!
//! This module contains genesis addresses, dev-only settings, and other
//! configuration constants used throughout the chain.

/// Genesis Archon address (64 hex characters = 32 bytes).
///
/// This address is pre-funded and marked as an Archon during genesis initialization.
pub const GENESIS_ARCHON_ADDRESS_HEX: &str =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/// Genesis Archon address as bytes (all 0xaa).
pub const GENESIS_ARCHON_ADDRESS: [u8; 32] = [0xaa; 32];

/// Genesis initialization key in state.
const KEY_GENESIS_INITIALIZED: &[u8] = b"demiurge/genesis_initialized";

/// Initial CGT balance for Genesis Archon (1 million CGT).
pub const GENESIS_ARCHON_INITIAL_BALANCE: u64 = 1_000_000;

/// Dev faucet amount (10,000 CGT per request).
#[cfg(debug_assertions)]
pub const DEV_FAUCET_AMOUNT: u64 = 10_000;

