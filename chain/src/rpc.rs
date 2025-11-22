//! JSON-RPC server implementation using Axum.
//!
//! This module provides HTTP/JSON-RPC endpoints for interacting with the
//! Demiurge chain node. Supported methods:
//! - cgt_getChainInfo: Get current chain status
//! - cgt_getBlockByHeight: Get a block by height (stubbed for now)
//! - cgt_sendRawTransaction: Submit a transaction to the mempool
//! - cgt_getBalance: Get CGT balance by address
//! - cgt_isArchon: Check Archon status by address
//! - cgt_getNftsByOwner: Get NFTs owned by an address
//! - cgt_getListing: Get marketplace listing by ID
//! - cgt_getFabricAsset: Get Fabric asset by root hash

use std::sync::Arc;

use axum::{extract::Extension, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tower_http::cors::{Any, CorsLayer};

use crate::config::DEV_FAUCET_AMOUNT;
use crate::core::transaction::{Address, Transaction};
use crate::node::Node;
use crate::runtime::{
    add_gnosis_xp, add_syzygy_score, create_aeon_profile, get_aeon_profile, recompute_ascension,
    update_badges, BankCgtModule, FabricRootHash, ListingId, NftDgenModule, NftId, RuntimeModule,
};

/// JSON-RPC request envelope.
#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest<T> {
    /// JSON-RPC version (should be "2.0").
    pub jsonrpc: String,
    /// Method name (e.g., "cgt_getChainInfo").
    pub method: String,
    /// Method parameters (can be null or an object).
    pub params: Option<T>,
    /// Request ID for matching responses.
    pub id: Option<Value>,
}

/// JSON-RPC response envelope.
#[derive(Debug, Serialize)]
pub struct JsonRpcResponse<R> {
    /// JSON-RPC version (should be "2.0").
    pub jsonrpc: String,
    /// Result value (null if error occurred).
    pub result: Option<R>,
    /// Error object (null if successful).
    pub error: Option<JsonRpcError>,
    /// Request ID matching the request.
    pub id: Option<Value>,
}

/// JSON-RPC error object.
#[derive(Debug, Serialize)]
pub struct JsonRpcError {
    /// Error code (standard JSON-RPC codes or custom).
    pub code: i32,
    /// Human-readable error message.
    pub message: String,
}

/// Request parameter structs for new methods

#[derive(Debug, Deserialize)]
pub struct GetBalanceParams {
    pub address: String, // hex string
}

#[derive(Debug, Deserialize)]
pub struct IsArchonParams {
    pub address: String,
}

#[derive(Debug, Deserialize)]
pub struct GetNftsByOwnerParams {
    pub address: String,
}

#[derive(Debug, Deserialize)]
pub struct GetListingParams {
    pub listing_id: u64,
}

#[derive(Debug, Deserialize)]
pub struct GetFabricAssetParams {
    pub fabric_root_hash: String, // hex string
}

#[derive(Debug, Deserialize)]
pub struct DevFaucetParams {
    pub address: String, // hex string
}

