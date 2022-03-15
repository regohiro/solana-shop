import chai from "chai";
import chaiBN from "chai-bn";
import chaiAsPromised from "chai-as-promised";
import { BN } from "@project-serum/anchor";
chai.use(chaiAsPromised);
chai.use(chaiBN(BN));
export = chai;
