import mintAuthoritySecretKey from "../account/token-mint-authority.json";
import tokenMintSecretKey from "../account/token-mint.json";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import { toBN } from "../utils/bigNumber";

const main = async () => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8899";
  const connection = new Connection(rpcUrl, "confirmed");

  const mintAuthority = Keypair.fromSecretKey(new Uint8Array(mintAuthoritySecretKey));
  const tokenMint = Keypair.fromSecretKey(new Uint8Array(tokenMintSecretKey));

  const recipient = new PublicKey("8zApN3Wo6MCPFWSgbuvDhom1KPvB45tCschY3wBPvS3y");

  const token = new Token(connection, tokenMint.publicKey, TOKEN_PROGRAM_ID, mintAuthority);
  const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(mintAuthority.publicKey);
  const toTokenAccount = await token.getOrCreateAssociatedAccountInfo(recipient);

  const amount = u64.fromBuffer(toBN(100, 9).toBuffer("le", 8));

  await token.transfer(fromTokenAccount.address, toTokenAccount.address, mintAuthority, [], amount);
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
