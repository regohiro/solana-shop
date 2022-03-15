use anchor_lang::prelude::*;

#[account]
pub struct Admin {
  //Admin account creator
  pub authority: Pubkey, // 32
  //Bump seed for Admin account PDA
  pub bump: u8, // 1
}

impl Admin {
  pub const LEN: usize = 32 + 1;
}

#[account]
pub struct Shop {
  //Shop account creator 
  pub authority: Pubkey, // 32
  //Bump seed for Shop account PDA
  pub bump: u8, // 1
  //Payment token account 
  pub shop_token: Pubkey, // 32
  //Signer eth address
  pub signer_address: [u8; 20], // 20
  //Message nonce 
  pub nonce: u64 //8
}

impl Shop {
  pub const LEN: usize = 32 + 1 + 32 + 20 + 8;
}

#[account]
pub struct Item {
  //Shop PDA Pubkey
  pub shop: Pubkey, // 32
  //Item mint account Pubkey
  pub mint: Pubkey, // 32
  //Bump seed for Item account PDA
  pub bump: u8, // 1
  //It transferable
  pub freeze: bool, //1
  //Item price
  pub price: u64, // 8
  //Item supply
  pub supply: u32, // 4
  //Item sold
  pub sold: u32 // 4
}

impl Item {
  pub const LEN: usize = 32 + 32 + 1 + 1 + 8 + 4 + 4;
}