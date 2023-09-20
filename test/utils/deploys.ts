import { ethers } from "hardhat";
import { getAccounts } from "./getAccounts";

export const deployTest20 = async () => {
  const accounts = await getAccounts();
  const user = accounts.user;
  const initialSupplyMok = ethers.utils.parseEther("10000000");

  // ERC20 Deployment
  const MokToken = await ethers.getContractFactory("MokToken");
  const tokenContract = await MokToken.connect(user).deploy(initialSupplyMok);

  const mokToken = MokToken.attach(tokenContract.address).connect(user);
  // send tokens to everyone
  await mokToken.transfer(
    accounts.service.address,
    ethers.utils.parseEther("5000")
  );
  await mokToken.transfer(
    accounts.hacker.address,
    ethers.utils.parseEther("5000")
  );

  // connect main account that will test token in fixtures
  return mokToken.connect(user);
};

export const deployTest721 = async () => {
  const accounts = await getAccounts();
  const user = accounts.user;

  // ERC721 Deployment
  const MokToken721 = await ethers.getContractFactory("MokERC721");
  const mok721 = await MokToken721.connect(user).deploy();

  // connect main account that will test token in fixtures
  return mok721.connect(user);
};

export const deployTest1155 = async () => {
  const accounts = await getAccounts();
  const user = accounts.user;

  // ERC115 Deployment
  const MokToken1155 = await ethers.getContractFactory("MokERC1155");
  const mok1155 = await MokToken1155.connect(user).deploy();

  // connect main account that will test token in fixtures
  return mok1155.connect(user);
};

export const deployedFixture = async () => {
  // get accounts
  const { user, backup, service, hacker, treasury } =
    await getAccounts();

  const token = await deployTest20();
  const token2 = await deployTest20();
  const token3 = await deployTest20();
  const token721 = await deployTest721();
  const tokenTwo721 = await deployTest721();
  const tokenThree721 = await deployTest721();
  const token1155 = await deployTest1155();
  const tokenTwo1155 = await deployTest1155();
  const tokenThree1155 = await deployTest1155();
  const SaferootFactory = await ethers.getContractFactory("SaferootFactory");
  const saferootFactory = await SaferootFactory.deploy();
  const Saferoot = await ethers.getContractFactory("Saferoot");
  let deployed = await (
    await saferootFactory
      .connect(user)
      .createSaferoot(
        service.address,
        backup.address
      )
  ).wait();
  // console.log(deployed.events);
  const deployedEvent = deployed.events?.filter(
    (e) => e.event === "SaferootDeployed"
  );
  let saferootAddress;
  if (deployedEvent && deployedEvent[0].args) {
    saferootAddress = deployedEvent[0].args[0];
  }
  const saferoot = Saferoot.attach(saferootAddress).connect(service);

  return {
    saferoot,
    saferootFactory,
    token,
    token2,
    token3,
    token721,
    tokenTwo721,
    tokenThree721,
    token1155,
    tokenTwo1155,
    tokenThree1155,
    user,
    backup,
    service,
    hacker,
    treasury,
  };
};
