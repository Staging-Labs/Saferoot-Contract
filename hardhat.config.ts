import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config({ path: '.env.hardhat.variables' })

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    mainnet: {
      url: process.env.RPC_MAINNET_URL || "",
      accounts:
        process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1,
    },
    goerli: {
      url: process.env.RPC_GOERLI_URL || "",
      accounts:
        process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 5,
    },
    sepolia: {
      url: process.env.RPC_SEPOLIA_URL || "",
      accounts:
        process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  namedAccounts: {
    deployer: {
      hardhat: 0,
      mainnet: 0,
      goerli: 0,
      sepolia: 0,
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    gasPrice: 30,
    token: "ETH",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  }
};

export default config;