#[derive(Debug, Deserialize)]
pub struct MintDgenNftParams {
    pub owner: String, // hex string
    pub forge_model_id: Option<String>, // hex string (optional)
    pub forge_prompt_hash: Option<String>, // hex string (optional)
    pub fabric_root_hash: String, // hex string
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AeonCreateParams {
    pub address: String, // hex string
    pub display_name: String,
    pub bio: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AeonGetParams {
    pub address: String, // hex string
}

#[derive(Debug, Deserialize)]
pub struct AeonRecordSyzygyParams {
    pub from: String, // hex string - seeding Aeon
    pub to: String,   // hex string - original content Aeon
    pub weight: u64,  // volume/importance
}

#[derive(Debug, Deserialize)]
pub struct AeonGetAscensionParams {
    pub address: String, // hex string
}

/// Helper functions for parsing hex addresses and hashes

fn parse_address_hex(s: &str) -> Result<Address, String> {
    let bytes = hex::decode(s).map_err(|e| format!("invalid address hex: {}", e))?;
    if bytes.len() != 32 {
        return Err("address must be 32 bytes".into());
    }
    let mut addr = [0u8; 32];
    addr.copy_from_slice(&bytes);
    Ok(addr)
}

fn parse_root_hash_hex(s: &str) -> Result<FabricRootHash, String> {
    let bytes = hex::decode(s).map_err(|e| format!("invalid fabric_root_hash hex: {}", e))?;
    if bytes.len() != 32 {
        return Err("fabric_root_hash must be 32 bytes".into());
    }
    let mut root = [0u8; 32];
    root.copy_from_slice(&bytes);
    Ok(root)
}

/// Create the JSON-RPC router.
///
/// # Arguments
/// - `node`: Shared reference to the Node instance
///
/// # Returns
/// An Axum Router configured with the RPC endpoint and CORS support
pub fn rpc_router(node: Arc<Node>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/rpc", post(handle_rpc))
        .layer(cors)
        .layer(Extension(node))
}

/// Handle JSON-RPC requests.
///
/// This function dispatches requests to the appropriate handler based on
/// the method name. Unsupported methods return a "Method not found" error.
async fn handle_rpc(
    Extension(node): Extension<Arc<Node>>,
    Json(req): Json<JsonRpcRequest<Value>>,
) -> Json<JsonRpcResponse<Value>> {
    let id = req.id.clone();

    match req.method.as_str() {
        "cgt_getChainInfo" => {
            let info = node.chain_info();
            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!({ "height": info.height })),
                error: None,
                id,
            })
        }
        "cgt_getBalance" => {
            let params: GetBalanceParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(GetBalanceParams {
                        address: String::new(),
                    }),
                None => GetBalanceParams {
                    address: String::new(),
                },
            };

