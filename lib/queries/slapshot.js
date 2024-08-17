//Generated using Postman

//var request = require('request');
import request from 'request';
import cfg from '../../config.js';

const API_URL = cfg.slapshotAPI.url;
const API_KEY = cfg.slapshotAPI.key;


function getPublicMatchmaking() {
	const options = {
		'method': 'GET',
		'url': `${API_URL}/api/public/matchmaking?regions=oce-east`,
		'headers': {
			'Authorization': `Bearer ${API_KEY}`
		}
	};
	
	return querySlapAPI(options);
}

function getPublicShop() {
	const options = {
		'method': 'GET',
		'url': `${API_URL}/api/public/shop`,
		'headers': {
			'Authorization': `Bearer ${API_KEY}`
		}
	};
	
	return querySlapAPI(options);
}

async function createLobby(lobbySettings) {
	const options = {
		'method': 'POST',
		'url': `${API_URL}/api/public/lobbies`,
		'headers': {
			'Authorization': `Bearer ${API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(lobbySettings)
	};
	
	return querySlapAPI(options);
}

async function deleteLobby(lobbyId) {
	const options = {
		'method': 'DELETE',
		'url': `${API_URL}/api/public/lobbies/${lobbyId}`,
		'headers': {
			'Authorization': `Bearer ${API_KEY}`,
		},
	};
	
	return querySlapAPI(options);
}

function querySlapAPI(opts) {
	return new Promise((resolve, reject) => {
		request(opts, function (error, res) { 
			if (error) {
				console.log('Error querying SlapAPI');
				console.log(error);
				reject(error);
			}
			resolve(res);
		});
	});
}

export { getPublicMatchmaking, getPublicShop, createLobby, deleteLobby };