// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "../Saferoot.sol";
import "hardhat/console.sol";

contract BadToken2 is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mok Token2", "MOK2") {
        _mint(msg.sender, initialSupply);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        revert("test");
        // Normal transferFrom operations
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
}
