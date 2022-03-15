# Solana Shop Program

## Setup

1. Install Rust, Solana CLI, and Anchor
2. Clone this repository
3. Install JS dependencies with yarn
4. Create following accounts
```
solana-keygen new -o ./account/deployer.json
solana-keygen new -o ./account/program.json
solana-keygen new -o ./account/token-mint.json
```
5. Configure program address in lib.rs and Anchor.toml
```
solana-keygen pubkey ./account/program.json
```
6. Create .env and fill everything to run migration scripts
```
cp .env.example .env
vim .env
```

7. Build
```
anchor build
```

8. Deploy
```
solana program deploy --keypair ./account/deployer.json --program-id ./account/program.json ./target/deploy/solana_shop.so
```

9. Run scripts
```
yarn script ./migrations/...ts
```

## Local development

- Start solana test validator with necessary programs already deployed
```
yarn localnode
```

- Run unit tests
```
anchor test
```
