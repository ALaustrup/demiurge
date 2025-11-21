//! Bank module for CGT (Creator God Token) balances and transfers.
//!
//! This module handles:
//! - CGT balance tracking per address
//! - Transfers between addresses
//! - Minting (restricted to genesis authority for now)

use serde::{Deserialize, Serialize};

use super::RuntimeModule;
use crate::core::state::State;
use crate::core::transaction::{Address, Transaction};

const PREFIX_BALANCE: &[u8] = b"bank:balance:";
const PREFIX_NONCE: &[u8] = b"bank:nonce:";

/// Helper functions for balance management

fn balance_key(address: &Address) -> Vec<u8> {
    let mut key = Vec::with_capacity(PREFIX_BALANCE.len() + address.len());
    key.extend_from_slice(PREFIX_BALANCE);
    key.extend_from_slice(address);
    key
}

fn nonce_key(address: &Address) -> Vec<u8> {
    let mut key = Vec::with_capacity(PREFIX_NONCE.len() + address.len());
    key.extend_from_slice(PREFIX_NONCE);
    key.extend_from_slice(address);
    key
}

fn get_balance(state: &State, addr: &Address) -> u64 {
    state
        .get_raw(&balance_key(addr))
        .and_then(|bytes| bincode::deserialize::<u64>(&bytes).ok())
        .unwrap_or(0)
}

fn set_balance(state: &mut State, addr: &Address, amount: u64) -> Result<(), String> {
    let bytes = bincode::serialize(&amount).map_err(|e| e.to_string())?;
    state
        .put_raw(balance_key(addr), bytes)
        .map_err(|e| e.to_string())
}

fn get_nonce(state: &State, addr: &Address) -> u64 {
    state
        .get_raw(&nonce_key(addr))
        .and_then(|bytes| bincode::deserialize::<u64>(&bytes).ok())
        .unwrap_or(0)
}

fn set_nonce(state: &mut State, addr: &Address, nonce: u64) -> Result<(), String> {
    let bytes = bincode::serialize(&nonce).map_err(|e| e.to_string())?;
    state
        .put_raw(nonce_key(addr), bytes)
        .map_err(|e| e.to_string())
}

/// Public helper for querying CGT balance (for RPC/wallet use).
pub fn get_balance_cgt(state: &State, addr: &Address) -> u64 {
    get_balance(state, addr)
}

/// Transfer parameters
#[derive(Debug, Serialize, Deserialize)]
pub struct TransferParams {
    pub to: Address,
    pub amount: u64,
}

/// Mint parameters
#[derive(Debug, Serialize, Deserialize)]
pub struct MintToParams {
    pub to: Address,
    pub amount: u64,
}

/// BankCgtModule handles CGT token operations
pub struct BankCgtModule;

impl BankCgtModule {
    pub fn new() -> Self {
        Self
    }
}

impl RuntimeModule for BankCgtModule {
    fn module_id(&self) -> &'static str {
        "bank_cgt"
    }

    fn dispatch(&self, call_id: &str, tx: &Transaction, state: &mut State) -> Result<(), String> {
        match call_id {
            "transfer" => handle_transfer(tx, state),
            "mint_to" => handle_mint_to(tx, state),
            other => Err(format!("bank_cgt: unknown call_id '{}'", other)),
        }
    }
}

fn handle_transfer(tx: &Transaction, state: &mut State) -> Result<(), String> {
    let params: TransferParams = bincode::deserialize(&tx.payload).map_err(|e| e.to_string())?;

    // Simple nonce check
    let current_nonce = get_nonce(state, &tx.from);
    if tx.nonce != current_nonce {
        return Err(format!(
            "invalid nonce: expected {}, got {}",
            current_nonce, tx.nonce
        ));
    }

    let mut from_balance = get_balance(state, &tx.from);
    let mut to_balance = get_balance(state, &params.to);

    let total = params.amount.checked_add(tx.fee).ok_or("overflow")?;

    if from_balance < total {
        return Err("insufficient balance for amount + fee".into());
    }

    from_balance -= total;
    to_balance = to_balance
        .checked_add(params.amount)
        .ok_or("overflow on recipient")?;

    set_balance(state, &tx.from, from_balance)?;
    set_balance(state, &params.to, to_balance)?;

    // Increment nonce
    set_nonce(state, &tx.from, current_nonce + 1)?;

    // TODO: handle fee routing (burn or pool); for now, fee is effectively burned.

    Ok(())
}

fn handle_mint_to(tx: &Transaction, state: &mut State) -> Result<(), String> {
    // For Phase 3, keep this extremely simple:
    // Allow minting only if tx.from is all zeros (a pseudo "genesis" authority).
    if tx.from != [0u8; 32] {
        return Err("mint_to can only be called by genesis authority (all-zero address)".into());
    }

    let params: MintToParams = bincode::deserialize(&tx.payload).map_err(|e| e.to_string())?;

    let current = get_balance(state, &params.to);
    let new_balance = current
        .checked_add(params.amount)
        .ok_or("overflow on mint_to")?;

    set_balance(state, &params.to, new_balance)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::state::State;
    use crate::core::transaction::{Address, Transaction};

    #[test]
    fn test_get_balance_default_zero() {
        let state = State::in_memory();
        let addr = [1u8; 32];
        assert_eq!(get_balance_cgt(&state, &addr), 0);
    }

    #[test]
    fn test_mint_to_and_get_balance() {
        let mut state = State::in_memory();
        let addr = [1u8; 32];
        let genesis = [0u8; 32];

        // Mint via genesis authority
        let params = MintToParams {
            to: addr,
            amount: 1000,
        };
        let tx = Transaction {
            from: genesis,
            nonce: 0,
            module_id: "bank_cgt".to_string(),
            call_id: "mint_to".to_string(),
            payload: bincode::serialize(&params).unwrap(),
            fee: 0,
            signature: vec![],
        };

        let module = BankCgtModule::new();
        module.dispatch("mint_to", &tx, &mut state).unwrap();

        assert_eq!(get_balance_cgt(&state, &addr), 1000);
    }

    #[test]
    fn test_transfer() {
        let mut state = State::in_memory();
        let from = [1u8; 32];
        let to = [2u8; 32];
        let genesis = [0u8; 32];

        // First mint to 'from'
        let mint_params = MintToParams {
            to: from,
            amount: 1000,
        };
        let mint_tx = Transaction {
            from: genesis,
            nonce: 0,
            module_id: "bank_cgt".to_string(),
            call_id: "mint_to".to_string(),
            payload: bincode::serialize(&mint_params).unwrap(),
            fee: 0,
            signature: vec![],
        };

        let module = BankCgtModule::new();
        module.dispatch("mint_to", &mint_tx, &mut state).unwrap();

        // Now transfer
        let transfer_params = TransferParams { to, amount: 300 };
        let transfer_tx = Transaction {
            from,
            nonce: 0,
            module_id: "bank_cgt".to_string(),
            call_id: "transfer".to_string(),
            payload: bincode::serialize(&transfer_params).unwrap(),
            fee: 10,
            signature: vec![],
        };

        module
            .dispatch("transfer", &transfer_tx, &mut state)
            .unwrap();

        assert_eq!(get_balance_cgt(&state, &from), 690); // 1000 - 300 - 10
        assert_eq!(get_balance_cgt(&state, &to), 300);
    }
}
