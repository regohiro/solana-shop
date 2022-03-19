import * as anchor from "@project-serum/anchor";
import deployerSecreteKey from "../account/deployer.json";
import mintAuthoritySecretKey from "../account/token-mint-authority.json";
import tokenMintSecretKey from "../account/token-mint.json";
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { MintLayout, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import { Wallet } from "@project-serum/anchor";
import { toBN } from "../utils/bigNumber";

const main = async () => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8899";
  const connection = new Connection(rpcUrl, "confirmed");

  const deployer = Keypair.fromSecretKey(new Uint8Array(deployerSecreteKey));
  const mintAuthority = Keypair.fromSecretKey(new Uint8Array(mintAuthoritySecretKey));
  const tokenMint = Keypair.fromSecretKey(new Uint8Array(tokenMintSecretKey));

  const rent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

  let tx = new Transaction({
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    feePayer: deployer.publicKey,
  });

  tx.add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: deployer.publicKey,
      newAccountPubkey: tokenMint.publicKey,
      space: MintLayout.span,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  tx.add(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      tokenMint.publicKey,
      9,
      mintAuthority.publicKey,
      deployer.publicKey,
    ),
  );

  tx = await new Wallet(tokenMint).signTransaction(tx);
  tx = await new Wallet(deployer).signTransaction(tx);

  const txHash = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(txHash);

      
  console.log("1");

  //request 1 SOL
  const airdropTx = await connection.requestAirdrop(mintAuthority.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropTx);

  console.log("2");

  //Mint 1M payment token to mint authority
  const token = new Token(connection, tokenMint.publicKey, TOKEN_PROGRAM_ID, mintAuthority);
  const tokenAccount = await token.getOrCreateAssociatedAccountInfo(mintAuthority.publicKey);
  const amount = u64.fromBuffer(toBN(1_000_000, 9).toBuffer("le", 8));
  await token.mintTo(tokenAccount.address, mintAuthority, [], amount)
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
