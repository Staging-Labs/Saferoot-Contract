import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import {
  Saferoot,
  MokToken,
  MokERC721,
  MokERC1155,
} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployedFixture } from "./utils/deploys";
import {
  approveAll1155Contract,
  approve721Contract,
  approveTokenContract,
} from "./utils/approvals";
import { TokenType } from "./utils/tokenType";
import {
  SafeEntryStruct
} from "./utils/safeEntryStructs";

  // The counter paradigm in our key is to distinguish among different tokenIDs for ERC-721 and ERC-1155 only.
  const STATIC_ERC20_COUNTER = 0;

describe("Multi-Type Safeguards", () => {
  let saferoot: Saferoot;
  let token: MokToken;
  let token721: MokERC721;
  let token1155: MokERC1155;
  let user: SignerWithAddress,
    backup: SignerWithAddress;
  let safeEntryERC20: SafeEntryStruct,
    safeEntryERC721: SafeEntryStruct,
    safeEntryERC1155: SafeEntryStruct;

  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    saferoot = fixture.saferoot;
    token = fixture.token;
    token721 = fixture.token721;
    token1155 = fixture.token1155;
    user = fixture.user;
    backup = fixture.backup;

    // approve tokens
    approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);

    safeEntryERC20 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token.address
    };
    safeEntryERC721 = {
      tokenType: TokenType.ERC721,
      contractAddress: token721.address,
      tokenId: 0
    };
    safeEntryERC1155 = {
      tokenType: TokenType.ERC1155,
      contractAddress: token1155.address,
      tokenId: 3
    };
  });

  describe("Add Safeguard", () => {
    it("adds a single safeguard at a time", async () => {
      const entries = [
        { entry: safeEntryERC20, tokenType: TokenType.ERC20, eventName: "ERC20SafeguardAdded", expected: 1 },
        { entry: safeEntryERC721, tokenType: TokenType.ERC721, eventName: "ERC721SafeguardAdded", expected: safeEntryERC721.tokenId },
        { entry: safeEntryERC1155, tokenType: TokenType.ERC1155, eventName: "ERC1155SafeguardAdded", expected: safeEntryERC1155.tokenId }
      ];
  
      for (let i = 0; i < entries.length; i++) {
          const { entry, tokenType, eventName, expected} = entries[i];
  
          // Add safeguard
          const tx = await saferoot.connect(user).addSafeguard([entry]);
          const receipt = await tx.wait();

          // Encode the key for the safeguard entry
          const key = await saferoot.encodeKey(entry.contractAddress, tokenType, (tokenType === TokenType.ERC20) ? STATIC_ERC20_COUNTER : i - 1); // Counter starts at 0
  
          // Filter events and ensure the event for the specific token type was emitted
          const currentEvent = receipt.events?.find(e => e.event === eventName && e.args && e.args.length > 0 && e.args[0] === key);
          // Assert that the event was found
          expect(currentEvent, `Expected ${eventName} event for entry ${i} not found`).to.exist;
  
          if (currentEvent && currentEvent.args) {
              expect(currentEvent.args[0], `Event argument for entry ${i} does not match`).to.equal(key);
          } else {
              throw new Error(`Expected ${eventName} event arguments for entry ${i} are missing`);
          }

          // If the token is 721 or 1155, we expect a tokenID to be stored in the safeguard
          if (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) {
            expect((await saferoot.keyToTokenIDMapping(key))).to.equal(expected);
          }
      }
  });
  
  

  it("adds multiple safeguards", async () => {
      const entries = [
          { entry: safeEntryERC20, tokenType: TokenType.ERC20, eventName: "ERC20SafeguardAdded", expected: 1 },
          { entry: safeEntryERC721, tokenType: TokenType.ERC721, eventName: "ERC721SafeguardAdded", expected: safeEntryERC721.tokenId },
          { entry: safeEntryERC1155, tokenType: TokenType.ERC1155, eventName: "ERC1155SafeguardAdded", expected: safeEntryERC1155.tokenId }
      ];

      // Add safeguards
      const tx = await saferoot.connect(user).addSafeguard([safeEntryERC20, safeEntryERC721, safeEntryERC1155]);
      const receipt = await tx.wait();

      for (let i = 0; i < entries.length; i++) {
          const { entry, tokenType, eventName, expected } = entries[i];

          // Encode the key for the safeguard entry
          const key = await saferoot.encodeKey(entry.contractAddress, tokenType, (tokenType === TokenType.ERC20) ? STATIC_ERC20_COUNTER : i - 1);

          // Check for the specific event and key
          const currentEvent = receipt.events?.find(e => e.event === eventName && e.args && e.args.length > 0 && e.args[0] === key);
          
          expect(currentEvent, `Expected ${eventName} event for entry ${i} not found`).to.exist;
          
          // If the token is 721 or 1155, we expect a tokenID to be stored in the safeguard
          if (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) {
            expect((await saferoot.keyToTokenIDMapping(key))).to.equal(expected);
          }
      }
    });
  });

  describe("Initiate Safeguards", () => {
    let key: string, key2: string, key3: string;
    beforeEach(async () => {
      // Add safeguards
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntryERC20, safeEntryERC721, safeEntryERC1155]);
      await addSafeguardTx.wait();
      // Store keys
      key = await saferoot.encodeKey(safeEntryERC20.contractAddress, TokenType.ERC20, STATIC_ERC20_COUNTER);
      key2 = await saferoot.encodeKey(safeEntryERC721.contractAddress, TokenType.ERC721, 0);
      key3 = await saferoot.encodeKey(safeEntryERC1155.contractAddress, TokenType.ERC1155, 1);
    });

    it("executes a single safeguard transfer at a time", async () => {
      // Approve tokens
      approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);
      approve721Contract(token721, saferoot, user, ethers.BigNumber.from(0));
      approveAll1155Contract(token1155, saferoot, user);
      // Get balances
      const balanceUser = await token.balanceOf(user.address);
      const balanceUser2 = await token721.balanceOf(user.address);
      const balanceUser3 = await token1155.balanceOf(user.address, safeEntryERC1155.tokenId);
      // Intiate safeguards
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      const initiateSafeguardTx2 = await saferoot.initiateSafeguard([key2]);
      await initiateSafeguardTx2.wait();
      const initiateSafeguardTx3 = await saferoot.initiateSafeguard([key3]);
      await initiateSafeguardTx3.wait();
      // Check balances after
      const balanceBackup = await token.balanceOf(backup.address);
      const balanceBackup2 = await token721.balanceOf(backup.address);
      const balanceBackup3 = await token1155.balanceOf(backup.address, safeEntryERC1155.tokenId);

      const balanceUserNew = await token.balanceOf(user.address);
      const balanceUserNew2 = await token721.balanceOf(user.address);
      const balanceUserNew3 = await token1155.balanceOf(user.address, safeEntryERC1155.tokenId);

      // Verify assertions
      expect(balanceBackup).to.equal(balanceUser);
      expect(balanceUserNew).to.equal(balanceUser.sub(balanceBackup));

      expect(balanceBackup2).to.equal(1);
      expect(balanceUserNew2).to.equal(balanceUser2.sub(1));
  
      expect(balanceBackup3).to.equal(balanceUser3);
      expect(balanceUserNew3).to.equal(balanceUser3.sub(balanceBackup3));
    });

    it("executes a multiple safeguard transfer", async () => {
      // Approve tokens
      approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);
      approve721Contract(token721, saferoot, user, ethers.BigNumber.from(0));
      approveAll1155Contract(token1155, saferoot, user);
      // Check balances
      const balanceUser = await token.balanceOf(user.address);
      const balanceUser2 = await token721.balanceOf(user.address);
      const balanceUser3 = await token1155.balanceOf(user.address, safeEntryERC1155.tokenId);

      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();

      // Check balances after
      const balanceBackup = await token.balanceOf(backup.address);
      const balanceBackup2 = await token721.balanceOf(backup.address);
      const balanceBackup3 = await token1155.balanceOf(backup.address, safeEntryERC1155.tokenId);

      const balanceUserNew = await token.balanceOf(user.address);
      const balanceUserNew2 = await token721.balanceOf(user.address);
      const balanceUserNew3 = await token1155.balanceOf(user.address, safeEntryERC1155.tokenId);

      // Verify assertions
      expect(balanceBackup).to.equal(balanceUser);
      expect(balanceUserNew).to.equal(balanceUser.sub(balanceBackup));

      expect(balanceBackup2).to.equal(1);
      expect(balanceUserNew2).to.equal(balanceUser2.sub(1));

      expect(balanceBackup3).to.equal(balanceUser3);
      expect(balanceUserNew3).to.equal(balanceUser3.sub(balanceBackup3));
    });
  });
});
