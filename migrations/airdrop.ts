import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { delay } from "../utils/time";

const main = async () => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8899";

  const connection = new Connection(rpcUrl, "confirmed");
  const accounts = [
    new PublicKey("8zApN3Wo6MCPFWSgbuvDhom1KPvB45tCschY3wBPvS3y"),
    new PublicKey("DrozQFES2uueVhPxsxXWyzQn79L7buDN1oD5p6dmka1S"),
  ];

  //Request airdrops
  for(const account of accounts){
    const tx = await connection.requestAirdrop(account, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(tx); 
    await delay(10000);
  }
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
