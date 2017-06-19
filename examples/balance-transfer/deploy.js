/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
// This is Sample end-to-end standalone program that focuses on exercising all
// parts of the fabric APIs in a happy-path scenario
'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('DEPLOY');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var EventHub = require('fabric-client/lib/EventHub.js');

var config = require('./config.json');
var helper = require('./helper.js');

logger.setLevel('DEBUG');

var client = new hfc();
var chain;
var eventhubs = [];
var tx_id = null;
var targets = [];
var adminUser;


// on process exit, always disconnect the event hub
process.on('exit', function() {
	for(let key in eventhubs) {
		let eventhub = eventhubs[key];
		if (eventhub && eventhub.isconnected()) {
			logger.debug('Disconnecting the event hub: '+ eventhub);
			eventhub.disconnect();
		}
	}
});



process.env.GOPATH = config.goPath;

init();

function init() {
	chain = client.newChain(config.channelID);
	let pem = null;

	if('tlsCert' in config) {
		pem = config.tlsCert.pem;
	}

	let orderer;
	if(pem){
		orderer = new Orderer(config.orderer.orderer_url,
			{
				pem: pem
			});
	} else {
		orderer = new Orderer(config.orderer.orderer_url);
	}

	chain.addOrderer(orderer);

	for (let i = 0; i < config.peers.length; i++) {
		let peer;
		if(pem){
			peer = new Peer(config.peers[i].peer_url,
				{
					pem: pem
				});
		} else {
			peer = new Peer(config.peers[i].peer_url);
		}
		chain.addPeer(peer);
		targets.push(peer);
	}

	for (let i = 0; i < config.events.length; i++) {
		let eventhub = new EventHub();

		if(pem){
			eventhub.setPeerAddr(config.events[i].event_url,
			{
				pem: pem
			});
		} else {
			eventhub.setPeerAddr(config.events[i].event_url);
		}
		eventhub.connect();
		eventhubs.push(eventhub);
	}
}

hfc.newDefaultKeyValueStore({
	path: config.keyValueStore
}).then(function(store) {
	client.setStateStore(store);
	return helper.getSubmitter(client);
}).then(
	function(admin) {
		adminUser = admin;
		logger.info('Successfully obtained enrolled user to deploy the chaincode');
		return chain.initialize();
	}).then(function () {
		logger.info('Executing Deploy');
		let nonce = utils.getNonce();
		let tx_id = chain.buildTransactionID(nonce, adminUser);
		// send proposal to endorser
		let request = {
			targets: targets,
			chaincodePath: config.chaincodePath,
			chaincodeId: config.chaincodeID,
			chaincodeVersion: config.chaincodeVersion,
			txId: tx_id,
			nonce: nonce,
		};
		logger.info('Sending proposal....');
		return chain.sendInstallProposal(request);
	}
).then(
	function(results) {
		logger.info('-------------- Proposal sent, Inspecting Results --------------------');
		let proposalResponses = results[0];

		let proposal = results[1];
		let header   = results[2];
		let all_good = true;
		for(let i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
				one_good = true;
				logger.info('Install proposal was good');
			} else {
				logger.error('install proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			logger.info('Successfully sent Proposal and received ProposalResponse');
		} else {
			logger.error('Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
}
).then(function(){
	logger.info('-------------- Prepping to instantiate the chaincode --------------------');
	let nonce = utils.getNonce();
	tx_id = chain.buildTransactionID(nonce, adminUser);
	let args = helper.getArgs(config.deployRequest.args);

	// send proposal to endorser
	var request = {
		chaincodePath: config.chaincodePath,
		chaincodeId: config.chaincodeID,
		chaincodeVersion: config.chaincodeVersion,
		fcn: config.deployRequest.functionName,
		args: args,
		chainId: config.channelID,
		txId: tx_id,
		nonce: nonce
	};
	logger.info('Sending instantiate propoposal');
	logger.info(request);
	return chain.sendInstantiateProposal(request);
}).then((results) => {

	logger.info('-------------- Successfully initialized the chaincode --------------------');
	let proposalResponses = results[0];

	let proposal = results[1];
	let header   = results[2];
	var all_good = true;
	for(let i in proposalResponses) {
		let one_good = false;
		if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
			one_good = true;
			logger.info('instantiate proposal was good');
		} else {
			logger.error('instantiate proposal was bad');
		}
		all_good = all_good & one_good;
	}
	if (all_good) {
		logger.info('Successfully sent Instantiate Proposal and received ProposalResponse');
		logger.info('Status: ' +  proposalResponses[0].response.status);
		logger.info('Message: ' + proposalResponses[0].response.message);
		logger.info('Payload: ' + proposalResponses[0].response.payload);
		logger.info('Signature: ' + proposalResponses[0].endorsement.signature);

		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal,
			header: header
		};
		// set the transaction listener and set a timeout of 30sec
		// if the transaction did not get committed within the timeout period,
		// fail the test
		let deployId = tx_id.toString();

		let eventPromises = [];
		eventhubs.forEach((eventhub) => {
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(reject, 60000);
				eventhub.registerTxEvent(deployId.toString(), (tx, code) => {
					logger.info('The chaincode instantiate transaction has been committed on peer '+ eventhub.ep._endpoint.addr);
					clearTimeout(handle);
					eventhub.unregisterTxEvent(deployId);
					if (code !== 'VALID') {
						logger.error('The chaincode instantiate transaction was invalid, code = ' + code);
						reject();
					} else {
						logger.info('The chaincode instantiate transaction was valid.');
						resolve();
					}
				});
			});
			eventPromises.push(txPromise);
		});

		logger.info('Sending instantiate transaction...');
		let sendPromise = chain.sendTransaction(request);
		return Promise.all([sendPromise].concat(eventPromises))
		.then((results) => {
			logger.debug('Event promise all complete and testing complete');
			process.exit();
			// This return is not going to get called
			return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
		}).catch((err) => {
			logger.error('Failed to send instantiate transaction and get notifications within the timeout period.');
			throw new Error('Failed to send instantiate transaction and get notifications within the timeout period.');
		});
	} else {
		logger.error('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
}).catch(
	function(err) {
		console.log("Error detected..." + err);
		logger.error(err.stack ? err.stack : err);
		process.exit();
	}
);

console.log('done');