            match parse_address_hex(&params.address) {
                Ok(addr) => {
                    let balance = node.get_balance_cgt(&addr);
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: Some(json!({ "balance": balance })),
                        error: None,
                        id,
                    })
                }
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: msg,
                    }),
                    id,
                }),
            }
        }
        "cgt_isArchon" => {
            let params: IsArchonParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(IsArchonParams {
                        address: String::new(),
                    }),
                None => IsArchonParams {
                    address: String::new(),
                },
            };

            match parse_address_hex(&params.address) {
                Ok(addr) => {
                    let flag = node.is_archon(&addr);
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: Some(json!({ "is_archon": flag })),
                        error: None,
                        id,
                    })
                }
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: msg,
                    }),
                    id,
                }),
            }
        }
        "cgt_getNftsByOwner" => {
            let params: GetNftsByOwnerParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(GetNftsByOwnerParams {
                        address: String::new(),
                    }),
                None => GetNftsByOwnerParams {
                    address: String::new(),
                },
            };

            match parse_address_hex(&params.address) {
                Ok(owner) => {
                    let ids: Vec<NftId> = node.get_nfts_by_owner(&owner);
                    // Fetch metadata for each
                    let nfts: Vec<Value> = ids
                        .into_iter()
                        .map(|id| {
                            if let Some(meta) = node.get_nft(id) {
                                json!({
                                    "id": id,
                                    "owner": hex::encode(meta.owner),
                                    "creator": hex::encode(meta.creator),
                                    "fabric_root_hash": hex::encode(meta.fabric_root_hash),
                                    "royalty_bps": meta.royalty_bps,
                                })
                            } else {
                                json!({ "id": id, "missing": true })
                            }
                        })
                        .collect();

                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: Some(json!({ "nfts": nfts })),
                        error: None,
                        id,
                    })
                }
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: msg,
                    }),
                    id,
                }),
            }
        }
        "cgt_getListing" => {
            let params: GetListingParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(GetListingParams { listing_id: 0 }),
                None => GetListingParams { listing_id: 0 },
            };

            let listing_opt = node.get_listing(params.listing_id as ListingId);
            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!(listing_opt)),
                error: None,
                id,
            })
        }
        "cgt_getFabricAsset" => {
            let params: GetFabricAssetParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(GetFabricAssetParams {
                        fabric_root_hash: String::new(),
                    }),
                None => GetFabricAssetParams {
                    fabric_root_hash: String::new(),
                },
            };

            match parse_root_hash_hex(&params.fabric_root_hash) {
                Ok(root) => {
                    let asset_opt = node.get_fabric_asset(&root);
                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: Some(json!(asset_opt)),
                        error: None,
                        id,
                    })
                }
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32602,
                        message: msg,
                    }),
                    id,
                }),
            }
        }
        "cgt_getBlockByHeight" => {
            let height = req
                .params
                .as_ref()
                .and_then(|p| p.get("height"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let block = node.get_block_by_height(height);

            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(serde_json::to_value(block).unwrap_or(Value::Null)),
                error: None,
                id,
            })
        }
        "cgt_devFaucet" => {
            #[cfg(not(debug_assertions))]
            {
                return Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32601,
                        message: "Dev faucet not available in release mode".to_string(),
                    }),
                    id,
                });
            }

            #[cfg(debug_assertions)]
            {
                let params: DevFaucetParams = match req.params.as_ref() {
                    Some(raw) => serde_json::from_value(raw.clone())
                        .map_err(|e| e.to_string())
                        .unwrap_or(DevFaucetParams {
                            address: String::new(),
                        }),
                    None => DevFaucetParams {
                        address: String::new(),
                    },
                };

                match parse_address_hex(&params.address) {
                    Ok(addr) => {
                        // Mint CGT directly via state mutation
                        let result: Result<u64, String> = node.with_state_mut(|state| {
                            let bank_module = BankCgtModule::new();
                            let mint_params = crate::runtime::bank_cgt::MintToParams {
                                to: addr,
                                amount: DEV_FAUCET_AMOUNT,
                            };
                            let mint_tx = Transaction {
                                from: [0u8; 32], // Genesis authority
                                nonce: 0,
                                module_id: "bank_cgt".to_string(),
                                call_id: "mint_to".to_string(),
                                payload: bincode::serialize(&mint_params)
                                    .map_err(|e| format!("serialization error: {}", e))?,
                                fee: 0,
                                signature: vec![],
                            };
                            bank_module
                                .dispatch("mint_to", &mint_tx, state)
                                .map_err(|e| format!("mint failed: {}", e))?;

                            // Get new balance
                            let balance = crate::runtime::bank_cgt::get_balance_cgt(state, &addr);
                            Ok(balance)
                        });

                        match result {
                            Ok(new_balance) => Json(JsonRpcResponse {
                                jsonrpc: "2.0".to_string(),
                                result: Some(json!({
                                    "ok": true,
                                    "new_balance": new_balance
                                })),
                                error: None,
                                id,
                            }),
                            Err(msg) => Json(JsonRpcResponse {
                                jsonrpc: "2.0".to_string(),
                                result: None,
                                error: Some(JsonRpcError {
                                    code: -32603,
                                    message: format!("Faucet error: {}", msg),
                                }),
                                id,
                            }),
                        }
                    }
                    Err(msg) => Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: msg,
                        }),
                        id,
                    }),
                }
            }
        }
        "cgt_mintDgenNft" => {
            let params: MintDgenNftParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(MintDgenNftParams {
                        owner: String::new(),
                        forge_model_id: None,
                        forge_prompt_hash: None,
                        fabric_root_hash: String::new(),
                        name: String::new(),
                        description: None,
                    }),
                None => MintDgenNftParams {
                    owner: String::new(),
                    forge_model_id: None,
                    forge_prompt_hash: None,
                    fabric_root_hash: String::new(),
                    name: String::new(),
                    description: None,
                },
            };

            let owner_addr = match parse_address_hex(&params.owner) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid owner address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let fabric_hash = match parse_address_hex(&params.fabric_root_hash) {
                Ok(hash) => hash,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid fabric_root_hash: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let forge_model_id = match params
                .forge_model_id
                .as_ref()
                .map(|s| parse_address_hex(s))
                .transpose()
            {
                Ok(Some(hash)) => Some(hash),
                Ok(None) => None,
                Err(e) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid forge_model_id: {}", e),
                        }),
                        id,
                    });
                }
            };

            let forge_prompt_hash = match params
                .forge_prompt_hash
                .as_ref()
                .map(|s| parse_address_hex(s))
                .transpose()
            {
                Ok(Some(hash)) => Some(hash),
                Ok(None) => None,
                Err(e) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid forge_prompt_hash: {}", e),
                        }),
                        id,
                    });
                }
            };

            // For dev mode, we'll use Genesis Archon as the signer if owner is Genesis Archon
            // Otherwise, we'll bypass signature checks and mint directly
            let result = node.with_state_mut(|state| {
                // Check if owner is Archon (required for minting)
                if !crate::runtime::avatars_profiles::is_archon(state, &owner_addr) {
                    return Err("only Archons may mint D-GEN NFTs".to_string());
                }

                let nft_module = NftDgenModule::new();
                let mint_params = crate::runtime::nft_dgen::MintDgenParams {
                    fabric_root_hash: fabric_hash,
                    forge_model_id,
                    forge_prompt_hash,
                    royalty_recipient: None,
                    royalty_bps: 0,
                };

                let mint_tx = Transaction {
                    from: owner_addr,
                    nonce: 0, // For dev, we skip nonce checks
                    module_id: "nft_dgen".to_string(),
                    call_id: "mint_dgen".to_string(),
                    payload: bincode::serialize(&mint_params)
                        .map_err(|e| format!("serialization error: {}", e))?,
                    fee: 0,
                    signature: vec![],
                };

                nft_module
                    .dispatch("mint_dgen", &mint_tx, state)
                    .map_err(|e| format!("mint failed: {}", e))?;

                // Get the newly minted NFT ID (it will be the current counter - 1)
                let nft_ids = crate::runtime::nft_dgen::get_nfts_by_owner(state, &owner_addr);
                let nft_id = nft_ids.last().copied().ok_or("NFT not found after minting")?;
                let nft_meta = crate::runtime::nft_dgen::get_nft(state, nft_id)
                    .ok_or("NFT metadata not found")?;

                Ok((nft_id, nft_meta))
            });

            match result {
                Ok((nft_id, nft_meta)) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: Some(json!({
                        "nft_id": nft_id,
                        "owner": hex::encode(nft_meta.owner),
                        "fabric_root_hash": hex::encode(nft_meta.fabric_root_hash),
                        "forge_model_id": nft_meta.forge_model_id.map(hex::encode),
                        "forge_prompt_hash": nft_meta.forge_prompt_hash.map(hex::encode),
                    })),
                    error: None,
                    id,
                }),
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32603,
                        message: format!("Mint error: {}", msg),
                    }),
                    id,
                }),
            }
        }
        "aeon_create" => {
            let params: AeonCreateParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(AeonCreateParams {
                        address: String::new(),
                        display_name: String::new(),
                        bio: None,
                    }),
                None => AeonCreateParams {
                    address: String::new(),
                    display_name: String::new(),
                    bio: None,
                },
            };

            let address = match parse_address_hex(&params.address) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let current_height = node.chain_info().height;

            let result = node.with_state_mut(|state| {
                create_aeon_profile(state, address, params.display_name, params.bio, current_height)
            });

            match result {
                Ok(profile) => {
                    // In dev mode, optionally mint starter CGT
                    #[cfg(debug_assertions)]
                    {
                        let _ = node.with_state_mut(|state| {
                            let bank_module = BankCgtModule::new();
                            let mint_params = crate::runtime::bank_cgt::MintToParams {
                                to: address,
                                amount: 1_000, // Small starter allowance
                            };
                            let mint_tx = Transaction {
                                from: [0u8; 32],
                                nonce: 0,
                                module_id: "bank_cgt".to_string(),
                                call_id: "mint_to".to_string(),
                                payload: bincode::serialize(&mint_params)
                                    .map_err(|e| format!("serialization error: {}", e))?,
                                fee: 0,
                                signature: vec![],
                            };
                            bank_module.dispatch("mint_to", &mint_tx, state)
                        });
                    }

                    Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: Some(json!({
                            "address": hex::encode(profile.address),
                            "display_name": profile.display_name,
                            "bio": profile.bio,
                            "gnosis_xp": profile.gnosis_xp,
                            "syzygy_score": profile.syzygy_score,
                            "ascension_level": profile.ascension_level,
                            "badges": profile.badges,
                            "created_at_height": profile.created_at_height,
                        })),
                        error: None,
                        id,
                    })
                }
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32603,
                        message: format!("Failed to create Aeon profile: {}", msg),
                    }),
                    id,
                }),
            }
        }
        "aeon_get" => {
            let params: AeonGetParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(AeonGetParams {
                        address: String::new(),
                    }),
                None => AeonGetParams {
                    address: String::new(),
                },
            };

            let address = match parse_address_hex(&params.address) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let profile_opt = node.with_state(|state| get_aeon_profile(state, &address));

            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(match profile_opt {
                    Some(profile) => json!({
                        "address": hex::encode(profile.address),
                        "display_name": profile.display_name,
                        "bio": profile.bio,
                        "gnosis_xp": profile.gnosis_xp,
                        "syzygy_score": profile.syzygy_score,
                        "ascension_level": profile.ascension_level,
                        "badges": profile.badges,
                        "created_at_height": profile.created_at_height,
                    }),
                    None => serde_json::Value::Null,
                }),
                error: None,
                id,
            })
        }
        "aeon_recordSyzygy" => {
            let params: AeonRecordSyzygyParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(AeonRecordSyzygyParams {
                        from: String::new(),
                        to: String::new(),
                        weight: 0,
                    }),
                None => AeonRecordSyzygyParams {
                    from: String::new(),
                    to: String::new(),
                    weight: 0,
                },
            };

            let from_addr = match parse_address_hex(&params.from) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid 'from' address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let _to_addr = match parse_address_hex(&params.to) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid 'to' address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let result: Result<serde_json::Value, String> = node.with_state_mut(|state| {
                // Add Syzygy Score to seeding Aeon
                add_syzygy_score(state, &from_addr, params.weight)?;

                // Add Gnosis XP (weight / 2) to seeding Aeon
                let xp_gain = params.weight / 2;
                if xp_gain > 0 {
                    add_gnosis_xp(state, &from_addr, xp_gain)?;
                }

                // Recompute ascension and update badges
                recompute_ascension(state, &from_addr)?;
                update_badges(state, &from_addr)?;

                // Get updated profile
                let profile = get_aeon_profile(state, &from_addr)
                    .ok_or("Profile not found after update")?;

                Ok(json!({
                    "address": hex::encode(profile.address),
                    "gnosis_xp": profile.gnosis_xp,
                    "syzygy_score": profile.syzygy_score,
                    "ascension_level": profile.ascension_level,
                    "badges": profile.badges,
                }))
            });

            match result {
                Ok(stats) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: Some(stats),
                    error: None,
                    id,
                }),
                Err(msg) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32603,
                        message: format!("Failed to record Syzygy: {}", msg),
                    }),
                    id,
                }),
            }
        }
        "aeon_getAscension" => {
            let params: AeonGetAscensionParams = match req.params.as_ref() {
                Some(raw) => serde_json::from_value(raw.clone())
                    .map_err(|e| e.to_string())
                    .unwrap_or(AeonGetAscensionParams {
                        address: String::new(),
                    }),
                None => AeonGetAscensionParams {
                    address: String::new(),
                },
            };

            let address = match parse_address_hex(&params.address) {
                Ok(addr) => addr,
                Err(msg) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602,
                            message: format!("invalid address: {}", msg),
                        }),
                        id,
                    });
                }
            };

            let profile_opt = node.with_state(|state| get_aeon_profile(state, &address));

            match profile_opt {
                Some(profile) => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: Some(json!({
                        "gnosis_xp": profile.gnosis_xp,
                        "syzygy_score": profile.syzygy_score,
                        "ascension_level": profile.ascension_level,
                        "badges": profile.badges,
                    })),
                    error: None,
                    id,
                }),
                None => Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: Some(serde_json::Value::Null),
                    error: None,
                    id,
                }),
            }
        }
        "cgt_sendRawTransaction" => {
            let tx_hex = req
                .params
                .as_ref()
                .and_then(|p| p.get("tx"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let bytes = match hex::decode(tx_hex) {
                Ok(b) => b,
                Err(e) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602, // Invalid params
                            message: format!("invalid tx hex: {}", e),
                        }),
                        id,
                    })
                }
            };

            let tx = match crate::core::transaction::Transaction::from_bytes(&bytes) {
                Ok(tx) => tx,
                Err(e) => {
                    return Json(JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        result: None,
                        error: Some(JsonRpcError {
                            code: -32602, // Invalid params
                            message: format!("invalid tx encoding: {}", e),
                        }),
                        id,
                    })
                }
            };

            node.submit_transaction(tx);

            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!({ "accepted": true })),
                error: None,
                id,
            })
        }
        _ => Json(JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            result: None,
            error: Some(JsonRpcError {
                code: -32601, // Method not found
                message: "Method not found".to_string(),
            }),
            id,
        }),
    }
}
