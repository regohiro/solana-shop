import * as anchor from "@project-serum/anchor";
import deployerSecreteKey from "../account/deployer.json"
import programSecreteKey from "../account/program.json"
import { Program, Provider } from "@project-serum/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { IDL } from "../target/types/solana_shop";

const ADMIN_BASE = anchor.utils.bytes.utf8.encode("admin");

const main = async () => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8899";

  const programId = Keypair.fromSecretKey(new Uint8Array(programSecreteKey)).publicKey;
  const deployer = Keypair.fromSecretKey(new Uint8Array(deployerSecreteKey));
  const deployerWallet = new anchor.Wallet(deployer);

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new Provider(connection, deployerWallet, {
    preflightCommitment: "finalized",
    skipPreflight: true,
  });
  const program = new Program(IDL, programId, provider);

  //request 1 SOL
  const airdropTx = await connection.requestAirdrop(deployer.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropTx);

  //Init admin
  const [admin] = await PublicKey.findProgramAddress([ADMIN_BASE], programId);
  const tx = await program.rpc.initAdmin({
    accounts: {
      admin,
      authority: deployerWallet.publicKey,
      systemProgram: SystemProgram.programId
    },
    signers: [deployer]
  })
  await connection.confirmTransaction(tx);
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
