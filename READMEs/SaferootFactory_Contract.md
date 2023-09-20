# SaferootFactory Contract

The SaferootFactory contract is responsible for creating and deploying new instances of the Saferoot contract. It utilizes the Saferoot implementation contract as the delegated contract logic for the different Saferoot instances, reducing bytecode and deployment costs.

## Functionality

The SaferootFactory contract provides the following functionality:

- Deploying a new Saferoot contract using the `createSaferoot` function.
- Storing an immutable Saferoot implementation contract address.

### Saferoot Deployment

The `createSaferoot` function is used to deploy a new Saferoot contract. It takes the following parameters:

- `_service`: Address of the service account responsible for initiating safeguards.
- `_backup`: Address of the backup wallet where tokens will be transferred.

Upon deployment, a new Saferoot instance is created as a clone of the Saferoot implementation contract. The `initialize` function of the Saferoot contract is then called to initialize the instance with the provided parameters.

### Events

The SaferootFactory contract emits the following event:

- `SaferootDeployed`: Indicates the successful deployment of a new Saferoot contract. It includes the contract address, service account address, user address (msg.sender), and the backup wallet address.

## Usage

To use the SaferootFactory contract, follow these steps:

1. Deploy the SaferootFactory contract.
2. Obtain the Saferoot implementation contract address by accessing the `saferootImplementation` variable.
3. Call the `createSaferoot` function, providing the necessary parameters to deploy a new Saferoot contract.
4. The Saferoot contract instance will be created and initialized, and the `SaferootDeployed` event will be emitted.
5. Retrieve the address of the deployed Saferoot contract from the emitted event.

## Development

To develop and test the SaferootFactory contract locally, follow these steps:

1. Clone the repository.
2. Install the required dependencies using `npm install`.
3. Run the tests using `npm run test`.

## License

This project is licensed under the [MIT License](LICENSE).
