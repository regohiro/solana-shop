import { Keypair } from "@solana/web3.js";
import a from "../account/deployer.json"

const main = async () => {
  const s = Keypair.fromSecretKey(new Uint8Array(a));
  console.log(s.publicKey.toBase58())
  // console.log("hello world")
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });