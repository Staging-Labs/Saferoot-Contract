import { ethers } from "hardhat";
import { expect } from "chai";
import { MokToken, MokERC1155, MokERC721, SaferootFactory, Saferoot as SaferootContract } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SafeEntryStruct } from "./utils/safeEntryStructs";
import { TokenType } from "./utils/tokenType";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployedFixture } from "./utils/deploys";

describe("SaferootFactory", () => {
  let factory: SaferootFactory;
  let user: SignerWithAddress,
    backup: SignerWithAddress,
    service: SignerWithAddress;
  let safeEntryERC20: SafeEntryStruct;
  let safeEntryERC721: SafeEntryStruct;
  let safeEntryERC1155: SafeEntryStruct;
  let invalidEntry1: SafeEntryStruct;
  let token20: MokToken;
  let token721: MokERC721;
  let token1155: MokERC1155;

  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    factory = fixture.saferootFactory;
    token20= fixture.token;
    token721 = fixture.token721;
    token1155 = fixture.token1155;
    user = fixture.user;
    backup = fixture.backup;
    service = fixture.service;

    safeEntryERC20 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: token20.address
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

    invalidEntry1 = {
      tokenType: TokenType.ERC20,
      tokenId: 0,
      contractAddress: "0xd79cffCAAE2a4DAfC2D322eB276bBDDdD0dC5150", // Random adress for testing
    };
  });

  describe("Creating Saferoot Contracts", () => {
    it("should deploy Saferoot contract without safeguards", async () => {
      const tx = await factory.connect(user).createSaferoot(service.address, backup.address);
      const receipt = await tx.wait();
      // Extract the address from the event args
      const createdSaferootAddress = receipt.events?.find(e => e.event === "SaferootDeployed")?.args?.contractAddress;
      expect(createdSaferootAddress).to.not.be.undefined;
      const saferoot = await ethers.getContractAt("Saferoot", createdSaferootAddress) as SaferootContract;

      const addresses = await saferoot.addresses();
      const contractServiceAddress = addresses.service;
      const contractBackupAddress = addresses.backup;
      const contractUserAddress = addresses.user;

      expect(contractServiceAddress).to.equal(service.address);
      expect(contractUserAddress).to.equal(user.address);
      expect(contractBackupAddress).to.equal(backup.address);
    });

    it("reverts if service is address 0 when deploying Saferoot contract without safeguards", async () => {
      await expect(factory.connect(user).createSaferoot(ethers.constants.AddressZero, backup.address)).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("reverts if backup is address 0 when deploying Saferoot contract without safeguards", async () => {
      await expect(factory.connect(user).createSaferoot(service.address, ethers.constants.AddressZero)).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("should deploy Saferoot contract with safeguards", async () => {
      const tx = await factory.connect(user).createSaferootWithSafeguards(
        service.address,
        backup.address,
        [safeEntryERC20, safeEntryERC721, safeEntryERC1155]
      );

      const receipt = await tx.wait();
      // Extract the address from the event args
      const createdSaferootAddress = receipt.events?.find(e => e.event === "SaferootDeployed")?.args?.contractAddress;
      expect(createdSaferootAddress).to.not.be.undefined;
      const saferoot = await ethers.getContractAt("Saferoot", createdSaferootAddress) as SaferootContract;
        
      const addresses = await saferoot.addresses();
      const contractServiceAddress = addresses.service;
      const contractBackupAddress = addresses.backup;
      const contractUserAddress = addresses.user;

      expect(contractServiceAddress).to.equal(service.address);
      expect(contractUserAddress).to.equal(user.address);
      expect(contractBackupAddress).to.equal(backup.address); 
    });

    it("reverts if safeguard asset address is not a contract", async () => {
      // Expect a revert (InvalidContractAddress)
      await expect(factory.connect(user).createSaferootWithSafeguards(
        service.address,
        backup.address,
        [invalidEntry1]
      )).to.be.revertedWithCustomError(factory, "InvalidContractAddress");
    });

    it("reverts if service is address 0 when deploying Saferoot contract with safeguards", async () => {
      await expect(factory.connect(user).createSaferootWithSafeguards(ethers.constants.AddressZero, backup.address, [safeEntryERC20])).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it ("reverts if backup is address 0 when deploying Saferoot contract with safeguards", async () => {
      await expect(factory.connect(user).createSaferootWithSafeguards(service.address, ethers.constants.AddressZero, [safeEntryERC20])).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
    });
});
