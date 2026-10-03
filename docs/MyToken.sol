// SPDX-License-Identifier: MIT
// ↑ Every Solidity file starts with a license line. MIT = "free to reuse".

pragma solidity ^0.8.20;
// ↑ Which compiler version to use. 0.8+ automatically stops math overflow bugs.

/*
 * MyToken — a minimal ERC-20 token, written from scratch for learning.
 *
 * ERC-20 is the standard "shape" every fungible token on Ethereum follows
 * (USDC, LINK, UNI, ...). Because they all have the same functions, wallets
 * like MetaMask and exchanges can support any token automatically.
 *
 * In real projects you'd import OpenZeppelin's audited ERC20 instead of
 * writing it yourself (see the bottom of the lesson notes).
 */
contract MyToken {
    // ─────────────────────────────────────────────────────────
    // 1. STATE VARIABLES — stored permanently on the blockchain.
    //    Writing to these costs gas (a fee). Reading them is free.
    // ─────────────────────────────────────────────────────────

    string public name = "Learn Coin";   // full name shown in wallets
    string public symbol = "LRN";        // ticker, like "BTC"
    uint8 public decimals = 18;          // 1 LRN = 1 * 10^18 smallest units
    uint256 public totalSupply;          // how many tokens exist in total

    address public owner;                // the account that deployed the contract

    // A mapping is like a dictionary: address → number.
    // This IS the "record book" of who owns how much.
    mapping(address => uint256) public balanceOf;

    // allowance[alice][shop] = how much `shop` may spend from Alice's balance.
    // This lets apps (like an exchange) move your tokens only after you approve.
    mapping(address => mapping(address => uint256)) public allowance;

    // ─────────────────────────────────────────────────────────
    // 2. EVENTS — log entries that apps and Etherscan can listen for.
    //    They're how your wallet knows "you received tokens".
    // ─────────────────────────────────────────────────────────

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ─────────────────────────────────────────────────────────
    // 3. CONSTRUCTOR — runs exactly once, when the contract is deployed.
    // ─────────────────────────────────────────────────────────

    constructor(uint256 initialSupply) {
        owner = msg.sender;              // msg.sender = whoever is calling (here: the deployer)
        _mint(msg.sender, initialSupply * 10 ** decimals);
        // ↑ If you deploy with 1000, you get 1000 LRN (1000 * 10^18 units).
    }

    // ─────────────────────────────────────────────────────────
    // 4. MODIFIER — a reusable check you can attach to functions.
    // ─────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can do this");
        _;                               // ← the rest of the function runs here
    }

    // ─────────────────────────────────────────────────────────
    // 5. THE ERC-20 FUNCTIONS
    // ─────────────────────────────────────────────────────────

    /// Send `amount` of your own tokens to `to`.
    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// Allow `spender` to spend up to `amount` of your tokens.
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// Used by an approved spender to move tokens from `from` to `to`.
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "Allowance too low");
        allowance[from][msg.sender] = allowed - amount;   // use up part of the permission
        _transfer(from, to, amount);
        return true;
    }

    // ─────────────────────────────────────────────────────────
    // 6. EXTRA (not part of ERC-20): owner can create new tokens.
    // ─────────────────────────────────────────────────────────

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// Anyone can destroy their own tokens, reducing total supply.
    function burn(uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "Not enough tokens to burn");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);   // "sent to nowhere" = burned
    }

    // ─────────────────────────────────────────────────────────
    // 7. INTERNAL HELPERS — `internal` means only this contract can call them.
    // ─────────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "Cannot send to the zero address");
        require(balanceOf[from] >= amount, "Not enough tokens");
        // If any `require` fails, the WHOLE transaction is cancelled
        // and nothing changes. This is called a "revert".

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Cannot mint to the zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);   // "from nowhere" = newly created
    }
}
