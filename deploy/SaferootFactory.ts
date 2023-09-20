import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
// import networkConfig from '../helper-hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const { deployments, getNamedAccounts, network, ethers } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	// const chainId = network.config.chainId;
	const args: any[] = [];

	const saferootFactoryResult = await deploy('SaferootFactory', {
		from: deployer,
		args: args,
		log: true,
	});

	// Get address of implementation contract
	const SaferootFactory = await ethers.getContractFactory(
		"SaferootFactory"
	);
	const SaferootFactoryInstance = SaferootFactory.attach(
		saferootFactoryResult.address
	);
	const implementationAddress = await SaferootFactoryInstance.saferootImplementation();

	console.log(`SaferootFactory Contract deployed at: ${saferootFactoryResult.address}`);
	console.log(`Saferoot Implementation Contract deployed at: ${implementationAddress}`);
};

export default func;
func.tags = ['SaferootFactory'];