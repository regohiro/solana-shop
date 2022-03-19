import { Connection, programs } from "@metaplex/js";

const main = async () => {
  const connection = new Connection("devnet");
  const tokenPublicKey = "bnUs2oWXhFgcduAv6EJps1oAe2nXY31C3kxbMr8KpiL";
  console.time("m");
  const metadataAccount = await programs.metadata.Metadata.getPDA(tokenPublicKey);
  const metadata = await programs.metadata.Metadata.load(connection, metadataAccount);
  console.timeEnd("m")
};

main()
  .then(() => process.exit(0))
  .catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
