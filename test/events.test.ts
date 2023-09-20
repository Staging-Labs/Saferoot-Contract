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
import { getAccounts } from "./utils/getAccounts";
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

describe("Emit Events", () => {
  let saferoot: Saferoot;
  let token: MokToken;
  let token721: MokERC721;
  let token1155: MokERC1155;
  let user: SignerWithAddress,
    backup: SignerWithAddress,
    service: SignerWithAddress,
    hacker: SignerWithAddress,
    treasury: SignerWithAddress;
  let safeEntryERC20: SafeEntryStruct,
    safeEntryERC721: SafeEntryStruct,
    safeEntryERC1155: SafeEntryStruct;
  let key: string, key2: string, key3: string;

  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    saferoot = fixture.saferoot;
    token = fixture.token;
    token721 = fixture.token721;
    token1155 = fixture.token1155;
    user = fixture.user;
    backup = fixture.backup;
    service = fixture.service;
    hacker = fixture.hacker;
    treasury = fixture.treasury;

    // approve tokens
    approveTokenContract(token, saferoot, user, ethers.constants.MaxUint256);

    safeEntryERC20 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token.address,
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

    const addSafeguardTx = await saferoot
      .connect(user)
      .addSafeguard([safeEntryERC20, safeEntryERC721, safeEntryERC1155]);
    await addSafeguardTx.wait();

    key = await saferoot.encodeKey(safeEntryERC20.contractAddress, TokenType.ERC20, 0);
    key2 = await saferoot.encodeKey(safeEntryERC721.contractAddress, TokenType.ERC721, 1);
    key3 = await saferoot.encodeKey(safeEntryERC1155.contractAddress, TokenType.ERC1155, 2);
  });

  describe("Deployment Events", () => {
    it("emits event on deploying Saferoot", async () => {
      const { user, backup, service } = await getAccounts();

      const SaferootFactory = await ethers.getContractFactory(
        "SaferootFactory"
      );
      const saferootFactory = await SaferootFactory.deploy();
      const Saferoot = await ethers.getContractFactory("Saferoot");

      let deployedTx = await (
        await saferootFactory
          .connect(user)
          .createSaferoot(
            service.address,
            backup.address
          )
      ).wait();

      expect(deployedTx.events?.filter((e) => e.event === "SaferootDeployed"));
    });
  });

  describe("Safeguard Events", () => {
    it("emits on add a ERC20 safeguard", async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntryERC20]);
      await addSafeguardTx.wait();
      await expect(addSafeguardTx).to.emit(saferoot, "ERC20SafeguardAdded");
    });
    it("emits on add a ERC721 safeguard", async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntryERC721]);
      await addSafeguardTx.wait();
      await expect(addSafeguardTx).to.emit(saferoot, "ERC721SafeguardAdded");
    });
    it("emits on add a ERC1155 safeguard", async () => {
      const addSafeguardTx = await saferoot
        .connect(user)
        .addSafeguard([safeEntryERC1155]);
      await addSafeguardTx.wait();
      await expect(addSafeguardTx).to.emit(saferoot, "ERC1155SafeguardAdded");
    });
    it("emits on initiate a safeguard", async () => {
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();

      await expect(initiateSafeguardTx)
        .to.emit(saferoot, "SafeguardInitiated")
        .withArgs(key);
    });

    it("emits TransferSkip on executing ERC20 safeguard", async () => {
      approveTokenContract(token, saferoot, user, ethers.BigNumber.from(0));
      const balanceUser = await token.balanceOf(user.address);
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTx.wait();

      const balanceBackup = await token.balanceOf(backup.address);
      const balanceUserNew = await token.balanceOf(user.address);

      expect(balanceBackup).to.equal(0);
      expect(balanceUserNew).to.equal(balanceUser);
      await expect(initiateSafeguardTx)
        .to.emit(saferoot, "TransferSkip")
        .withArgs(key, TokenType.ERC20);
    });
    it("emits TransferSkip on add a ERC721 safeguard", async () => {
      approve721Contract(token, saferoot, user, ethers.BigNumber.from(0));
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key2]);
      await initiateSafeguardTx.wait();

      await expect(initiateSafeguardTx)
        .to.emit(saferoot, "TransferSkip")
        .withArgs(key2, TokenType.ERC721);
    });
    it("emits TransferSkip on add a ERC1155 safeguard", async () => {
      approveAll1155Contract(token, saferoot, user);
      const initiateSafeguardTx = await saferoot.initiateSafeguard([key3]);
      await initiateSafeguardTx.wait();

      await expect(initiateSafeguardTx)
        .to.emit(saferoot, "TransferSkip")
        .withArgs(key3, TokenType.ERC1155);
    });
  });

  describe("User Events", () => {
    it("emit event on setting backup wallet", async () => {
      const setBackupWalletTx = await saferoot
        .connect(user)
        .setBackupWallet(user.address);
      await expect(setBackupWalletTx)
        .to.emit(saferoot, "BackupUpdated")
        .withArgs(user.address);
    });
  });
});
