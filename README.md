# SafeRoot Smart contracts

This project contains the following contracts:

1. Saferoot
2. SaferootFactory
3. ErrorReporter
   
Saferoot is designed to provide additional safety features for users of ERC-20, ERC-721, and ERC-1155 tokens. It manages the user's tokens and provides a backup mechanism in case of a mistake, hack, or scam.

To set up the environment run:

```shell
npm install
```

## Pre-requisites

If you wish to do any operations outside of the localized HardHat testnet, you will need to set up the appropriate environment variable at the root of your project.

Create a file named `.env.hardhat.variables` with the following format:

```
# RPC URLS (protocol must be https, not wss)
RPC_GOERLI_URL= <HTTPS URL>
RPC_MAINNET_URL= <HTTPS URL>

# Etherscan API KEY
ETHERSCAN_API_KEY=

# Wallet deployer private key
DEPLOYER_PRIVATE_KEY=

# Hardhat gas reporter
REPORT_GAS=true
COINMARKETCAP_API_KEY=
```


## Testing

To run all test cases run in the terminal this command:

```shell
npx hardhat test
```

To run a specfic test case specify the file path

```shell
npx hardhat test test/<File Path>
```

## Deployment

Using the `hardhat-deploy` package for setting up deploy scripts. Please add deployed contracts to `helper-hardhat.config.ts` to keep track of mainnet and testnet addresses.

Pass into the `--tags` argument the contract you wish to deploy as well as specifying the network. List of configured networks can be found in `hardhat.config.ts`
Deploy scripts can be found in the /deploy folder.
```shell
npx hardhat deploy --network <NETWORK> --tags <TAG>

# Example: Saferoot Factory
npx hardhat deploy --network goerli --tags SaferootNetwork
```

Note: To deploy Saferoot for a user. Call the `createSaferoot` function from SaferootFactory.`


## Saferoot System Summary

There are 3 important entities to understand in the Saferoot system who are all represented by different addresses.

- Saferoot Service
- User & Backup wallet
- Smart contract (Saferoot.sol)

### Saferoot Service
The Saferoot service is our backend service that will scan transactions in the EVM mempool to detect malicious/unwanted movement of assets. If such a transaction is detected, as a backup, our service address will frontrun this transaction and call the `initiateSafeguard` transaction to move a User's priorly specified assets to a backup wallet address belonging to the User.
Functions that our backend service is capable of performing are specified by the `onlyService` modifier, important one's being `confirmPendingStates` for 2FA and `initiateSafeguard` for the frontrunning.

### User & Backup wallet
User and backup wallet are self-explanatory, the User wallet address will interact with their Saferoot contract and backup wallet belongs to the User as well.
The User will be responsible for deploying their own Saferoot contract by calling the `create*` functions from the SaferootFactory contract. Each user will have their own deployed and configured Saferoot contract to interact with in a 1-to-1 mapping.

A Safeguard is a set of assets that the User wishes to be scanned by the service to be backed up. After deployment, the User will configure a Safeguard by first setting the Safeguard in the Saferoot contract by calling `addSafeguard`, and secondly sending a message to the backend service so it can begin to scan the Safeguard assets.

### Smart contract (Saferoot.sol)

The Saferoot contract facilitates the transfer of assets from the User's wallet to the Backup wallet in the event a backup is required. The Saferoot service will frontrun with a `initiateSafeguard` transaction. Note that for a Safeguard to work, the User will have to pre-approve the Safeguard assets for the users owned contract to transfer. This goes for ERC20s, ERC721s, and/or ERC1155s. 

The Saferoot smart contract is designed to be deployed and owned by the user. All sensitive asset informationd details as well as where to send them are protected under the discretion of user in a non-custodial fashion. This assures that the Saferoot service has no way of tampering with which assets to send or where to send them.

## READMEs

Please navitgate to the READMEs folder to have some documentation context on the various smart contracts in this repository.