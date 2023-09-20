import { ethers } from "hardhat";

export const getAccounts = async () => {
  const [user, backup, backup2, service, hacker, treasury] =
    await ethers.getSigners();
  return {
    user,
    backup,
    backup2,
    service,
    hacker,
    treasury
  };
};