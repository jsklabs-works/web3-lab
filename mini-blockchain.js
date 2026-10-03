// mini-blockchain.js — a tiny, readable blockchain you can run and break.
// Run:  node mini-blockchain.js
// No dependencies; uses Node's built-in crypto module.

const crypto = require("crypto");

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

// ─────────────────────────────────────────────────────────────
// LESSON 1: Hashing. Any input becomes a fixed-length "fingerprint".
// If you change even one character, the hash looks completely different.
// ─────────────────────────────────────────────────────────────
console.log("\n=== LESSON 1: Hashing ===");
console.log('sha256("hello")  =', sha256("hello"));
console.log('sha256("hello!") =', sha256("hello!"));

// ─────────────────────────────────────────────────────────────
// LESSON 2: Wallets = key pairs. The private key signs; the public key verifies.
// Your public key acts as your "address". Never share the private key.
// ─────────────────────────────────────────────────────────────
console.log("\n=== LESSON 2: Wallets & signatures ===");

function createWallet(name) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "secp256k1" }); // same curve as Bitcoin/Ethereum
  const address = sha256(publicKey.export({ type: "spki", format: "der" }).toString("hex")).slice(0, 12);
  return { name, privateKey, publicKey, address };
}

const alice = createWallet("Alice");
const bob = createWallet("Bob");
const miner = createWallet("Miner");
console.log("Alice address:", alice.address);
console.log("Bob address:  ", bob.address);

function signTx(tx, wallet) {
  const payload = JSON.stringify({ from: tx.from, to: tx.to, amount: tx.amount });
  return crypto.sign("sha256", Buffer.from(payload), wallet.privateKey).toString("hex");
}

function verifyTx(tx, publicKey) {
  if (tx.from === "NETWORK") return true; // mining rewards have no sender
  const payload = JSON.stringify({ from: tx.from, to: tx.to, amount: tx.amount });
  return crypto.verify("sha256", Buffer.from(payload), publicKey, Buffer.from(tx.signature, "hex"));
}

// ─────────────────────────────────────────────────────────────
// LESSON 3: Blocks. Each block stores transactions and the hash of the
// previous block. That link is what makes it a "chain".
// ─────────────────────────────────────────────────────────────
class Block {
  constructor(index, transactions, previousHash) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.computeHash();
  }

  computeHash() {
    return sha256(this.index + this.timestamp + JSON.stringify(this.transactions) + this.previousHash + this.nonce);
  }

  // LESSON 4: Proof of Work. Keep changing the nonce until the hash starts
  // with N zeros. That's hard to find but easy for anyone to check.
  mine(difficulty) {
    const target = "0".repeat(difficulty);
    const start = Date.now();
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.computeHash();
    }
    console.log(`  ⛏  Block #${this.index} mined in ${Date.now() - start}ms after ${this.nonce} tries → ${this.hash.slice(0, 20)}…`);
  }
}

class Blockchain {
  constructor() {
    this.difficulty = 4; // try 5 or 6 and watch mining slow down
    this.reward = 50;
    this.pending = [];
    this.publicKeys = {}; // address → public key (real chains derive this from the signature)
    const genesis = new Block(0, [], "0");
    genesis.mine(this.difficulty);
    this.chain = [genesis];
  }

  register(wallet) {
    this.publicKeys[wallet.address] = wallet.publicKey;
  }

  balanceOf(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address) balance -= tx.amount;
        if (tx.to === address) balance += tx.amount;
      }
    }
    return balance;
  }

  addTransaction(tx) {
    if (!verifyTx(tx, this.publicKeys[tx.from])) throw new Error("Invalid signature!");
    if (this.balanceOf(tx.from) < tx.amount) throw new Error(`Insufficient funds for ${tx.from}`);
    this.pending.push(tx);
  }

  minePending(minerAddress) {
    const rewardTx = { from: "NETWORK", to: minerAddress, amount: this.reward };
    const block = new Block(this.chain.length, [...this.pending, rewardTx], this.chain.at(-1).hash);
    block.mine(this.difficulty);
    this.chain.push(block);
    this.pending = [];
  }

  // LESSON 5: Anyone can verify the whole chain independently.
  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const block = this.chain[i];
      const prev = this.chain[i - 1];
      if (block.hash !== block.computeHash()) return `Block #${i} contents were changed`;
      if (block.previousHash !== prev.hash) return `Block #${i} is not linked to block #${i - 1}`;
      if (!block.hash.startsWith("0".repeat(this.difficulty))) return `Block #${i} was not mined`;
    }
    return true;
  }
}

function makeTx(fromWallet, toWallet, amount) {
  const tx = { from: fromWallet.address, to: toWallet.address, amount };
  tx.signature = signTx(tx, fromWallet);
  return tx;
}

// ─────────────────────────────────────────────────────────────
// Let's use it.
// ─────────────────────────────────────────────────────────────
console.log("\n=== LESSON 3 & 4: Building and mining the chain ===");
const coin = new Blockchain();
[alice, bob, miner].forEach((w) => coin.register(w));

// Alice mines a block first so she has coins to spend.
coin.minePending(alice.address);
console.log("  Alice balance after mining:", coin.balanceOf(alice.address));

coin.addTransaction(makeTx(alice, bob, 20));
coin.minePending(miner.address);

const balances = () =>
  console.log(`  Balances → Alice: ${coin.balanceOf(alice.address)}, Bob: ${coin.balanceOf(bob.address)}, Miner: ${coin.balanceOf(miner.address)}`);
balances();

console.log("\n=== LESSON 2 again: Security checks ===");
try {
  coin.addTransaction(makeTx(bob, alice, 1000));
} catch (e) {
  console.log("  ❌ Bob tries to send 1000:", e.message);
}
try {
  // Bob forges a tx from Alice, signed with HIS key
  const forged = { from: alice.address, to: bob.address, amount: 30 };
  forged.signature = signTx(forged, bob);
  coin.addTransaction(forged);
} catch (e) {
  console.log("  ❌ Bob forges a tx from Alice:", e.message);
}

// One more block, so block #2 is buried under later history.
coin.addTransaction(makeTx(bob, alice, 5));
coin.minePending(miner.address);
balances();

console.log("\n=== LESSON 5: Immutability (try to cheat) ===");
console.log("  Chain valid?", coin.isValid());

console.log("  😈 Hacker edits block #2 so Bob gets 2000 instead of 20…");
coin.chain[2].transactions[0].amount = 2000;
console.log("  Chain valid?", coin.isValid());

console.log("  😈 Hacker recomputes the hash of block #2 too…");
coin.chain[2].hash = coin.chain[2].computeHash();
console.log("  Chain valid?", coin.isValid());

console.log("  😈 Hacker re-mines block #2…");
coin.chain[2].mine(coin.difficulty);
console.log("  Chain valid?", coin.isValid());
console.log("  → To win, the hacker would have to re-mine EVERY later block faster than");
console.log("    the rest of the network combined. That's why blockchains are tamper-resistant.\n");
