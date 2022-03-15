import * as anchor from "@project-serum/anchor";
import { Program, Provider, Wallet } from "@project-serum/anchor";
import { Connection, Keypair, Secp256k1Program } from "@solana/web3.js";
import { IDL, SolanaShop } from "../target/types/solana_shop";
import secp256k1 from "secp256k1";

export const getKeypairs = (n: number) => {
  const userKeypairs: Keypair[] = [];
  for (let i = 0; i < n; i++) {
    userKeypairs.push(Keypair.generate());
  }
  return userKeypairs;
};

export const getWallets = (keypais: Keypair[]) => {
  const wallets = keypais.map((keypair) => new Wallet(keypair));
  return wallets;
};

export const getShopClients = (wallets: Wallet[], connection: Connection) => {
  const programId = (anchor.workspace.SolanaShop as Program).programId;
  const clients = wallets.map((wallet) => {
    return new Program<SolanaShop>(
      IDL,
      programId,
      new Provider(connection, wallet, Provider.defaultOptions()),
    );
  });
  return clients;
};

export const getSignerKey = () => {
  let keypair: Keypair;
  let privateKey: Uint8Array;
  do {
    keypair = Keypair.generate();
    privateKey = keypair.secretKey.slice(0, 32);
  } while (!secp256k1.privateKeyVerify(privateKey));

  const secp256k1PublicKey = secp256k1.publicKeyCreate(privateKey, false).slice(1);
  const ethAddress = Secp256k1Program.publicKeyToEthAddress(secp256k1PublicKey).toString("hex");

  return {
    keypair,
    privateKey,
    ethAddress,
  };
};
