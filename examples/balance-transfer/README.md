# Balance transfer

A sample node-based app to demonstrate ***fabric-client*** & ***fabric-ca-client*** Node SDK APIs

### Prerequisites and setup:

1.  Clone fabric-sdk-node project

	`git clone https://github.com/jorgedr94/fabric-sdk-node.git`

1. Go to sample directory

	`cd fabric-sdk-node/examples/balance-transfer`

1. Make sure you are working on the alpha branch

	`git checkout v1.0.0-alpha.x`

	To verify the branch you are working on use `git branch`

1. Install Hyperledger Fabric v1 alpha local environment

	`npm run deploy-hlf`

	Verify installation ran properly using `docker ps` command.  A valid installation should look similar to the following output:
	```
	CONTAINER ID        IMAGE                                           COMMAND                  CREATED              STATUS              PORTS                                            NAMES
9b217848addb        hyperledger/fabric-peer:x86_64-1.0.0-alpha      "peer node start -..."   58 seconds ago       Up 57 seconds       0.0.0.0:7056->7051/tcp, 0.0.0.0:7058->7053/tcp   peer1
1ceaa835a589        hyperledger/fabric-peer:x86_64-1.0.0-alpha      "peer node start -..."   About a minute ago   Up 59 seconds       0.0.0.0:7051->7051/tcp, 0.0.0.0:7053->7053/tcp   peer0
db4797c8403b        hyperledger/fabric-orderer:x86_64-1.0.0-alpha   "orderer"                About a minute ago   Up About a minute   0.0.0.0:7050->7050/tcp                           orderer0
db3e4af348ed        hyperledger/fabric-ca:x86_64-1.0.0-alpha        "sh -c 'fabric-ca-..."   About a minute ago   Up About a minute   0.0.0.0:7054->7054/tcp                           ca_peerOrg1
	```

1. Install npm dependencies locally to run example

	`npm install`

	After running this command an `npm_modules` directory should show up under `fabric-sdk-node/examples/balance-transfer`

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

	A successful invocation will have the following output:
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
