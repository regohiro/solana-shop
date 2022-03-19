use anchor_lang::prelude::*;

#[event]
pub struct InitAdminEvent {
  pub admin: Pubkey
}

#[event]
pub struct OpenShopEvent {
  pub shop: Pubkey,
  pub authority: Pubkey,
  pub shop_token: Pubkey,
  pub signer_address: [u8; 20]
}

#[event]
pub struct ListItemEvent {
  pub item: Pubkey,
  pub shop: Pubkey,
  pub mint: Pubkey,
  pub price: u64,
  pub supply: u32,
  pub freeze: bool
}

#[event]
pub struct UpdateItemEvent {
  pub item: Pubkey,
  pub price: u64,
  pub supply: u32
}

#[event]
pub struct BuyItemEvent {
  pub item: Pubkey,
  pub amount: u32,
  pub user: Pubkey
}