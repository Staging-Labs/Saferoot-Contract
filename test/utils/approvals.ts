import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

export const approveTokenContract = async (
    token: any,
    spender: any,
    signer: SignerWithAddress,
    amount: BigNumber
  ) => {
    const approveTx = await token
      .connect(signer)
      .approve(spender.address, amount);
    await approveTx.wait();
};

export const approve721Contract = async (
    token: any,
    spender: any,
    signer: SignerWithAddress,
    tokenId: BigNumber
  ) => {
    const approveTx = await token
      .connect(signer)
      .approve(spender.address, tokenId);
    await approveTx.wait();
};

export const approveAll1155Contract = async (
    token: any,
    spender: any,
    signer: SignerWithAddress
  ) => {
    const approveTx = await token
      .connect(signer)
      .setApprovalForAll(spender.address, true);
    await approveTx.wait();
};