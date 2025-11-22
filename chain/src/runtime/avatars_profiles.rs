//! Aeon Registry module for user profiles and progression.
//!
//! This module handles:
//! - Aeon profiles (display name, bio, progression stats)
//! - Gnosis XP and Syzygy Score tracking
//! - Ascension Level computation
//! - Badge management (e.g., Luminary)
//! - Legacy Archon flag support (for backward compatibility)

use serde::{Deserialize, Serialize};

use super::RuntimeModule;
use crate::core::state::State;
use crate::core::transaction::{Address, Transaction};

const PREFIX_ARCHON_FLAG: &[u8] = b"avatars:archon:";
const PREFIX_AEON_PROFILE: &[u8] = b"aeon/profile:";

// Progression constants
const ASCENSION_STEP: u64 = 1_000;
const LUMINARY_SYZYGY_THRESHOLD: u64 = 10_000;

/// Aeon profile with progression stats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AeonProfile {
    pub address: Address,
    pub display_name: String,
    pub bio: Option<String>,
    // Progression
    pub gnosis_xp: u64,
    pub syzygy_score: u64,
    pub ascension_level: u32,
    // Badges
    pub badges: Vec<String>,
    pub created_at_height: u64,
}

/// Legacy Archon flag management (kept for backward compatibility)

fn archon_flag_key(address: &Address) -> Vec<u8> {
    let mut key = Vec::with_capacity(PREFIX_ARCHON_FLAG.len() + address.len());
    key.extend_from_slice(PREFIX_ARCHON_FLAG);
    key.extend_from_slice(address);
    key
}

/// Check if an address has Archon status.
///
/// This is kept for backward compatibility with nft_dgen module.
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

/// Aeon profile management

fn aeon_profile_key(address: &Address) -> Vec<u8> {
    let mut key = Vec::with_capacity(PREFIX_AEON_PROFILE.len() + address.len());
    key.extend_from_slice(PREFIX_AEON_PROFILE);
    key.extend_from_slice(address);
    key
}

fn load_aeon_profile(state: &State, address: &Address) -> Option<AeonProfile> {
    state
        .get_raw(&aeon_profile_key(address))
        .and_then(|bytes| bincode::deserialize::<AeonProfile>(&bytes).ok())
}

fn store_aeon_profile(state: &mut State, profile: &AeonProfile) -> Result<(), String> {
    let bytes = bincode::serialize(profile).map_err(|e| e.to_string())?;
    state
        .put_raw(aeon_profile_key(&profile.address), bytes)
        .map_err(|e| e.to_string())
}

/// Create a new Aeon profile.
///
/// Returns an error if a profile already exists for this address.
pub fn create_aeon_profile(
    state: &mut State,
    address: Address,
    display_name: String,
    bio: Option<String>,
    current_height: u64,
) -> Result<AeonProfile, String> {
    if load_aeon_profile(state, &address).is_some() {
        return Err("Aeon profile already exists for this address".into());
    }

    let profile = AeonProfile {
        address,
        display_name,
        bio,
        gnosis_xp: 0,
        syzygy_score: 0,
        ascension_level: 1,
        badges: vec![],
        created_at_height: current_height,
    };

    store_aeon_profile(state, &profile)?;
    Ok(profile)
}

/// Get an Aeon profile by address.
pub fn get_aeon_profile(state: &State, address: &Address) -> Option<AeonProfile> {
    load_aeon_profile(state, address)
}

/// Add Gnosis XP to an Aeon.
pub fn add_gnosis_xp(state: &mut State, address: &Address, amount: u64) -> Result<(), String> {
    let mut profile = load_aeon_profile(state, address)
        .ok_or_else(|| "Aeon profile not found".to_string())?;

    profile.gnosis_xp = profile
        .gnosis_xp
        .checked_add(amount)
        .ok_or("Gnosis XP overflow")?;

    store_aeon_profile(state, &profile)?;
    Ok(())
}

