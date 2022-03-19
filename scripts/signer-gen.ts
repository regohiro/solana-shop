import { randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import keccak256 from "keccak256";

const main = async () => {
  const password = "hello world1"
  const hash = keccak256(password);
  const seed = new Uint8Array(hash);
  const keypair = Keypair.fromSeed(seed);
  const privateKey = keypair.secretKey.slice(0, 32);

  console.log("pubkey: ", keypair.publicKey.toBase58())
  console.log("privateKey:", privateKey.toString());

};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });