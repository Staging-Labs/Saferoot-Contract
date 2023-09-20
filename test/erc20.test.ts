import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import { Saferoot, MokToken } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployedFixture } from "./utils/deploys";
import { approveTokenContract } from "./utils/approvals";
import { TokenType } from "./utils/tokenType";
import { SafeEntryStruct } from "./utils/safeEntryStructs";

describe("ERC20 Safeguards", () => {
  let saferoot: Saferoot;
  let token: MokToken,
    token2: MokToken,
    token3: MokToken;
  let user: SignerWithAddress,
    backup: SignerWithAddress,
    service: SignerWithAddress,
    hacker: SignerWithAddress,
    treasury: SignerWithAddress;
  let safeEntry1: SafeEntryStruct,
    safeEntry2: SafeEntryStruct,
    safeEntry3: SafeEntryStruct;

  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    saferoot = fixture.saferoot;
    token = fixture.token;
    token2 = fixture.token2;
    token3 = fixture.token3;
    user = fixture.user;
    backup = fixture.backup;
    service = fixture.service;
    hacker = fixture.hacker;
    treasury = fixture.treasury;

    // approve tokens
    await approveTokenContract(
      token,
      saferoot,
      user,
      ethers.constants.MaxUint256
    );
    await approveTokenContract(
      token2,
      saferoot,
      user,
      ethers.constants.MaxUint256
    );
    safeEntry1 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token.address,
    };
    safeEntry2 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token2.address,
    };
    safeEntry3 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token3.address,
    };
  });

  // The counter paradigm in our key is to distinguish among different tokenIDs for ERC-721 and ERC-1155 only.
  const STATIC_ERC20_COUNTER = 0;

  describe("Add Safeguard", () => {
    it("adds a single safeguard", async () => {
      // Add a safeguard entry with the specified parameters
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry1]);
      const receipt = await addSafeguardTx.wait();

      // Encode the key for the safeguard entry
      const key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC20, STATIC_ERC20_COUNTER);
      // Assert that key has been generated and evented
      const event = receipt.events?.find(e => e.event === "ERC20SafeguardAdded");
      expect(event).to.not.be.undefined;
      // Validate the args if the event is found
      if (event && event.args) {
        expect(event.args[0]).to.equal(key);  // Assuming the first argument of the event is the encoded key
      } else {
        throw new Error("Expected ERC20SafeguardAdded event not found or event arguments are missing");
      }
    });

    it("adds multiple safeguards", async () => {
      const safeguardEntries = [safeEntry1, safeEntry2, safeEntry3];
      // Add multiple safeguard entries
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard(safeguardEntries);
      const receipt = await addSafeguardTx.wait();

      // Filter all events with the name "ERC20SafeguardAdded"
      const events = receipt.events?.filter(e => e.event === "ERC20SafeguardAdded") || [];
      expect(events.length).to.equal(safeguardEntries.length);  // There should be as many events as there are entries

      // Verify each safeguard entry
      for (let i = 0; i < safeguardEntries.length; i++) {
        const safeguardEntry = safeguardEntries[i];
        // Encode the key with a static 0 counter (since we are not using NFTs or 1155s))
        const key = await saferoot.encodeKey(safeguardEntry.contractAddress, safeguardEntry.tokenType, STATIC_ERC20_COUNTER);

        const currentEvent = events[i];
        expect(currentEvent, `Expected ERC20SafeguardAdded event for entry ${i} not found`).to.exist;

        // Check if args exists on the currentEvent and that there is at least one argument
        if (currentEvent && currentEvent.args && currentEvent.args.length > 0) {
          expect(currentEvent.args[0], `Event argument for entry ${i} does not match`).to.equal(key);
        } else {
          throw new Error(`Expected ERC20SafeguardAdded event arguments for entry ${i} are missing`);
        }
      }
    });

    it("reverts on safeguard entry with zero address", async () => {
      await expect(
        saferoot
          .connect(user)
          .addSafeguard(
            [{ contractAddress: ethers.constants.AddressZero, tokenType: TokenType.ERC20, tokenId: 0 }],
          )
      ).to.be.revertedWithCustomError(saferoot, "ZeroAddress");
    });

    it("reverts on safeguard entry with token id > 0", async () => {
      const invalidTokenID = 1;
      await expect(
        saferoot
          .connect(user)
          .addSafeguard(
            [{ contractAddress: token.address, tokenType: TokenType.ERC20, tokenId: invalidTokenID }],
          )
      ).to.be.revertedWithCustomError(saferoot, "InvalidTokenID");
    }); 
  });

  describe("Initiate Safeguard", () => {
    let key: string;
    beforeEach(async () => {
      // Add a single safeguard
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry1]);
      await addSafeguardTx.wait();

      key = await saferoot.encodeKey(safeEntry1.contractAddress, TokenType.ERC20, STATIC_ERC20_COUNTER);
    });

    it("executes a single safeguard transfer", async () => {
      // Approve the token
      approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);
      // Get the balance of the user before
      const userBalanceBefore = await token.balanceOf(user.address);
      // Initiate the safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      // Get the balances after
      const backupBalanceAfter = await token.balanceOf(backup.address);
      const userBalanceAfter = await token.balanceOf(user.address);
      // Verify the balances are updated correctly
      expect(backupBalanceAfter).to.equal(userBalanceBefore);
      expect(userBalanceAfter).to.equal(userBalanceBefore.sub(backupBalanceAfter));
    });

    it("executes a multiple safeguard transfer", async () => {
      // Add additional safeguards
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntry2, safeEntry3]);
      await addSafeguardTx.wait();
      // Approve tokens
      const tokens = [token, token2, token3];
      for (const token of tokens) {
        approveTokenContract(
          token,
          saferoot,
          user,
          ethers.constants.MaxUint256
        );
      }
      // Get the balances of the user
      const balancesUser = [];
      for (const token of tokens) {
        const balanceUser = await token.balanceOf(user.address);
        balancesUser.push(balanceUser);
      }
      // Encode keys for the safeguards
      const safeguards = [safeEntry1, safeEntry2, safeEntry3]
      const keys = [];
      for (let i = 0; i < tokens.length; i++) {
        const key = await saferoot.encodeKey(safeguards[i].contractAddress, TokenType.ERC20, STATIC_ERC20_COUNTER);
        keys.push(key);
      }
      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard(keys);
      await initiateSafeguardTx.wait();
      // Get the balances
      const balancesBackup = [];
      const balancesUserNew = [];
      for (const token of tokens) {
        const balanceBackup = await token.balanceOf(backup.address);
        balancesBackup.push(balanceBackup);
        const balanceUserNew = await token.balanceOf(user.address);
        balancesUserNew.push(balanceUserNew);
      }
      // Verify the balances are updated correctly
      for (let i = 0; i < tokens.length; i++) {
        const balanceBackup = balancesBackup[i];
        const balanceUser = balancesUser[i];
        const balanceUserNew = balancesUserNew[i];

        expect(balanceBackup).to.equal(balanceUser);
        expect(balanceUserNew).to.equal(balanceUser.sub(balanceBackup));
      }
    });

    it("executes a safeguard if token balance is less than safeguard threshold", async () => {
      // Approve token
      approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);
      // Get balance before
      const originalUserBalance = await token.balanceOf(user.address);
      // Transfer tokens to another user
      token.connect(user).transfer(hacker.address, originalUserBalance.sub(500));
      // Get new balance
      const changedUserBalance = await token.balanceOf(user.address);
      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      // Get balances after
      const backupBalanceAfter = await token.balanceOf(backup.address);
      const userBalanceAfter = await token.balanceOf(user.address);
      // Verify assertions
      expect(backupBalanceAfter).to.equal(changedUserBalance);
      expect(userBalanceAfter).to.equal(changedUserBalance.sub(backupBalanceAfter));
    });
  
    it("executes a safeguard if approval value is less than token balance", async () => {
      // Approve token
      approveTokenContract(token, saferoot, user, ethers.BigNumber.from(500));
      // Get balance
      const balanceUser = await token.balanceOf(user.address);
      // Get allowance
      const allowance = await token.allowance(user.address, saferoot.address);
      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      // Get balances after
      const balanceBackup = await token.balanceOf(backup.address);
      const balanceUserNew = await token.balanceOf(user.address);
      // Verify assertions
      expect(balanceUser).to.greaterThan(allowance);
      expect(balanceBackup).to.equal(allowance);
      expect(balanceUserNew).to.equal(balanceUser.sub(allowance));
    });

    it("skips a safeguard transfer if no approval at all", async () => {
      // Approve token
      approveTokenContract(token, saferoot, user, ethers.BigNumber.from(0));
      // Get balance before
      const balanceUser = await token.balanceOf(user.address);
      // Initiate safeguard
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();
      // Get balances after
      const balanceBackup = await token.balanceOf(backup.address);
      const balanceUserNew = await token.balanceOf(user.address);
      // Verify assertions
      expect(balanceBackup).to.equal(0);
      expect(balanceUserNew).to.equal(balanceUser);
    });
  });

  describe("ERC20 Withdraw Safeguards", () => {
    let saferoot: Saferoot;
    let token: MokToken;
    let user: SignerWithAddress,
        hacker: SignerWithAddress;
    let safeEntry: SafeEntryStruct;
  
    beforeEach(async () => {
      const fixture = await loadFixture(deployedFixture);
      saferoot = fixture.saferoot;
      token = fixture.token;
      user = fixture.user;
      hacker = fixture.hacker;
  
      // approve tokens
      await approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);
  
      safeEntry = {
        tokenType: TokenType.ERC20,
        tokenId: 0,
        contractAddress: token.address,
      };
    });
  
  describe("Withdraw Safeguard", () => {
    it("should allow legitimate user to withdraw", async () => {
      // Deposit some tokens to Saferoot for the user
      const depositAmount = ethers.utils.parseUnits("5", 18);
      await token.connect(user).transfer(saferoot.address, depositAmount);

      // Withdraw
      const initialBalance = await token.balanceOf(user.address);
      await saferoot.connect(user).withdrawERC20(token.address);
      const finalBalance = await token.balanceOf(user.address);

      expect(finalBalance.sub(initialBalance)).to.equal(depositAmount);
    });

    it("should prevent unauthorized withdrawal", async () => {
      // Hacker attempts to withdraw
      await expect(saferoot.connect(hacker).withdrawERC20(token.address))
        .to.be.revertedWithCustomError(saferoot, "NotUser");
    });
    });
  });
});