import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Wallet,
  keccak256,
  toUtf8Bytes
} from "ethers";

// Paste the address printed by `npm run deploy` in the blockchain folder.
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Same node the backend reads.
const RPC_URL = "http://127.0.0.1:8545";

// Hardhat's local development network. The demo signer below refuses to run
// on anything else, so these keys can never be used on a live network.
const LOCAL_CHAIN_ID = 31337n;

// Only the four functions this app calls.
const ABI = [
  "function grantConsent(address receiver) external",
  "function revokeConsent(address receiver) external",
  "function hasConsent(address granter, address receiver) external view returns (bool)",
  "function storeReview(bytes32 reviewHash) external",
  "function verifyReview(bytes32 reviewHash) external view returns (bool)"
];

// ---------------------------------------------------------------------------
// LOCAL DEMO SIGNER - stands in for MetaMask when no extension is installed.
//
// These are the first accounts every Hardhat node creates. Their keys are
// published in Hardhat's own documentation, identical on every machine, and
// hold nothing but worthless test ETH. Nothing secret is stored here.
//
// In a real deployment this block is deleted and MetaMask does the signing, so
// the key never appears in application code at all. It is kept here only so
// the consent flow can be demonstrated end to end without a browser extension
// - and the signing still happens in the browser, on the user's own machine.
// The key is never sent to the backend, because a server able to sign for
// everyone would be exactly the single point of trust this project argues
// against.
// ---------------------------------------------------------------------------
const DEMO_ACCOUNTS = [
  {
    label: "Hardhat account #0",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  },
  {
    label: "Hardhat account #1",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  },
  {
    label: "Hardhat account #2",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
  },
  {
    label: "Hardhat account #3",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  },
  {
    label: "Hardhat account #4",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
  }
];

/** Accounts offered in the picker when MetaMask is not installed. */
export function demoAccounts() {
  return DEMO_ACCOUNTS.map(({ label, address }) => ({ label, address }));
}

/** True if a browser wallet extension is available. */
export function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

function requireMetaMask() {
  if (!hasMetaMask()) {
    throw new Error("Install the MetaMask extension to use consent features");
  }
}

/**
 * Reads the contract with no wallet at all.
 *
 * A view call needs no signature and no account, so this works whether or not
 * MetaMask is installed.
 */
export async function readConsent(granterWallet, receiverWallet) {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
  return contract.hasConsent(granterWallet, receiverWallet);
}

/** Prompts MetaMask and returns the selected wallet address. */
export async function connectWallet() {
  requireMetaMask();
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

/**
 * A signer for `asAddress`.
 *
 * With MetaMask installed the extension signs and the address argument is
 * ignored - whatever account the user has selected is used, exactly as before.
 * Without it, the matching demo key signs in the browser instead.
 */
async function signerFor(asAddress) {
  if (hasMetaMask()) {
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }

  if (!asAddress) {
    throw new Error("Connect a wallet first, so we know which account signs");
  }

  const account = DEMO_ACCOUNTS.find(
    (a) => a.address.toLowerCase() === asAddress.toLowerCase()
  );

  if (!account) {
    throw new Error(
      "No signing key for " +
        asAddress +
        ". Install MetaMask, or pick one of the demo accounts."
    );
  }

  const provider = new JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();

  // Refuse to touch these published keys on any network but local Hardhat.
  if (network.chainId !== LOCAL_CHAIN_ID) {
    throw new Error(
      "The demo signer only runs on the local Hardhat network (chain 31337)"
    );
  }

  return new Wallet(account.privateKey, provider);
}

async function getContract(asAddress) {
  const signer = await signerFor(asAddress);
  return new Contract(CONTRACT_ADDRESS, ABI, signer);
}

/**
 * Writes consent to the blockchain and waits for it to be mined.
 * With MetaMask this opens the extension; otherwise the demo key signs.
 */
export async function grantConsent(receiverWallet, asAddress) {
  const contract = await getContract(asAddress);
  const tx = await contract.grantConsent(receiverWallet);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function revokeConsent(receiverWallet, asAddress) {
  const contract = await getContract(asAddress);
  const tx = await contract.revokeConsent(receiverWallet);
  const receipt = await tx.wait();
  return receipt.hash;
}

/** Read-only check, costs no gas. */
export async function hasConsent(granterWallet, receiverWallet) {
  return readConsent(granterWallet, receiverWallet);
}

/** keccak256 of the review text - this is what goes on chain. */
export function hashReview(text) {
  return keccak256(toUtf8Bytes(text));
}

export async function storeReview(text, asAddress) {
  const contract = await getContract(asAddress);
  const hash = hashReview(text);
  const tx = await contract.storeReview(hash);
  const receipt = await tx.wait();
  return { hash, txHash: receipt.hash };
}

/** False means the database text no longer matches what was published. */
export async function verifyReview(text) {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
  return contract.verifyReview(hashReview(text));
}
