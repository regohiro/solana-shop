import { randomBytes } from "crypto";
import { Keypair, Secp256k1Program } from "@solana/web3.js";
import secp256k1 from "secp256k1";

const main = async () => {
  let keypair: Keypair;
  let privateKey: Uint8Array;
  const attemps: number[] = [];

  for (let i = 0; i < 10000; i++) {
    let tries = 0;
    do {
      const seed = new Uint8Array(randomBytes(32));
      keypair = Keypair.fromSeed(seed);
      privateKey = keypair.secretKey.slice(0, 32);
      tries++;
    } while (!secp256k1.privateKeyVerify(privateKey));
    if(tries > 1){
      attemps.push(tries);
    }
  }

  console.log(attemps);

};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
