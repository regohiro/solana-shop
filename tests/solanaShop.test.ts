import * as anchor from "@project-serum/anchor";
import { Program, Provider, BN } from "@project-serum/anchor";
import {
  PublicKey,
  Secp256k1Program,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { SolanaShop } from "../target/types/solana_shop";
import { getKeypairs, getShopClients, getSignerKey, getWallets } from "./utils";
import { expect } from "./chai-setup";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import keccak256 from "keccak256";
import secp256k1 from "secp256k1";

const ADMIN_BASE = anchor.utils.bytes.utf8.encode("admin");
const SHOP_BASE = anchor.utils.bytes.utf8.encode("shop");
const ITEM_BASE = anchor.utils.bytes.utf8.encode("item");

describe("Solana Shop 🛒", () => {
  //General config
  const provider = Provider.local();
  const program = anchor.workspace.SolanaShop as Program<SolanaShop>;
  anchor.setProvider(provider);
  const { connection } = provider;
  const { programId } = program;

  const userKeypairs = getKeypairs(5);
  const userWallets = getWallets(userKeypairs);
  const userClients = getShopClients(userWallets, connection);

  const tokenProgram = TOKEN_PROGRAM_ID;
  const systemProgram = SystemProgram.programId;
  const sysvarInstructionsProgram = SYSVAR_INSTRUCTIONS_PUBKEY;

  it("Funds users with 1SOL each", async () => {
    const tx = userKeypairs.reduce(
      (tx, userKeypair) =>
        tx.add(
          SystemProgram.transfer({
            fromPubkey: provider.wallet.publicKey,
            toPubkey: userKeypair.publicKey,
            lamports: 1 * 10 ** 9,
          }),
        ),
      new Transaction(),
    );
    await provider.send(tx);
  });

  describe("Basic flow", () => {
    const ownerKeypair = userKeypairs[0];
    const ownerClient = userClients[0];
    const shopKeypair = userKeypairs[1];
    const shopClient = userClients[1];
    const customerKeypair = userKeypairs[2];
    const customerClient = userClients[2];
    const singer = getSignerKey();

    let mint: Token;
    let token: Token;

    let message: Uint8Array;
    let signature: Uint8Array;
    let recid: number;

    it("Inits admin", async () => {
      const [adminPDA, bump] = await PublicKey.findProgramAddress([ADMIN_BASE], programId);
      const authority = ownerKeypair.publicKey;
      await ownerClient.methods
        .initAdmin()
        .accounts({ admin: adminPDA, authority, systemProgram })
        .rpc();

      const admin = await program.account.admin.fetch(adminPDA);
      expect(admin.authority).to.deep.equal(authority);
      expect(admin.bump).to.eq(bump);
    });

    it("Creates NFT mint account and token account", async () => {
      const [adminPDA] = await PublicKey.findProgramAddress([ADMIN_BASE], programId);
      mint = await Token.createMint(
        connection,
        shopKeypair,
        adminPDA,
        shopKeypair.publicKey,
        0,
        tokenProgram,
      );
      await mint.createAssociatedTokenAccount(customerKeypair.publicKey);
    });

    it("Creates payment token mint account and token acccount", async () => {
      token = await Token.createMint(
        connection,
        ownerKeypair,
        ownerKeypair.publicKey,
        ownerKeypair.publicKey,
        9,
        tokenProgram,
      );
      await token.createAssociatedTokenAccount(customerKeypair.publicKey);
      await token.createAssociatedTokenAccount(shopKeypair.publicKey);
    });

    it("Mints 10 payment token to customer", async () => {
      const customerToken = await token.getOrCreateAssociatedAccountInfo(customerKeypair.publicKey);
      const amount = new u64(10 * 10 ** 9);
      await token.mintTo(customerToken.address, ownerKeypair, [], amount);
    });

    it("Opens shop", async () => {
      const [shopPDA, bump] = await PublicKey.findProgramAddress(
        [SHOP_BASE, shopKeypair.publicKey.toBuffer()],
        programId,
      );
      const shopToken = await token.getOrCreateAssociatedAccountInfo(shopKeypair.publicKey);
      await shopClient.methods
        .openShop([...anchor.utils.bytes.hex.decode(singer.ethAddress)])
        .accounts({
          shop: shopPDA,
          shopToken: shopToken.address,
          authority: shopKeypair.publicKey,
          systemProgram,
        })
        .rpc();

      const shop = await program.account.shop.fetch(shopPDA);
      expect(shop.authority).to.deep.equal(shopKeypair.publicKey);
      expect(shop.bump).to.eq(bump);
      expect(shop.shopToken).to.deep.equal(shopToken.address);
      expect(shop.signerAddress).to.deep.equal([
        ...anchor.utils.bytes.hex.decode(singer.ethAddress),
      ]);
      expect(shop.nonce.toNumber()).to.eq(0);
    });

    it("Lists item", async () => {
      const [adminPDA] = await PublicKey.findProgramAddress([ADMIN_BASE], programId);
      const [shopPDA] = await PublicKey.findProgramAddress(
        [SHOP_BASE, shopKeypair.publicKey.toBuffer()],
        programId,
      );
      const [itemPDA, bump] = await PublicKey.findProgramAddress(
        [ITEM_BASE, mint.publicKey.toBuffer()],
        programId,
      );

      const price = new BN(10 ** 9);
      const supply = 10;

      await shopClient.methods
        .listItem(price, supply, false)
        .accounts({
          item: itemPDA,
          mint: mint.publicKey,
          shop: shopPDA,
          admin: adminPDA,
          authority: shopKeypair.publicKey,
          systemProgram,
        })
        .rpc();

      const item = await program.account.item.fetch(itemPDA);
      expect(item.shop).to.deep.equal(shopPDA);
      expect(item.mint).to.deep.equal(mint.publicKey);
      expect(item.bump).to.eq(bump);
      expect(item.price).to.bignumber.eq(price);
      expect(item.supply).to.eq(supply);
      expect(item.sold).to.eq(0);
    });

    it("Signs signature", async () => {
      const [shopPDA] = await PublicKey.findProgramAddress(
        [SHOP_BASE, shopKeypair.publicKey.toBuffer()],
        programId,
      );
      const { nonce } = await program.account.shop.fetch(shopPDA);
      message = new Uint8Array(nonce.toBuffer("be", 8));
      const hash = keccak256(Buffer.from(message));
      const sig = secp256k1.ecdsaSign(hash, singer.privateKey);
      signature = sig.signature;
      recid = sig.recid;
    });

    it("Buys item", async () => {
      const shopToken = await token.getOrCreateAssociatedAccountInfo(shopKeypair.publicKey);
      const customerToken = await token.getOrCreateAssociatedAccountInfo(customerKeypair.publicKey);
      const customerItem = await mint.getOrCreateAssociatedAccountInfo(customerKeypair.publicKey);

      const [adminPDA] = await PublicKey.findProgramAddress([ADMIN_BASE], programId);
      const [shopPDA] = await PublicKey.findProgramAddress(
        [SHOP_BASE, shopKeypair.publicKey.toBuffer()],
        programId,
      );
      const [itemPDA] = await PublicKey.findProgramAddress(
        [ITEM_BASE, mint.publicKey.toBuffer()],
        programId,
      );

      await customerClient.rpc.buyItem(2, {
        accounts: {
          shop: shopPDA,
          item: itemPDA,
          admin: adminPDA,
          mint: mint.publicKey,
          user: customerKeypair.publicKey,
          userToken: customerToken.address,
          userItem: customerItem.address,
          shopToken: shopToken.address,
          shopAuthority: shopKeypair.publicKey,
          sysvarInstruction: sysvarInstructionsProgram,
          tokenProgram,
        },
        preInstructions: [
          Secp256k1Program.createInstructionWithEthAddress({
            ethAddress: singer.ethAddress,
            message,
            signature,
            recoveryId: recid,
          }),
        ],
      });

      const shop = await program.account.shop.fetch(shopPDA);
      const item = await program.account.item.fetch(itemPDA);
      const customerItemAfter = await mint.getOrCreateAssociatedAccountInfo(
        customerKeypair.publicKey,
      );

      expect(shop.nonce.toNumber()).to.eq(1);
      expect(item.sold).to.eq(2);
      expect(customerItemAfter.amount.toNumber()).to.eq(2);
    });
  });
});
