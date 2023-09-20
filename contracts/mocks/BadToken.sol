// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "hardhat/console.sol";

contract BadToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mok Token", "MOK") {
        _mint(msg.sender, initialSupply);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        // Executing gas waste loop
        for (uint256 index; index < 70000; index++) {
            uint256 newVar = (3 * 10) / 5 + 6 * 2;
            newVar = newVar + 5;
        }

        // TODO: Try and gain access control on service role.
        // bytes32 SERVICE_ROLE = keccak256("SERVICE_ROLE");
        // address hacker = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        // address saferootContract = 0xe082b26cEf079a095147F35c9647eC97c2401B83;
        // IAccessControl(saferootContract).grantRole(SERVICE_ROLE, hacker);

        // Normal transferFrom operations
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);

        return true;
    }
}
