//! D-GEN NFT module for minting and managing D-721 NFTs.
//!
//! This module handles:
//! - D-GEN NFT minting (Archons only)
//! - NFT transfers
//! - NFT metadata storage (fabric_root_hash, royalties, etc.)
//! - Owner tracking

use serde::{Deserialize, Serialize};

use super::RuntimeModule;
use crate::core::state::State;
use crate::core::transaction::{Address, Transaction};
use crate::runtime::avatars_profiles::is_archon;

const PREFIX_NFT: &[u8] = b"nft:token:";
const KEY_NFT_COUNTER: &[u8] = b"nft:counter";
const PREFIX_OWNER_NFTS: &[u8] = b"nft:owner:";

/// NFT ID type
pub type NftId = u64;

/// D-GEN NFT metadata
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DGenMetadata {
    pub creator: Address,
    pub owner: Address,
    pub fabric_root_hash: [u8; 32],
    pub forge_model_id: Option<[u8; 32]>,
    pub forge_prompt_hash: Option<[u8; 32]>,
    // Simple royalty: a single address + percentage (0-10000 = basis points).
    pub royalty_recipient: Option<Address>,
    pub royalty_bps: u16,
}

/// Mint D-GEN parameters
#[derive(Debug, Serialize, Deserialize)]
pub struct MintDgenParams {
    pub fabric_root_hash: [u8; 32],
    pub forge_model_id: Option<[u8; 32]>,
    pub forge_prompt_hash: Option<[u8; 32]>,
    pub royalty_recipient: Option<Address>,
    pub royalty_bps: u16,
}

/// Transfer NFT parameters
#[derive(Debug, Serialize, Deserialize)]
pub struct TransferNftParams {
    pub token_id: NftId,
    pub to: Address,
}

/// Helper functions for NFT management

fn nft_key(id: NftId) -> Vec<u8> {
    let mut key = Vec::from(PREFIX_NFT);
    key.extend_from_slice(&id.to_be_bytes());
    key
}

fn owner_nfts_key(owner: &Address) -> Vec<u8> {
    let mut key = Vec::from(PREFIX_OWNER_NFTS);
    key.extend_from_slice(owner);
    key
}

fn load_nft(state: &State, id: NftId) -> Option<DGenMetadata> {
    state
        .get_raw(&nft_key(id))
        .and_then(|bytes| bincode::deserialize::<DGenMetadata>(&bytes).ok())
}

fn store_nft(state: &mut State, id: NftId, meta: &DGenMetadata) -> Result<(), String> {
    let bytes = bincode::serialize(meta).map_err(|e| e.to_string())?;
    state.put_raw(nft_key(id), bytes).map_err(|e| e.to_string())
}

fn get_next_nft_id(state: &State) -> NftId {
    state
        .get_raw(KEY_NFT_COUNTER)
        .and_then(|bytes| bincode::deserialize::<NftId>(&bytes).ok())
        .unwrap_or(0)
}

fn set_next_nft_id(state: &mut State, next: NftId) -> Result<(), String> {
    let bytes = bincode::serialize(&next).map_err(|e| e.to_string())?;
    state
        .put_raw(KEY_NFT_COUNTER.to_vec(), bytes)
        .map_err(|e| e.to_string())
}

fn load_owner_nfts(state: &State, owner: &Address) -> Vec<NftId> {
    state
        .get_raw(&owner_nfts_key(owner))
        .and_then(|bytes| bincode::deserialize::<Vec<NftId>>(&bytes).ok())
        .unwrap_or_default()
}

fn store_owner_nfts(state: &mut State, owner: &Address, ids: &[NftId]) -> Result<(), String> {
    let bytes = bincode::serialize(ids).map_err(|e| e.to_string())?;
    state
        .put_raw(owner_nfts_key(owner), bytes)
        .map_err(|e| e.to_string())
}

