import * as anchor from "@project-serum/anchor";
import { Provider } from "@project-serum/anchor";
import { MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import {
  CreateMetadata,
  MetadataDataData,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";

const main = async () => {
  //Set rpc
  const connection = new Connection("http://127.0.0.1:8899", 'confirmed');
  // const connection = new Connection("https://api.devnet.solana.com", 'confirmed');

  //Set accounts
  const shop = Keypair.generate();
  const recipient = Keypair.generate();
  const mintAuthoriiy = Keypair.generate();

  console.log("recipient: ");
  const address = recipient.publicKey.toBase58();
  console.log("public key: ", address);
  const pKey = anchor.utils.bytes.bs58.encode(recipient.secretKey);
  console.log("private key: ", pKey);

  //Airdrop SOL
  const tx0 = await connection.requestAirdrop(shop.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(tx0, "confirmed");


  console.log("Balance: ", await connection.getBalance(shop.publicKey))

  //Create TX
  const transaction = new Transaction({
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    feePayer: shop.publicKey,
  });

  //Create mint
  const mint = Keypair.generate();
  const rent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

  transaction.add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: shop.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID
    })
  )

  transaction.add(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      mintAuthoriiy.publicKey,
      mintAuthoriiy.publicKey,
    ),
  );

  // Create ATA
  // const recipientTokenAccount = await Token.getAssociatedTokenAddress(
  //   ASSOCIATED_PROGRAM_ID,
  //   TOKEN_PROGRAM_ID,
  //   mint.publicKey,
  //   recipient.publicKey,
  // );
  // transaction.add(
  //   Token.createAssociatedTokenAccountInstruction(
  //     ASSOCIATED_PROGRAM_ID,
  //     TOKEN_PROGRAM_ID,
  //     mint.publicKey,
  //     recipientTokenAccount,
  //     recipient.publicKey,
  //     shop.publicKey,
  //   ),
  // );

  //Mint token
  // transaction.add(
  //   Token.createMintToInstruction(
  //     TOKEN_PROGRAM_ID,
  //     mint.publicKey,
  //     recipientTokenAccount,
  //     shop.publicKey,
  //     [],
  //     1,
  //   ),
  // );

  // Create metadata
  const metadata = await Metadata.getPDA(mint.publicKey);
  transaction.add(
    new CreateMetadata(
      { feePayer: shop.publicKey },
      {
        metadata,
        metadataData: new MetadataDataData({
          name: "test-nft",
          symbol: "TEST",
          uri: "https://ipfs.infura.io/ipfs/QmeDNHt7zkrqr68Eei9nzktJpDNnuauUqkxiP77H7kxaVP",
          sellerFeeBasisPoints: 0,
          creators: null,
        }),
        updateAuthority: shop.publicKey,
        mint: mint.publicKey,
        mintAuthority: mintAuthoriiy.publicKey,
      },
    ),
  );

  const shopWallet = new anchor.Wallet(shop);
  const mintWallet = new anchor.Wallet(mint);
  let signedTx = await shopWallet.signTransaction(transaction);
  signedTx = await mintWallet.signTransaction(signedTx);
  const txHash = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(txHash, "confirmed");

};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
