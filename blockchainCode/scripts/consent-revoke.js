// Withdraws consent on the blockchain - the "Withdraw consent" button.
//
//   npx hardhat run scripts/consent-revoke.js --network localhost
//
// Use this at the end of the demo to show that the granter, and only the
// granter, can take permission away again.

const { load } = require("./consent-common");

async function main() {
  const { registry, address, granter, receiver } = await load();

  console.log("Contract :", address);
  console.log("Granter  :", granter.address, "(Vikram - signs)");
  console.log("Receiver :", receiver.address, "(Arun - loses access)");
  console.log("");

  const before = await registry.hasConsent(granter.address, receiver.address);
  console.log("Consent on chain before:", before);

  if (!before) {
    console.log("");
    console.log("There is no consent to withdraw.");
    return;
  }

  const tx = await registry.connect(granter).revokeConsent(receiver.address);
  console.log("Transaction sent :", tx.hash);

  const receipt = await tx.wait();
  console.log("Mined in block   :", receipt.blockNumber);
  console.log("");

  const after = await registry.hasConsent(granter.address, receiver.address);
  console.log("Consent on chain after :", after);
  console.log("");
  console.log("Arun's 'Check for permission' will now fail again.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
