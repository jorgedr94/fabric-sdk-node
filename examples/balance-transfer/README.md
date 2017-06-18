# Balance transfer

A sample node-based app to demonstrate ***fabric-client*** & ***fabric-ca-client*** Node SDK APIs

### Prerequisites and setup:

1.  Go to sample directory

	`cd fabric-sdk-node/examples/balance-transfer`
2. Install Hyperledger Fabric v1 alpha local environment

	`npm run deploy-hlf`

3. Install npm dependencies locally to run example

	`npm install`

### Running example

1.  Go to sample directory

	`cd fabric-sdk-node/examples/balance-transfer`

2. Run the deploy chaincode operation

	`node deploy.js`

	This operation will install and instantiate the chaincode found under `fabric-sdk-node/test/fixtures/src/github.com/example_cc`

3. Query the chaincode to verify it was initialized correctly

	`node query.js`

	A successful query will have the following output:
	```
	[INFO] QUERY - Executing Query
	[INFO] QUERY - ############### Query results after the move on PEER0, User "b" now has  "200"
	[INFO] QUERY - ############### Query results after the move on PEER1, User "b" now has  "200"
	```

4. Invoke chaincode to change values

	`node invoke.js`

	A successful query will have the following output:
	```
	[INFO] Helper - Successfully obtained transaction endorsements.
	[INFO] Helper - The chaincode transaction has been successfully committed
	[INFO] INVOKE - The chaincode transaction has been successfully committed
	```

5. Query the chaincode again to verify values have changed

	`node query.js`

	A successful query will have the following output:
	```
	[INFO] QUERY - Executing Query
	[INFO] QUERY - ############### Query results after the move on PEER0, User "b" now has  "300"
	[INFO] QUERY - ############### Query results after the move on PEER1, User "b" now has  "300"
	```

### Configuration considerations

You have the ability to change configuration parameters by editing the **config.json** file.
