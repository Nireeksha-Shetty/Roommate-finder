const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// ---------------------------------------------------------------------------
// Which Hardhat test account stands in for which student.
//
//   Account #0  ->  Arun    (user 1)  - wants to see the phone number
//   Account #1  ->  Vikram  (user 5)  - owns it, and grants permission
//
// These must match the wallet_address saved against each user in MySQL,
// otherwise the backend will look up a different pair on the chain and
// always get false. Change the two numbers to demo a different pair.
// ---------------------------------------------------------------------------
const GRANTER_ACCOUNT = 1; // Vikram - signs the grant
const RECEIVER_ACCOUNT = 0; // Arun   - is allowed to see the details

function contractAddress() {
  const file = path.join(__dirname, "..", "deployed-address.json");
  if (!fs.existsSync(file)) {
    throw new Error(
      "deployed-address.json is missing. Deploy the contract first:\n" +
        "  npx hardhat run scripts/deploy.js --network localhost"
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).address;
}

/** Connects to the deployed contract and picks out the two accounts. */
async function load() {
  const address = contractAddress();
  const signers = await ethers.getSigners();

  if (signers.length <= Math.max(GRANTER_ACCOUNT, RECEIVER_ACCOUNT)) {
    throw new Error(
      "The Hardhat node did not offer enough accounts. Is it running?"
    );
  }

  const registry = await ethers.getContractAt("RoommateRegistry", address);
  return {
    registry,
    address,
    granter: signers[GRANTER_ACCOUNT],
    receiver: signers[RECEIVER_ACCOUNT],
  };
}

module.exports = { load, contractAddress, GRANTER_ACCOUNT, RECEIVER_ACCOUNT };
