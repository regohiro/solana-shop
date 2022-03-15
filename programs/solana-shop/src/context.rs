use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Transfer, Token, MintTo, FreezeAccount, ThawAccount};
use solana_program::{program_option::COption};
use crate::account::*;

#[derive(Accounts)]
pub struct InitAdmin<'info> {
  #[account(
    init, 
    payer = authority, 
    seeds = [b"admin"],
    bump,
    space = 8 + Admin::LEN
  )]
  pub admin: Account<'info, Admin>,
  #[account(mut)]
  pub authority: Signer<'info>,
  pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct OpenShop<'info> {
  #[account(
    init,
    payer = authority,
    seeds = [b"shop", authority.key().as_ref()],
    bump,
    space = 8 + Shop::LEN
  )]
  pub shop: Account<'info, Shop>,
  #[account(constraint = shop_token.owner == authority.key())]
  pub shop_token: Account<'info, TokenAccount>,
  #[account(mut)]
  pub authority: Signer<'info>,
  pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(freeze: bool)]
pub struct ListItem<'info> {
  #[account(
    init,
    payer = authority,
    seeds = [b"item", mint.key().as_ref()],
    bump,
    space = 8 + Item::LEN
  )]
  pub item: Account<'info, Item>,
  #[account( 
    constraint = mint.mint_authority == COption::Some(admin.key()),
    constraint = !freeze || mint.freeze_authority == COption::Some(admin.key())
  )]
  pub mint: Account<'info, Mint>,
  #[account(mut, seeds = [b"shop", authority.key().as_ref()], bump = shop.bump)]
  pub shop: Account<'info, Shop>,
  #[account(seeds = [b"admin"], bump = admin.bump)]
  pub admin: Account<'info, Admin>,
  #[account(mut)]
  pub authority: Signer<'info>,
  pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct UpdateItem<'info> {
  #[account(
    mut, 
    seeds = [b"item", mint.key().as_ref()], 
    bump = item.bump, 
    has_one = shop
  )]
  pub item: Account<'info, Item>,
  #[account(mut, seeds = [b"shop", authority.key().as_ref()], bump = shop.bump)]
  pub shop: Account<'info, Shop>,
  pub mint: Account<'info, Mint>,
  pub authority: Signer<'info>
}

#[derive(Accounts)]
pub struct BuyItem<'info> {
  #[account(mut, seeds = [b"shop", shop_authority.key().as_ref()], bump = shop.bump)]
  pub shop: Box<Account<'info, Shop>>,
  #[account(mut, seeds = [b"item", mint.key().as_ref()], bump = item.bump, has_one = shop)]
  pub item: Box<Account<'info, Item>>,
  #[account(seeds = [b"admin"], bump = admin.bump)]
  pub admin: Account<'info, Admin>,
  #[account(mut)]
  pub mint: Account<'info, Mint>,
  pub user: Signer<'info>,
  #[account(
    mut,
    constraint = user_token.owner == user.key(),
    constraint = user_token.mint == shop_token.mint
  )]
  pub user_token: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = user_item.owner == user.key(),
    constraint = user_item.mint == mint.key()
  )] 
  pub user_item: Account<'info, TokenAccount>,
  #[account(mut, constraint = shop_token.key() == shop.shop_token)]
  pub shop_token: Account<'info, TokenAccount>,
  /// CHECK: This is required for calculating shop PID 
  pub shop_authority: UncheckedAccount<'info>,
  /// CHECK: This is required for instruction introspection
  pub sysvar_instruction: UncheckedAccount<'info>,
  pub token_program: Program<'info, Token>
}

impl<'a, 'b, 'c, 'info> BuyItem<'info> {
  pub fn into_transfer_to_shop_context(&self) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
    let cpi_accounts = Transfer {
      from: self.user_token.to_account_info(),
      to: self.shop_token.to_account_info(),
      authority: self.user.to_account_info()
    };
    let cpi_program = self.token_program.to_account_info();
    CpiContext::new(cpi_program, cpi_accounts)
  }

  pub fn into_mint_to_user_context(&self) -> CpiContext<'a, 'b, 'c, 'info, MintTo<'info>> {
    let cpi_accounts = MintTo {
      mint: self.mint.to_account_info(),
      to: self.user_item.to_account_info(),
      authority: self.admin.to_account_info()
    };
    let cpi_program = self.token_program.to_account_info();
    CpiContext::new(cpi_program, cpi_accounts)
  }

  pub fn into_freeze_user_context(&self) -> CpiContext<'a, 'b, 'c, 'info, FreezeAccount<'info>> {
    let cpi_accounts = FreezeAccount {
      mint: self.mint.to_account_info(),
      account: self.user_item.to_account_info(),
      authority: self.admin.to_account_info()
    };
    let cpi_program = self.token_program.to_account_info();
    CpiContext::new(cpi_program, cpi_accounts)
  }

  pub fn into_thaw_user_context(&self) -> CpiContext<'a, 'b, 'c, 'info, ThawAccount<'info>>  {
    let cpi_accounts = ThawAccount {
      mint: self.mint.to_account_info(),
      account: self.user_item.to_account_info(),
      authority: self.admin.to_account_info()
    };
    let cpi_program = self.token_program.to_account_info();
    CpiContext::new(cpi_program, cpi_accounts)
  }
}