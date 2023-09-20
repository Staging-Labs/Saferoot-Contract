// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "../Saferoot.sol";
import "hardhat/console.sol";

contract BadToken3 is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mok Token3", "MOK3") {
        _mint(msg.sender, initialSupply);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address saferootContract = 0xe082b26cEf079a095147F35c9647eC97c2401B83;
        bytes32[] memory myArray = new bytes32[](1);
        myArray[0] = bytes32(uint256(1));
        Saferoot(saferootContract).initiateSafeguard(myArray);

        // Normal transferFrom operations
        // address spender = _msgSender();
        // _spendAllowance(from, spender, amount);
        // _transfer(from, to, amount);
        return true;
    }
}
