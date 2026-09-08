// Grants consent on the blockchain, exactly as the MetaMask button would.
//
//   npx hardhat run scripts/consent-grant.js --network localhost
//
// The granter's key signs the transaction, so msg.sender inside the contract
// is the granter. This is the same transaction MetaMask would send - the only
// difference is which piece of software holds the private key.

const { load } = require("./consent-common");

async function main() {
  const { registry, address, granter, receiver } = await load();

  console.log("Contract :", address);
  console.log("Granter  :", granter.address, "(Vikram - signs)");
  console.log("Receiver :", receiver.address, "(Arun - gets access)");
  console.log("");

  const before = await registry.hasConsent(granter.address, receiver.address);
  console.log("Consent on chain before:", before);

  if (before) {
    console.log("");
    console.log("Already granted - nothing to do.");
    return;
  }

  const tx = await registry.connect(granter).grantConsent(receiver.address);
  console.log("Transaction sent :", tx.hash);

  const receipt = await tx.wait();
  console.log("Mined in block   :", receipt.blockNumber);
  console.log("Gas used         :", receipt.gasUsed.toString());
  console.log("");

  const after = await registry.hasConsent(granter.address, receiver.address);
  console.log("Consent on chain after :", after);
  console.log("");
  console.log("Now sign in as Arun and press 'Check for permission' on Vikram.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
