mod account;
mod context;
mod error;
mod event;
mod utils;

use anchor_lang::prelude::*;
use anchor_spl::token::{self};
use error::ErrorCodes;
use context::*;
use event::*;
use utils::*;

declare_id!("ShoPVoCg1wWKuNnMxqekeHfvfNkUBjAyUPbtL1AoFAP");

#[program]
pub mod solana_shop {
  use super::*;

  pub fn init_admin(ctx: Context<InitAdmin>) -> Result<()> {
    msg!("SolanaShop:InitAdmin");

    let admin = &mut ctx.accounts.admin;
    admin.authority = ctx.accounts.authority.key();
    admin.bump = *ctx.bumps.get("admin").unwrap();

    Ok(())
  }

  pub fn open_shop(ctx: Context<OpenShop>, signer_address: [u8; 20]) -> Result<()> {
    msg!("SolanaShop:OpenShop");

    let shop = &mut ctx.accounts.shop;
    shop.authority = ctx.accounts.authority.key();
    shop.bump = *ctx.bumps.get("shop").unwrap();
    shop.shop_token = ctx.accounts.shop_token.key();
    shop.signer_address = signer_address;
    shop.nonce = 0;

    emit!(OpenShopEvent {
      shop: shop.key(),
      authority: shop.authority,
      shop_token: shop.shop_token,
      signer_address: shop.signer_address
    });

    Ok(())
  }

  pub fn list_item(ctx: Context<ListItem>, price: u64, supply: u32, freeze: bool) -> Result<()> {
    msg!("SolanaShop:ListItem");

    let item = &mut ctx.accounts.item;
    item.shop = ctx.accounts.shop.key();
    item.mint = ctx.accounts.mint.key();
    item.bump = *ctx.bumps.get("item").unwrap();
    item.freeze = freeze;
    item.price = price;
    item.supply = supply;
    item.sold = 0;

    emit!(ListItemEvent {
      item: item.key(),
      mint: item.mint,
      price: item.price,
      supply: item.supply,
      freeze: item.freeze
    });

    Ok(())
  }

  pub fn update_item(ctx: Context<UpdateItem>, price: u64, supply: u32) -> Result<()> {
    msg!("SolanaShop:UpdateItem");

    let item = &mut ctx.accounts.item;
    if supply < item.sold {
      return Err(ErrorCodes::SupplyTooLow.into());
    }
    item.price = price;
    item.supply = supply;

    emit!(UpdateItemEvent {
      item: item.key(),
      price: item.price,
      supply: item.supply
    });

    Ok(())
  }

  #[access_control(has_verified_signature(&ctx.accounts.sysvar_instruction, &ctx.accounts.shop.signer_address, ctx.accounts.shop.nonce))]
  pub fn buy_item(ctx: Context<BuyItem>, amount: u32) -> Result<()> {
    msg!("SolanaShop:BuyItem");
    let item = &mut ctx.accounts.item;
    let admin = &ctx.accounts.admin;
    let user_item = &ctx.accounts.user_item;

    //Supply availability check
    if item.sold + amount > item.supply {
      return Err(ErrorCodes::ExceedsSupply.into());
    }

    //Update signature nonce
    update_nonce(&mut ctx.accounts.shop);

    //Update item sold count
    item.sold += amount;

    //Transfer payment token from user to shop token account
    let token_amount: u64 = item.price * (amount as u64);
    token::transfer(ctx.accounts.into_transfer_to_shop_context(), token_amount)?;

    //Get admin account PDA seeds
    let pda_seeds = &[b"admin".as_ref(), &[admin.bump]];

    //If user item account is frozen, then thaw before minting
    if user_item.is_frozen() {
      token::thaw_account(
        ctx
          .accounts
          .into_thaw_user_context()
          .with_signer(&[pda_seeds.as_ref()]),
      )?;
    }

    // Mint item to user
    token::mint_to(
      ctx
        .accounts
        .into_mint_to_user_context()
        .with_signer(&[pda_seeds.as_ref()]),
      amount as u64,
    )?;

    //Freeze user token account if set to true
    if ctx.accounts.item.freeze {
      token::freeze_account(
        ctx
          .accounts
          .into_freeze_user_context()
          .with_signer(&[pda_seeds.as_ref()]),
      )?;
    }

    emit!(BuyItemEvent {
      item: ctx.accounts.item.key(),
      amount,
      user: ctx.accounts.user.key()
    });

    Ok(())
  }
}
