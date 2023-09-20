# ErrorReporter Contract

The ErrorReporter contract defines custom errors that can be used within smart contracts to provide descriptive error messages.

## Errors

The ErrorReporter contract provides the following custom errors:

- `InvalidContractAddress`: Indicates that the provided address is not a valid contract address.
- `ZeroAddress`: Indicates that the input address is a zero address.
- `NotService`: Indicates that the request was called by a non-service account. It includes the address of the caller.
- `NotUser`: Indicates that the request was called by a non-user account. It includes the address of the caller.
- `SafeguardDoesNotExist`: Indicates that the requested safeguard does not exist.

## Usage

To use the ErrorReporter contract, follow these steps:

1. Import the ErrorReporter contract into your smart contract.
2. Use the custom errors as needed within your contract to provide descriptive error messages.
3. When an error condition is met, revert the transaction using the appropriate custom error.

## Development

To develop and test the ErrorReporter contract locally, follow these steps:

1. Clone the repository.
2. Install the required dependencies using `npm install`.
3. Run the tests using `npm run test`.

## License

This project is licensed under the [MIT License](LICENSE).
