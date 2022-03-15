use crate::account::*;
use crate::error::ErrorCodes;
use anchor_lang::prelude::*;
use solana_program::sysvar;

//Known constants
const ETH_ADDRESS_OFFSET: usize = 12;
const MESSAGE_OFFSET: usize = 97;

pub fn has_verified_signature(
  ix_account: &UncheckedAccount,
  signer_address: &[u8; 20],
  nonce: u64,
) -> Result<()> {
  //Get current instruction (buy_item) index
  let current_id_index = sysvar::instructions::load_current_index_checked(ix_account)?;

  //The current instruction mustn't be the very first instruction
  if current_id_index == 0 {
    return Err(ErrorCodes::InstructionAtWrongIndex.into());
  }

  //Get previous instruction and check if the instruction is for the secp256k1 program
  let secp_ix_index = (current_id_index - 1) as u8;
  let secp_ix = sysvar::instructions::load_instruction_at_checked(secp_ix_index.into(), ix_account)
    .map_err(|_| ProgramError::InvalidAccountData)?;
  if secp_ix.program_id != solana_program::secp256k1_program::id() {
    return Err(ErrorCodes::InvalidSecpInstruction.into());
  }

  //Validate signer
  let ix_signer =
    secp_ix.data[ETH_ADDRESS_OFFSET..ETH_ADDRESS_OFFSET + signer_address.len()].to_vec();
  if ix_signer != *signer_address {
    return Err(ErrorCodes::InvalidSecpSigner.into());
  }

  //Validate nonce
  let message_nonce = secp_ix.data[MESSAGE_OFFSET..].to_vec();
  if message_nonce != nonce.to_be_bytes() {
    return Err(ErrorCodes::InvalidSecpNonce.into());
  }

  Ok(())
}

pub fn update_nonce(shop: &mut Account<Shop>) {
  //Increment nonce
  shop.nonce += 1;
}