/// Public helper for querying NFT metadata (for RPC/SDK use).
pub fn get_nft(state: &State, id: NftId) -> Option<DGenMetadata> {
    load_nft(state, id)
}

/// Public helper for querying NFTs by owner (for RPC/SDK use).
pub fn get_nfts_by_owner(state: &State, owner: &Address) -> Vec<NftId> {
    load_owner_nfts(state, owner)
}

/// NftDgenModule handles D-GEN NFT operations
pub struct NftDgenModule;

impl NftDgenModule {
    pub fn new() -> Self {
        Self
    }
}

impl RuntimeModule for NftDgenModule {
    fn module_id(&self) -> &'static str {
        "nft_dgen"
    }

    fn dispatch(&self, call_id: &str, tx: &Transaction, state: &mut State) -> Result<(), String> {
        match call_id {
            "mint_dgen" => handle_mint_dgen(tx, state),
            "transfer_nft" => handle_transfer_nft(tx, state),
            other => Err(format!("nft_dgen: unknown call_id '{}'", other)),
        }
    }
}

fn handle_mint_dgen(tx: &Transaction, state: &mut State) -> Result<(), String> {
    // Only Archons can mint D-GEN.
    if !is_archon(state, &tx.from) {
        return Err("only Archons may mint D-GEN NFTs".into());
    }

    let params: MintDgenParams = bincode::deserialize(&tx.payload).map_err(|e| e.to_string())?;

    let mut next_id = get_next_nft_id(state);
    let token_id = next_id;
    next_id = next_id.checked_add(1).ok_or("nft id overflow")?;
    set_next_nft_id(state, next_id)?;

    let meta = DGenMetadata {
        creator: tx.from,
        owner: tx.from,
        fabric_root_hash: params.fabric_root_hash,
        forge_model_id: params.forge_model_id,
        forge_prompt_hash: params.forge_prompt_hash,
        royalty_recipient: params.royalty_recipient,
        royalty_bps: params.royalty_bps,
    };

    store_nft(state, token_id, &meta)?;

    // index under owner
    let mut owner_list = load_owner_nfts(state, &tx.from);
    owner_list.push(token_id);
    store_owner_nfts(state, &tx.from, &owner_list)?;

    Ok(())
}

