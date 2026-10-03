// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PiggyBank {
    address public owner;

    constructor() {
        owner = msg.sender;              // whoever deploys it owns it
    }

    function deposit() public payable {
        // anyone can put ETH in
    }

    function withdraw() public {
        require(msg.sender == owner, "Only the owner can withdraw");
        (bool sent, ) = owner.call{value: address(this).balance}("");   // send everything to the owner
        require(sent, "Sending failed");
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
