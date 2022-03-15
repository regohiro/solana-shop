use anchor_lang::prelude::{Error, error_code};

#[error_code]
pub enum ErrorCodes {
  #[msg("SupplyTooLow")]
  SupplyTooLow,
  #[msg("InstructionAtWrongIndex")]
  InstructionAtWrongIndex,
  #[msg("InvalidSecpInstruction")]
  InvalidSecpInstruction,
  #[msg("InvalidSecpSigner")]
  InvalidSecpSigner,
  #[msg("InvalidSecpNonce")]
  InvalidSecpNonce,
  #[msg("ExceedsSupply")]
  ExceedsSupply
}