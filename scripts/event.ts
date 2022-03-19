import * as anchor from "@project-serum/anchor";
import deployerSecreteKey from "../account/deployer.json";
import programSecreteKey from "../account/program.json";
import { Program, Provider } from "@project-serum/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { IDL } from "../target/types/solana_shop";
import { clusterApiUrl } from "@solana/web3.js";

const ADMIN_BASE = anchor.utils.bytes.utf8.encode("admin");

const main = async () => {
  const rpcUrl = "http://127.0.0.1:8899";

  const programId = Keypair.fromSecretKey(new Uint8Array(programSecreteKey)).publicKey;
  console.log("programId: ", programId.toBase58());
  const deployer = Keypair.fromSecretKey(new Uint8Array(deployerSecreteKey));
  const deployerWallet = new anchor.Wallet(deployer);

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new Provider(connection, deployerWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: true
  });
  const program = new Program(IDL, programId, provider);

  program.addEventListener("OpenShopEvent", (event, slot) => {
    console.log("OpenShopEvent")
  });

  program.addEventListener("InitAdminEvent", (event, slot) => {
    console.log("InitAdminEvent")
  });
};

main()
  // .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
