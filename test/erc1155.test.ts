import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import { Saferoot, MokERC1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployedFixture } from "./utils/deploys";
import { approveAll1155Contract } from "./utils/approvals";
import { TokenType } from "./utils/tokenType";
import { SafeEntryStruct } from "./utils/safeEntryStructs";
import { BigNumber } from "ethers";

describe("ERC1155 Safeguards", () => {
  let saferoot: Saferoot;
  let token: MokERC1155, token2: MokERC1155, token3: MokERC1155;
  let user: SignerWithAddress,
    backup: SignerWithAddress,
    service: SignerWithAddress,
    hacker: SignerWithAddress;
  let safeEntry1: SafeEntryStruct,
    safeEntry2: SafeEntryStruct,
    safeEntry3: SafeEntryStruct;
  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    saferoot = fixture.saferoot;
    token = fixture.token1155;
    token2 = fixture.tokenTwo1155;
    token3 = fixture.tokenThree1155;

    user = fixture.user;
    backup = fixture.backup;
    service = fixture.service;
    hacker = fixture.hacker;

    safeEntry1 = {
      tokenType: TokenType.ERC1155,
      contractAddress: token.address,
      tokenId: 0
    };
    safeEntry2 = {
      tokenType: TokenType.ERC1155,
      contractAddress: token2.address,
      tokenId: 1
    };
    safeEntry3 = {
      tokenType: TokenType.ERC1155,
      contractAddress: token3.address,
      tokenId: 3
    };
  });
  describe("Add Safeguard", () => {
    it("adds a single safeguard", async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry1]);
      const receipt = await addSafeguardTx.wait();

      // Retrieve the key using the await saferoot.encodeKey function
      const key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC1155, 0);
      // Verify that the contract address stored for the safeguard with the given key matches the expected value
      expect((await saferoot.keyToTokenIDMapping(key))).to.equal(
        safeEntry1.tokenId
      );
      // Assert that key has been generated and evented
      const event = receipt.events?.find(e => e.event === "ERC1155SafeguardAdded");
      expect(event).to.not.be.undefined;
      // Validate the args if the event is found
      if (event && event.args) {
        expect(event.args[0]).to.equal(key);  // Assuming the first argument of the event is the encoded key
      } else {
        throw new Error("Expected ERC1155SafeguardAdded event not found or event arguments are missing");
      }
    });

    it("adds multiple safeguards", async () => {
      const safeguardEntries = [safeEntry1, safeEntry2, safeEntry3];
      // Add multiple safeguard entries
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard(safeguardEntries);
      const receipt = await addSafeguardTx.wait();

      // Filter all events with the name "ERC1155SafeguardAdded"
      const events = receipt.events?.filter(e => e.event === "ERC1155SafeguardAdded") || [];
      expect(events.length).to.equal(safeguardEntries.length);  // There should be as many events as there are entries

      // Verify each safeguard entry
      for (let i = 0; i < safeguardEntries.length; i++) {
        const safeguardEntry = safeguardEntries[i];
        // Encode the key for the safeguard entry
        const key = await saferoot.encodeKey(safeguardEntry.contractAddress, TokenType.ERC1155, i);

        // Verify that the key has been generated and stored
        expect((await saferoot.keyToTokenIDMapping(key))).to.equal(
          safeguardEntry.tokenId
        );

        const currentEvent = events[i];
        expect(currentEvent, `Expected ERC1155SafeguardAdded event for entry ${i} not found`).to.exist;

        // Check if args exists on the currentEvent and that there is at least one argument
        if (currentEvent && currentEvent.args && currentEvent.args.length > 0) {
          expect(currentEvent.args[0], `Event argument for entry ${i} does not match`).to.equal(key);
        } else {
          throw new Error(`Expected ERC1155SafeguardAdded event arguments for entry ${i} are missing`);
        }
      }
    });

    it("reverts on safeguard entry with zero address", async () => {
      await expect(
        // Expect the addSafeguard transaction to be reverted with a custom error
        saferoot.connect(user).addSafeguard(
          [
            {
              tokenType: TokenType.ERC1155,
              contractAddress: ethers.constants.AddressZero,
              tokenId: 6
            },
          ]
        )
      ).to.be.revertedWithCustomError(saferoot, "ZeroAddress");
    });
  });

  describe("Initiate Safeguard", () => {
    let key: string, key2: string, key3: string;
    beforeEach(async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry1, safeEntry2, safeEntry3]);
      await addSafeguardTx.wait();

      key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC1155, 0);
      key2 = await saferoot.encodeKey(safeEntry2.contractAddress, TokenType.ERC1155, 1);
      key3 = await saferoot.encodeKey(safeEntry3.contractAddress, TokenType.ERC1155, 2);
    });

    it("executes a single safeguard transfer", async () => {
      // Approve the saferoot contract to transfer tokens from the user's address
      approveAll1155Contract(token, saferoot, user);

      // Get the balance of the user's address for token ID 0
      const balanceUser = await token.balanceOf(user.address, 0);
      // Initiate the safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);

      await initiateSafeguardTx.wait();

      // Get the balance of the backup address for token ID 0 after the safeguard initiation
      const balanceBackup = await token.balanceOf(backup.address, 0);

      // Get the new balance of the user's address for token ID 0 after the safeguard initiation
      const balanceUserNew = await token.balanceOf(user.address, 0);

      // Verify that the balance of the backup address is equal
      expect(balanceBackup).to.equal(balanceUser);

      // Verify that the new balance of the user's address is equal to the previous balance
      expect(balanceUserNew).to.equal(balanceUser.sub(5));
    });

    it("executes a multiple safeguard transfer", async () => {
      // Approve tokens
      approveAll1155Contract(token, saferoot, user);
      approveAll1155Contract(token2, saferoot, user);
      approveAll1155Contract(token3, saferoot, user);

      const keys = [key, key2, key3];
      const userBalanceBeforeTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const userBalance2BeforeTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      // Initiate safeguard transfer
      const initiateSafeguardTx = await saferoot.initiateSafeguard(keys);
      await initiateSafeguardTx.wait();
      // Get balances after safeguard initiated
      const backupBalanceAfterTransfer = await token.balanceOf(backup.address, safeEntry1.tokenId);
      const backupBalance2AfterTransfer = await token2.balanceOf(backup.address, safeEntry2.tokenId);
      const userBalanceAfterTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const userBalance2AfterTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      
      // Assertions

      // Check backup balances are equal to user balances before transfer
      expect(backupBalanceAfterTransfer).to.equal(userBalanceBeforeTransfer);
      expect(backupBalance2AfterTransfer).to.equal(userBalance2BeforeTransfer);

      // Check user balances are equal to user balances before transfer minus the amount transferred
      expect(userBalanceAfterTransfer).to.equal(userBalanceBeforeTransfer.sub(5));
      expect(userBalance2AfterTransfer).to.equal(userBalance2BeforeTransfer.sub(10));
    });

    it("executes a safeguard if owned assets are less than safeguard amount", async () => {
      // Approve token contracts for user
      approveAll1155Contract(token, saferoot, user);
      approveAll1155Contract(token2, saferoot, user);
      // Transfer assets from user to hacker
      const userBalance2BeforeTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      await token2.safeTransferFrom(user.address, hacker.address, safeEntry2.tokenId, 8, "0x");
      // Get user's balance before transfer
      const userBalanceBeforeSafeguardTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const userBalance2BeforeSafeguardTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      // Initiate safeguard transfer
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();
      // Get balances after transfer
      const backupBalanceAfterSafeguardTransfer = await token.balanceOf(backup.address, safeEntry1.tokenId);
      const backupBalance2AfterSafeguardTransfer = await token2.balanceOf(backup.address, safeEntry2.tokenId);
      const userBalanceAfterSafeguardTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const userBalance2AfterSafeguardTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      
      // User balances should have transitioned over to the backup address
      expect(userBalanceBeforeSafeguardTransfer).to.equal(5);
      expect(userBalanceAfterSafeguardTransfer).to.equal(0);
      expect(backupBalanceAfterSafeguardTransfer).to.equal(5);
      
      // Backup balances should be equal to user balances before transfer
      expect(backupBalance2AfterSafeguardTransfer).to.equal(userBalance2BeforeSafeguardTransfer);
      expect(userBalance2AfterSafeguardTransfer).to.equal(0);
    });

    it("executes a safeguard if user no longer owns nft", async () => {
      // Approve token contracts for user
      approveAll1155Contract(token, saferoot, user);
      approveAll1155Contract(token2, saferoot, user);
      // Transfer assets from user to another wallet
      await token.safeTransferFrom(user.address, hacker.address, 0, 5, "0x");
      // Get user's balance before safeguard
      const userBalanceBeforeSafeguardTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const hackerBalanceBeforeSafeguardTransfer = await token.balanceOf(hacker.address, safeEntry1.tokenId);
      const userBalance2BeforeSafeguardTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);
      // Initiate safeguard transfer
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();
      // Get user balances after safeguard
      const userBalanceAfterSafeguardTransfer = await token.balanceOf(user.address, safeEntry1.tokenId);
      const userBalance2AfterSafeguardTransfer = await token2.balanceOf(user.address, safeEntry2.tokenId);

      // Get balances after safeguard
      const backupBalanceAfterSafeguardTransfer = await token.balanceOf(backup.address, safeEntry2.tokenId);
      const backupBalance2AfterSafeguardTransfer = await token2.balanceOf(backup.address, safeEntry2.tokenId);

      
      // If the user no longer owns the assets, the balance of the backup address should be equal to the user's balance before the safeguard
      expect(userBalanceBeforeSafeguardTransfer).to.equal(0);
      expect(userBalanceAfterSafeguardTransfer).to.equal(0);
      expect(backupBalanceAfterSafeguardTransfer).to.equal(0);
      expect(hackerBalanceBeforeSafeguardTransfer).to.equal(5);

      expect(userBalance2AfterSafeguardTransfer).to.equal(userBalance2BeforeSafeguardTransfer.sub(10));
      expect(backupBalance2AfterSafeguardTransfer).to.equal(userBalance2BeforeSafeguardTransfer);

    });

    it("skip a safeguard transfer if no approval at all", async () => {
      // Approve the token
      approveAll1155Contract(token, saferoot, user);

      // Get the balances
      const balance = await token.balanceOf(user.address, 0);
      const balance2 = await token2.balanceOf(user.address, 3);

      // Initiate a safeguard transfer
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();

      // Get the balances after safeguard
      const balanceBackup = await token.balanceOf(backup.address, 0);
      const balanceBackup2 = await token2.balanceOf(backup.address, 3);
      const balanceNew = await token.balanceOf(user.address, 0);
      const balanceNew2 = await token2.balanceOf(user.address, 3);

      // Assert balances
      expect(balanceBackup).to.equal(balance);
      expect(balanceNew).to.equal(balance.sub(5));
      expect(balanceBackup2).to.equal(0);
      expect(balanceNew2).to.equal(balance2.sub(0));
    });
  });
});
