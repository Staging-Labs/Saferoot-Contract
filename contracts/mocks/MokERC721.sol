// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MokERC721 is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("Mok 721", "MFT 721") {
        uint256 newId = _tokenIds.current();
        _mint(msg.sender, newId);
        _setTokenURI(newId, "");

        _tokenIds.increment();
    }

    function mint(address user, string memory tokenURI)
        public
        returns (uint256)
    {
        uint256 newId = _tokenIds.current();
        _mint(user, newId);
        _setTokenURI(newId, tokenURI);

        _tokenIds.increment();
        return newId;
    }
}