import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-toolbox";
import { Saferoot, MokToken, MokERC721, MokERC1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployedFixture } from "./utils/deploys";
import { TokenType } from "./utils/tokenType";
import { BigNumber } from "ethers";

const randomAddress = "0x79667Ad7670eA507d691bB69E0f863B31ff6ca87";

describe("Saferoot Admin Methods", () => {
    let saferoot: Saferoot;
    let token: MokToken;
    let token721: MokERC721;
    let token1155: MokERC1155;
    let service: SignerWithAddress,
      hacker: SignerWithAddress,
      treasury: SignerWithAddress;
    beforeEach(async () => {
      const fixture = await loadFixture(deployedFixture);
      saferoot = fixture.saferoot;
      token = fixture.token;
      token721 = fixture.token721;
      token1155 = fixture.token1155;
      service = fixture.service;
      hacker = fixture.hacker;
      treasury = fixture.treasury;
    });

    it("skips initiate safeguard on a bad ERC-20 address", async () => {
      const key = await saferoot.encodeKey(randomAddress, TokenType.ERC20, 0);
      const initiateSafeguardTX = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTX.wait();
      // No revert should happen
      expect(initiateSafeguardTX).to.not.be.reverted;
    });

    it("skips initiate safeguard on a bad ERC-721 address", async () => {
      const key = await saferoot.encodeKey(randomAddress, TokenType.ERC721, 0);
      const initiateSafeguardTX = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTX.wait();
      // No revert should happen
      expect(initiateSafeguardTX).to.not.be.reverted;
    });

    it("skips initiate safeguard on a bad ERC-1155 address", async () => {
      const key = await saferoot.encodeKey(randomAddress, TokenType.ERC1155, 0);
      const initiateSafeguardTX = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTX.wait();
      // No revert should happen
      expect(initiateSafeguardTX).to.not.be.reverted;
    });      

    it("skips initiate safeguard on a bad token type", async () => {
      const key = await saferoot.encodeKey(token.address, TokenType.BAD, 0);
      const initiateSafeguardTX = await saferoot.initiateSafeguard([key]);
      await initiateSafeguardTX.wait();
      // No revert should happen
      expect(initiateSafeguardTX).to.not.be.reverted;
    });

    it("reverts initiate safeguard as a non-service account", async () => {
      await expect(
        saferoot
          .connect(hacker)
          .initiateSafeguard([await saferoot.encodeKey(token.address, TokenType.ERC20, 0)])
      ).to.be.revertedWithCustomError(saferoot, "NotService");
    });
});
