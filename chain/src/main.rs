//! Demiurge chain node entry point.
//!
//! This is the main binary for the Demiurge L1 blockchain node.
//! Phase 2 features:
//! - JSON-RPC server (Axum) on http://127.0.0.1:8545
//! - RocksDB persistence
//! - Forge PoW verification
//!
//! Future phases will add:
//! - P2P networking
//! - Block production (mining)
//! - Runtime module execution

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use tokio::net::TcpListener;

mod config;
mod core;
mod forge;
mod node;
mod rpc;
mod runtime;

use crate::node::Node;
use crate::rpc::rpc_router;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing for structured logging
    tracing_subscriber::fmt().with_env_filter("info").init();

    // Determine DB path (create if needed)
    let db_path = PathBuf::from(".demiurge/data");
    std::fs::create_dir_all(&db_path)?;

    // Create node with RocksDB-backed state
    let node = Arc::new(Node::new(db_path)?);

    tracing::info!("Demiurge chain node starting (Phase 2: persistence + RPC)");

    // Start JSON-RPC server
    let addr: std::net::SocketAddr = "127.0.0.1:8545".parse().unwrap();
    let listener = TcpListener::bind(addr).await?;
    let app = rpc_router(node);

    tracing::info!("JSON-RPC server listening on http://{}", addr);
    tracing::info!(
        "Available methods: cgt_getChainInfo, cgt_getBlockByHeight, cgt_sendRawTransaction"
    );

    // Serve requests
    axum::serve(listener, app).await?;

    Ok(())
}
