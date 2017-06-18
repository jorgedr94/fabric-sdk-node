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
var logger = log4js.getLogger('INVOKE');

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
var tx_id = null;
var adminUser  = null;
var eventhubs = [];

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
		logger.info('Executing Invoke');
		var nonce = utils.getNonce();
		tx_id = chain.buildTransactionID(nonce, adminUser);
		var args = helper.getArgs(config.invokeRequest.args);
		// send proposal to endorser
		var request = {
			chaincodeId: config.chaincodeID,
			fcn: config.invokeRequest.functionName,
			args: args,
			chainId: config.channelID,
			txId: tx_id,
			nonce: nonce
		};
		return chain.sendTransactionProposal(request);
	}
).then(
	function(results) {
		logger.info('Successfully obtained proposal responses from endorsers');

		return helper.processProposal(tx_id, eventhubs, chain, results, 'move');
	}
).then(
	function(response) {
		if (response.status === 'SUCCESS') {
			logger.info('The chaincode transaction has been successfully committed');
			process.exit();
		}
	}
).catch(
	function(err) {
		logger.error('Failed to invoke transaction due to error: ' + err.stack ? err.stack : err);
		process.exit();
	}
);