/// Add Syzygy Score to an Aeon.
pub fn add_syzygy_score(state: &mut State, address: &Address, amount: u64) -> Result<(), String> {
    let mut profile = load_aeon_profile(state, address)
        .ok_or_else(|| "Aeon profile not found".to_string())?;

    profile.syzygy_score = profile
        .syzygy_score
        .checked_add(amount)
        .ok_or("Syzygy Score overflow")?;

    store_aeon_profile(state, &profile)?;
    Ok(())
}

/// Recompute Ascension Level based on Gnosis XP and Syzygy Score.
pub fn recompute_ascension(state: &mut State, address: &Address) -> Result<(), String> {
    let mut profile = load_aeon_profile(state, address)
        .ok_or_else(|| "Aeon profile not found".to_string())?;

    // total_score = gnosis_xp + (syzygy_score * 2)
    let syzygy_weighted = profile
        .syzygy_score
        .checked_mul(2)
        .ok_or("Syzygy score multiplication overflow")?;
    let total_score = profile
        .gnosis_xp
        .checked_add(syzygy_weighted)
        .ok_or("Total score overflow")?;

    // ascension_level = 1 + (total_score / ASCENSION_STEP)
    profile.ascension_level = 1 + (total_score / ASCENSION_STEP) as u32;

    store_aeon_profile(state, &profile)?;
    Ok(())
}

/// Update badges based on thresholds.
pub fn update_badges(state: &mut State, address: &Address) -> Result<(), String> {
    let mut profile = load_aeon_profile(state, address)
        .ok_or_else(|| "Aeon profile not found".to_string())?;

    // Check for Luminary badge
    let has_luminary = profile.badges.iter().any(|b| b == "Luminary");
    if profile.syzygy_score >= LUMINARY_SYZYGY_THRESHOLD && !has_luminary {
        profile.badges.push("Luminary".to_string());
    }

    store_aeon_profile(state, &profile)?;
    Ok(())
}

/// AvatarsProfilesModule (now Aeon Registry) handles profiles and progression
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
    // Legacy: mark as Archon (for backward compatibility)
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

    #[test]
    fn test_create_aeon_profile() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        let profile = create_aeon_profile(
            &mut state,
            addr,
            "Test Aeon".to_string(),
            Some("Test bio".to_string()),
            0,
        )
        .unwrap();

        assert_eq!(profile.display_name, "Test Aeon");
        assert_eq!(profile.gnosis_xp, 0);
        assert_eq!(profile.syzygy_score, 0);
        assert_eq!(profile.ascension_level, 1);
        assert_eq!(profile.badges, Vec::<String>::new());

        // Should fail on duplicate
        assert!(create_aeon_profile(
            &mut state,
            addr,
            "Another".to_string(),
            None,
            0
        )
        .is_err());
    }

    #[test]
    fn test_progression() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        create_aeon_profile(&mut state, addr, "Test".to_string(), None, 0).unwrap();

        add_gnosis_xp(&mut state, &addr, 500).unwrap();
        add_syzygy_score(&mut state, &addr, 300).unwrap();

        let profile = get_aeon_profile(&state, &addr).unwrap();
        assert_eq!(profile.gnosis_xp, 500);
        assert_eq!(profile.syzygy_score, 300);

        recompute_ascension(&mut state, &addr).unwrap();
        let profile = get_aeon_profile(&state, &addr).unwrap();
        // total_score = 500 + (300 * 2) = 1100
        // ascension_level = 1 + (1100 / 1000) = 2
        assert_eq!(profile.ascension_level, 2);
    }

    #[test]
    fn test_luminary_badge() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        create_aeon_profile(&mut state, addr, "Test".to_string(), None, 0).unwrap();

        add_syzygy_score(&mut state, &addr, LUMINARY_SYZYGY_THRESHOLD).unwrap();
        update_badges(&mut state, &addr).unwrap();

        let profile = get_aeon_profile(&state, &addr).unwrap();
        assert!(profile.badges.contains(&"Luminary".to_string()));
    }
}
