import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import { Saferoot, MokToken, MokERC721, MokERC1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployedFixture } from "./utils/deploys";
import { TokenType } from "./utils/tokenType";

describe("Saferoot User Methods", () => {
  let saferoot: Saferoot;
  let token: MokToken;
  let token2: MokToken;
  let token721: MokERC721;
  let token1155: MokERC1155;
  let user: SignerWithAddress, hacker: SignerWithAddress;
  beforeEach(async () => {
    const fixture = await loadFixture(deployedFixture);
    saferoot = fixture.saferoot;
    token = fixture.token;
    token2 = fixture.token2;
    token721 = fixture.token721;
    token1155 = fixture.token1155;
    user = fixture.user;
    hacker = fixture.hacker;
  });

  it("sets backup wallet", async () => {
    const setBackupWalletTx = await saferoot
      .connect(user)
      .setBackupWallet(user.address);
    await setBackupWalletTx.wait();

    const addresses = await saferoot.addresses();
    const contractBackupAddress = addresses.backup;

    expect(contractBackupAddress).to.equal(user.address);
  });

  it("reverts setting backup wallet to address 0", async () => {
    await expect(
      saferoot.connect(user).setBackupWallet(ethers.constants.AddressZero)
    ).to.be.revertedWithCustomError(saferoot, "ZeroAddress");
  });

  it("reverts adding a safeguard as a non user account", async () => {
    await expect(
      saferoot.connect(hacker).addSafeguard(
        [
          {
            tokenType: TokenType.ERC20,
            tokenId: 0,
            contractAddress: token.address
          },
        ],
      )
    ).to.be.revertedWithCustomError(saferoot, "NotUser");
  });

  it("reverts setting backup wallet as a non user", async () => {
    await expect(
      saferoot.connect(hacker).setBackupWallet(hacker.address)
    ).to.be.revertedWithCustomError(saferoot, "NotUser");
  });
});
