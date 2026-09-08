const fs = require("fs");
const path = require("path");

async function main() {
  const Registry = await ethers.getContractFactory("RoommateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("RoommateRegistry deployed at:", address);

  // Write the address where the frontend and backend can pick it up.
  const out = path.join(__dirname, "..", "deployed-address.json");
  fs.writeFileSync(out, JSON.stringify({ address }, null, 2));
  console.log("Address written to blockchain/deployed-address.json");
  console.log("");
  console.log("Next: paste this address into");
  console.log("  frontend/src/chain.js            -> CONTRACT_ADDRESS");
  console.log("  backend/src/main/resources/application.properties -> chain.contract");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
