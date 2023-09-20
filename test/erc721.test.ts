import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import { Saferoot, MokERC721 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { deployedFixture } from "./utils/deploys";
import { approve721Contract } from "./utils/approvals";
import { TokenType } from "./utils/tokenType";
import { SafeEntryStruct } from "./utils/safeEntryStructs";

describe("ERC721 Safeguards", () => {
  let saferoot: Saferoot;
  let token: MokERC721, token2: MokERC721, token3: MokERC721;
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
    token = fixture.token721;
    token2 = fixture.tokenTwo721;
    token3 = fixture.tokenThree721;
    user = fixture.user;
    backup = fixture.backup;
    service = fixture.service;
    hacker = fixture.hacker;

    // mint ERC721
    const mint721Tx = await token.connect(user).mint(user.address, "");
    await mint721Tx.wait();
    const mint721Tx2 = await token2.connect(user).mint(user.address, "");
    await mint721Tx2.wait();
    const mint721Tx3 = await token3.connect(user).mint(user.address, "");
    await mint721Tx3.wait();

    safeEntry1 = {
      tokenType: TokenType.ERC721,
      contractAddress: token.address,
      tokenId: 0,
    };
    safeEntry2 = {
      tokenType: TokenType.ERC721,
      contractAddress: token2.address,
      tokenId: 1,
    };
    safeEntry3 = {
      tokenType: TokenType.ERC721,
      contractAddress: token3.address,
      tokenId: 0,
    };
  });
  describe("Add Safeguard", () => {
    it("adds a single safeguard", async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry1]);
      const receipt = await addSafeguardTx.wait();

      const key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC721, 0);
      expect((await saferoot.keyToTokenIDMapping(key))).to.equal(
        safeEntry1.tokenId
      );
      // Assert that key has been generated and evented
      const event = receipt.events?.find(e => e.event === "ERC721SafeguardAdded");
      expect(event).to.not.be.undefined;
      // Validate the args if the event is found
      if (event && event.args) {
        expect(event.args[0]).to.equal(key);  // Assuming the first argument of the event is the encoded key
      } else {
        throw new Error("Expected ERC721SafeguardAdded event not found or event arguments are missing");
      }
    });

    it("adds multiple safeguards", async () => {
      const safeguardEntries = [safeEntry1, safeEntry2, safeEntry3];
      // Add multiple safeguard entries
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard(safeguardEntries);
      const receipt = await addSafeguardTx.wait();

      // Filter all events with the name "ERC721SafeguardAdded"
      const events = receipt.events?.filter(e => e.event === "ERC721SafeguardAdded") || [];
      expect(events.length).to.equal(safeguardEntries.length);  // There should be as many events as there are entries

      // Verify each safeguard entry
      for (let i = 0; i < safeguardEntries.length; i++) {
        const safeguardEntry = safeguardEntries[i];
        // Encode the key for the safeguard entry
        const key = await saferoot.encodeKey(safeguardEntry.contractAddress, TokenType.ERC721, i);

        // Verify that the key has been generated and stored
        expect((await saferoot.keyToTokenIDMapping(key))).to.equal(
          safeguardEntry.tokenId
        );

        const currentEvent = events[i];
        expect(currentEvent, `Expected ERC721SafeguardAdded event for entry ${i} not found`).to.exist;

        // Check if args exists on the currentEvent and that there is at least one argument
        if (currentEvent && currentEvent.args && currentEvent.args.length > 0) {
          expect(currentEvent.args[0], `Event argument for entry ${i} does not match`).to.equal(key);
        } else {
          throw new Error(`Expected ERC721SafeguardAdded event arguments for entry ${i} are missing`);
        }
      }
    });

    it("reverts on safeguard entry with zero address", async () => {
      await expect(
        saferoot.connect(user).addSafeguard(
          [
            {
              tokenType: TokenType.ERC721,
              contractAddress: ethers.constants.AddressZero,
              tokenId: 6,
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

      key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC721, 0);
      key2 = await saferoot.encodeKey(safeEntry2.contractAddress, TokenType.ERC721, 1);
      key3 = await saferoot.encodeKey(safeEntry3.contractAddress, TokenType.ERC721, 2);
    });

    it("executes a single safeguard transfer", async () => {
      // Approve token
      approve721Contract(token, saferoot, user, BigNumber.from(safeEntry1.tokenId));
      // Get balance
      const balanceUser = await token.balanceOf(user.address);
      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      // Get balances after
      const balanceBackup = await token.balanceOf(backup.address);
      const balanceUserNew = await token.balanceOf(user.address);
      // Verify assertions
      expect(balanceBackup).to.equal(1);
      expect(balanceUserNew).to.equal(balanceUser.sub(1));
    });

    it("executes a multiple safeguard transfer", async () => {
      // Approve tokens
      approve721Contract(token, saferoot, user, BigNumber.from(safeEntry1.tokenId));
      approve721Contract(token2, saferoot, user, BigNumber.from(safeEntry2.tokenId));
      approve721Contract(token3, saferoot, user, BigNumber.from(safeEntry3.tokenId));
      // Get balances
      const userBalanceBeforeTransfer = await token.balanceOf(user.address);
      const userBalance2BeforeTransfer = await token2.balanceOf(user.address);
      // Initiate safeguards
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();
      // Get balances
      const balanceBackupAfterTransfer = await token.balanceOf(backup.address);
      const balanceBackup2AfterTransfer = await token2.balanceOf(backup.address);
      const userBalanceAfterTransfer = await token.balanceOf(user.address);
      const userBalance2AfterTransfer = await token2.balanceOf(user.address);
      // Verify assertions
      expect(balanceBackupAfterTransfer).to.equal(1);
      expect(balanceBackup2AfterTransfer).to.equal(1);
      expect(userBalanceAfterTransfer).to.equal(userBalanceBeforeTransfer.sub(1));
      expect(userBalance2AfterTransfer).to.equal(userBalance2BeforeTransfer.sub(1));
    });

    it("executes a safeguard if user no longer owns nft", async () => {
      // Approve tokens
      approve721Contract(token, saferoot, user, BigNumber.from(safeEntry1.tokenId));
      approve721Contract(token2, saferoot, user, BigNumber.from(safeEntry2.tokenId));
      approve721Contract(token3, saferoot, user, BigNumber.from(safeEntry3.tokenId));

      // Transfer token1 NFT to another user
      const userBalanceBeforeUserTransfer = await token.balanceOf(user.address);
      const tx = await token.transferFrom(user.address, hacker.address, safeEntry1.tokenId);
      await tx.wait();

      // Get balances
      const userBalanceBeforeSafeguardTransfer = await token.balanceOf(user.address);
      const userBalance2BeforeSafeguardTransfer = await token2.balanceOf(user.address);
      const userBalance3BeforeSafeguardTransfer = await token3.balanceOf(user.address);
      // Initiate safeguards
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();
      // Get user balances after
      const userBalanceAfterSafeguardTransfer = await token.balanceOf(user.address);
      const userBalance2AfterSafeguardTransfer = await token2.balanceOf(user.address);
      const userBalance3AfterSafeguardTransfer = await token3.balanceOf(user.address);

      // Get backup balances after
      const backupBalanceAfterSafeguardTransfer = await token.balanceOf(backup.address);
      const balanceBackup2AfterSafeguardTransfer = await token2.balanceOf(backup.address);
      const balanceBackup3AfterSafeguardTransfer = await token3.balanceOf(backup.address);

      // Verify assertions about no longer owned token

      // 
      // TOKEN 1
      //
      // If the user no longer owns the token, the safeguard transfer should not occur
      expect(userBalanceAfterSafeguardTransfer).to.equal(userBalanceBeforeUserTransfer.sub(1));
      // The backup should not receive the token
      expect(backupBalanceAfterSafeguardTransfer).to.equal(0);
      // The hacker should now own the token
      expect(hacker.address).to.equal(await token.ownerOf(safeEntry1.tokenId));

      //
      // TOKEN 2
      //
      // If the user still owns the token, the safeguard transfer should occur
      expect(balanceBackup2AfterSafeguardTransfer).to.equal(1);
      // The user should no longer own the token
      expect(userBalance2AfterSafeguardTransfer).to.equal(userBalance2BeforeSafeguardTransfer.sub(1));

      //
      // TOKEN 3
      //
      // If the user still owns the token, the safeguard transfer should occur
      expect(balanceBackup3AfterSafeguardTransfer).to.equal(1);
      // The user should no longer own the token
      expect(userBalance3AfterSafeguardTransfer).to.equal(userBalance3BeforeSafeguardTransfer.sub(1));

    });

    it("skip a safeguard transfer if no approval at all", async () => {
      // Approve tokens
      approve721Contract(token, saferoot, user, BigNumber.from(safeEntry1.tokenId));
      approve721Contract(token2, saferoot, user, BigNumber.from(safeEntry2.tokenId));
      // Missing approval is for token3!
      // -> approve721Contract(token3, saferoot, user, BigNumber.from(safeEntry3.tokenId));
      // Get balances
      const userBalanceBeforeTransfer = await token.balanceOf(user.address);
      const userBalance2BeforeTransfer = await token2.balanceOf(user.address);
      const userBalance3BeforeTransfer = await token3.balanceOf(user.address);
      // Initiate safeguards
      const initiateSafeguardTx = await saferoot.initiateSafeguard([
        key,
        key2,
        key3,
      ]);
      await initiateSafeguardTx.wait();
      // Get balances after
      const backupBalanceAfterTransfer = await token.balanceOf(backup.address);
      const balanceBackup2AfterTransfer = await token2.balanceOf(backup.address);
      const balanceBackup3AfterSafeguardTransfer = await token3.balanceOf(backup.address);
      const userBalanceAfterTransfer = await token.balanceOf(user.address);
      const userBalance2AfterTransfer = await token2.balanceOf(user.address);
      const userBalance3AfterTransfer = await token3.balanceOf(user.address);
      
      // Verify assertions
      
      // 
      // TOKEN 1
      //
      // If the user still owns the token, the safeguard transfer should occur
      expect(backupBalanceAfterTransfer).to.equal(1);
      // The user should no longer own the token
      expect(userBalanceAfterTransfer).to.equal(userBalanceBeforeTransfer.sub(1));

      //
      // TOKEN 2
      //
      // If the user still owns the token, the safeguard transfer should occur
      expect(balanceBackup2AfterTransfer).to.equal(1);
      // The user should no longer own the token
      expect(userBalance2AfterTransfer).to.equal(userBalance2BeforeTransfer.sub(1));

      // 
      // TOKEN 3
      //
      // If the user does not own the token, the safeguard transfer should not occur
      expect(userBalance3AfterTransfer).to.equal(userBalance3BeforeTransfer);

      // The backup should not receive the token
      expect(balanceBackup3AfterSafeguardTransfer).to.equal(0);
    });
  });

  describe("withdrawERC721 function", () => {

    beforeEach(async () => {
        // Assuming token is an instance of the ERC721 token you're working with
        // Transfer a token to the Saferoot contract to prepare for withdrawal test
        await token.connect(user).approve(saferoot.address, safeEntry1.tokenId);
        await token.connect(user).transferFrom(user.address, saferoot.address, safeEntry1.tokenId);
    });

    it("allows user to withdraw an ERC721 token owned by the contract", async () => {
        const initialContractBalance = await token.balanceOf(saferoot.address);
        const initialUserBalance = await token.balanceOf(user.address);

        // Execute withdrawal
        await saferoot.connect(user).withdrawERC721(token.address, safeEntry1.tokenId);

        const finalContractBalance = await token.balanceOf(saferoot.address);
        const finalUserBalance = await token.balanceOf(user.address);

        expect(initialContractBalance).to.equal(1);
        expect(finalContractBalance).to.equal(0);
        expect(finalUserBalance).to.equal(initialUserBalance.add(1));
    });

    it("reverts if trying to withdraw a token not owned by the contract", async () => {
        await expect(
            saferoot.connect(user).withdrawERC721(token.address, 100)
        ).to.be.revertedWith("ERC721: invalid token ID"); // Assuming the ERC721 token reverts with this message
    });

    it("reverts if an unauthorized address tries to withdraw", async () => {
        await expect(
            saferoot.connect(hacker).withdrawERC721(token.address, safeEntry1.tokenId)
        ).to.be.reverted; // Assuming the onlyUser modifier reverts without a specific message
    });
  });
});
