// Reads consent straight off the blockchain. Sends no transaction and costs
// nothing - it is the same read-only eth_call the Spring Boot backend makes.
//
//   npx hardhat run scripts/consent-check.js --network localhost
//
// Use this to prove the permission is stored in the contract rather than in
// MySQL: delete every row from the consents table, run this again, and the
// answer does not change.

const { ethers } = require("hardhat");
const { load } = require("./consent-common");

async function main() {
  const { registry, address, granter, receiver } = await load();

  console.log("Contract :", address);
  console.log("Vikram   :", granter.address);
  console.log("Arun     :", receiver.address);
  console.log("");

  const forward = await registry.hasConsent(granter.address, receiver.address);
  const backward = await registry.hasConsent(receiver.address, granter.address);

  console.log("hasConsent(Vikram -> Arun) :", forward);
  console.log("hasConsent(Arun -> Vikram) :", backward);
  console.log("");
  console.log("Consent has a direction. Vikram granting Arun access does not");
  console.log("give Vikram access to Arun's number - hence the two answers.");
  console.log("");

  // The same call the backend hand-encodes in ChainClient.java, shown raw so
  // you can see there is no database involved anywhere in the answer.
  const selector = ethers
    .keccak256(ethers.toUtf8Bytes("hasConsent(address,address)"))
    .slice(2, 10);
  const data =
    "0x" +
    selector +
    granter.address.slice(2).toLowerCase().padStart(64, "0") +
    receiver.address.slice(2).toLowerCase().padStart(64, "0");

  const raw = await ethers.provider.call({ to: address, data });
  console.log("Raw eth_call sent by the backend");
  console.log("  selector :", "0x" + selector, "(keccak256 of the function signature)");
  console.log("  data     :", data);
  console.log("  returned :", raw);
  console.log("  meaning  :", raw.endsWith("1") ? "true" : "false");
  console.log("");

  // Every grant and revoke is permanently recorded as an event in a block.
  const granted = await registry.queryFilter(registry.filters.ConsentGranted());
  const revoked = await registry.queryFilter(registry.filters.ConsentRevoked());

  console.log("Events recorded on chain");
  if (granted.length === 0 && revoked.length === 0) {
    console.log("  (none yet - run consent-grant.js first)");
  }
  for (const e of granted) {
    console.log(`  block ${e.blockNumber}  ConsentGranted  ${e.args[0]} -> ${e.args[1]}`);
  }
  for (const e of revoked) {
    console.log(`  block ${e.blockNumber}  ConsentRevoked  ${e.args[0]} -> ${e.args[1]}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