fn handle_transfer_nft(tx: &Transaction, state: &mut State) -> Result<(), String> {
    let params: TransferNftParams = bincode::deserialize(&tx.payload).map_err(|e| e.to_string())?;

    let mut meta = load_nft(state, params.token_id).ok_or_else(|| "NFT not found".to_string())?;

    if meta.owner != tx.from {
        return Err("only the current owner may transfer this NFT".into());
    }

    // Remove from old owner list
    let mut old_owner_list = load_owner_nfts(state, &meta.owner);
    old_owner_list.retain(|id| *id != params.token_id);
    store_owner_nfts(state, &meta.owner, &old_owner_list)?;

    // Add to new owner
    let mut new_owner_list = load_owner_nfts(state, &params.to);
    new_owner_list.push(params.token_id);
    store_owner_nfts(state, &params.to, &new_owner_list)?;

    // Update owner in metadata
    meta.owner = params.to;
    store_nft(state, params.token_id, &meta)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::state::State;
    use crate::core::transaction::{Address, Transaction};
    use crate::runtime::avatars_profiles::AvatarsProfilesModule;

    #[test]
    fn test_mint_dgen_requires_archon() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        let params = MintDgenParams {
            fabric_root_hash: [0u8; 32],
            forge_model_id: None,
            forge_prompt_hash: None,
            royalty_recipient: None,
            royalty_bps: 0,
        };

        let tx = Transaction {
            from: addr,
            nonce: 0,
            module_id: "nft_dgen".to_string(),
            call_id: "mint_dgen".to_string(),
            payload: bincode::serialize(&params).unwrap(),
            fee: 0,
            signature: vec![],
        };

        let module = NftDgenModule::new();
        let result = module.dispatch("mint_dgen", &tx, &mut state);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("only Archons"));
    }

    #[test]
    fn test_mint_dgen_success() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];

        // First claim Archon status
        let claim_tx = Transaction {
            from: addr,
            nonce: 0,
            module_id: "avatars_profiles".to_string(),
            call_id: "claim_archon".to_string(),
            payload: vec![],
            fee: 0,
            signature: vec![],
        };
        let avatars_module = AvatarsProfilesModule::new();
        avatars_module
            .dispatch("claim_archon", &claim_tx, &mut state)
            .unwrap();

        // Now mint NFT
        let fabric_hash = [42u8; 32];
        let params = MintDgenParams {
            fabric_root_hash: fabric_hash,
            forge_model_id: None,
            forge_prompt_hash: None,
            royalty_recipient: None,
            royalty_bps: 0,
        };

        let mint_tx = Transaction {
            from: addr,
            nonce: 0,
            module_id: "nft_dgen".to_string(),
            call_id: "mint_dgen".to_string(),
            payload: bincode::serialize(&params).unwrap(),
            fee: 0,
            signature: vec![],
        };

        let nft_module = NftDgenModule::new();
        nft_module
            .dispatch("mint_dgen", &mint_tx, &mut state)
            .unwrap();

        // Verify NFT exists
        let nft = get_nft(&state, 0).unwrap();
        assert_eq!(nft.creator, addr);
        assert_eq!(nft.owner, addr);
        assert_eq!(nft.fabric_root_hash, fabric_hash);

        // Verify owner index
        let owner_nfts = get_nfts_by_owner(&state, &addr);
        assert_eq!(owner_nfts, vec![0]);
    }

    #[test]
    fn test_transfer_nft() {
        let mut state = State::in_memory();
        let creator = [1u8; 32];
        let new_owner = [2u8; 32];

        // Setup: claim Archon and mint NFT
        let claim_tx = Transaction {
            from: creator,
            nonce: 0,
            module_id: "avatars_profiles".to_string(),
            call_id: "claim_archon".to_string(),
            payload: vec![],
            fee: 0,
            signature: vec![],
        };
        let avatars_module = AvatarsProfilesModule::new();
        avatars_module
            .dispatch("claim_archon", &claim_tx, &mut state)
            .unwrap();

        let params = MintDgenParams {
            fabric_root_hash: [0u8; 32],
            forge_model_id: None,
            forge_prompt_hash: None,
            royalty_recipient: None,
            royalty_bps: 0,
        };
        let mint_tx = Transaction {
            from: creator,
            nonce: 0,
            module_id: "nft_dgen".to_string(),
            call_id: "mint_dgen".to_string(),
            payload: bincode::serialize(&params).unwrap(),
            fee: 0,
            signature: vec![],
        };
        let nft_module = NftDgenModule::new();
        nft_module
            .dispatch("mint_dgen", &mint_tx, &mut state)
            .unwrap();

        // Transfer NFT
        let transfer_params = TransferNftParams {
            token_id: 0,
            to: new_owner,
        };
        let transfer_tx = Transaction {
            from: creator,
            nonce: 0,
            module_id: "nft_dgen".to_string(),
            call_id: "transfer_nft".to_string(),
            payload: bincode::serialize(&transfer_params).unwrap(),
            fee: 0,
            signature: vec![],
        };

        nft_module
            .dispatch("transfer_nft", &transfer_tx, &mut state)
            .unwrap();

        // Verify ownership changed
        let nft = get_nft(&state, 0).unwrap();
        assert_eq!(nft.owner, new_owner);
        assert_eq!(nft.creator, creator); // Creator unchanged

        // Verify owner indices
        assert_eq!(get_nfts_by_owner(&state, &creator), Vec::<NftId>::new());
        assert_eq!(get_nfts_by_owner(&state, &new_owner), vec![0]);
    }
}
