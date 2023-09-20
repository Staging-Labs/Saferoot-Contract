# Saferoot Contract

The Saferoot contract is a smart contract implemented using the Minimal Proxy/Clone pattern, designed to provide gas deployment cost savings. It is deployed by the SaferootFactory contract.

## Functionality

The Saferoot contract enables users to safeguard their tokens (ERC20, ERC721, and ERC1155) by transferring them to a backup wallet. The contract allows users to add, edit, and initiate safeguards for different types of tokens.

### Roles

The contract utilizes an access control mechanism with two roles:

- `USER_ROLE`: Users who can interact with the contract and manage their safeguards.
- `SERVICE_ROLE`: Service accounts responsible for initiating safeguards on behalf of users.

### Safeguards

The contract supports three types of token safeguards:

1. ERC20 Safeguards: Users can specify an ERC20 token contract address to be transferred to the backup wallet.
2. ERC721 Safeguards: Users can specify an ERC721 token contract address and a token ID to be transferred to the backup wallet.
3. ERC1155 Safeguards: Users can specify an ERC1155 token contract address, and a token ID to be transferred to the backup wallet.

### Initialization

The Saferoot contract is initialized with the following parameters:

- `_service`: Address of the service account responsible for initiating safeguards.
- `_user`: Address of the user who owns the tokens.
- `_backup`: Address of the backup wallet where tokens will be transferred.

### Service Functions

- `initiateSafeguard`: Initiates safeguards for specified safeguard keys. This function can only be called by the service account.

### User Functions

- `addSafeguard`: Adds new safeguards for ERC20, ERC721, and ERC1155 tokens. This function can only be called by the user.
- `setBackupWallet`: Sets a new backup wallet address. This function can only be called by the user.

### View Functions

- `encodeKey`: Encodes a unique identifier and token type into a bytes32 key.
- `decodeKeyTokenType`: Decodes the token type from a given bytes32 key.
- `decodeKeyID`: Decodes the unique identifier from a given bytes32 key.

## Usage

To interact with the Saferoot contract, follow these steps:

1. Deploy the Saferoot contract using the SaferootFactory contract.
2. Initialize the Saferoot contract by providing the necessary parameters.
3. Grant the `USER_ROLE` and `SERVICE_ROLE` to the respective addresses.
4. Users can add safeguards for their tokens using the `addSafeguard`
5. Service accounts can initiate safeguards by calling the `initiateSafeguard` function.
6. Users can set a new backup wallet address using the `setBackupWallet` function.

## Development

To develop and test the Saferoot contract locally, follow these steps:

1. Clone the repository.
2. Install the required dependencies using `npm install`.
3. Run the tests using `npm run test`.

## License

This project is licensed under the [MIT License](LICENSE).
