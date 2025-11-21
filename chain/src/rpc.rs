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

use crate::core::transaction::Address;
use crate::node::Node;
use crate::runtime::{FabricRootHash, ListingId, NftId};

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
/// An Axum Router configured with the RPC endpoint
pub fn rpc_router(node: Arc<Node>) -> Router {
    Router::new()
        .route("/rpc", post(handle_rpc))
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
