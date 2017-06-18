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
var logger = log4js.getLogger('QUERY');
logger.setLevel('DEBUG');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');

var config = require('./config.json');
var helper = require('./helper.js');

var client = new hfc();
var chain;
var adminUser;

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
		logger.info('Executing Query');
		var targets = [];
		for (var i = 0; i < config.peers.length; i++) {
			targets.push(config.peers[i]);
		}
		var args = helper.getArgs(config.queryRequest.args);
		var nonce = utils.getNonce();
		let tx_id = chain.buildTransactionID(nonce, adminUser);
		//chaincode query request
		var request = {
			chaincodeId: config.chaincodeID,
			chaincodeVersion: config.chaincodeVersion,
			chainId: config.channelID,
			txId: tx_id,
			nonce: nonce,
			fcn: config.queryRequest.functionName,
			args: args
		};
		// Query chaincode
		return chain.queryByChaincode(request);
	}
).then(
	function(results) {
		for (let i = 0; i < results.length; i++) {
			logger.info('############### Query results after the move on PEER%j, User "b" now has  %j', i, results[i].toString('utf8'));
		}
	}
).catch(
	function(err) {
		logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
	}
);
