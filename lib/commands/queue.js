import { bot, cmdChannels } from '../index';
import enforceWordCount from '../utls/enforceWordCount';
import queuePop from '../scripts/queuePop';
import { getPlayerFromDiscordIdQuery } from '../queries/index';
import { getDraftFromDiscordId, getDraftFromTeamName, removeDraft } from '../scripts/draftClass';
import { logger } from '../';
import { isMod } from '../utls/isMod';
import getWord from '../utls/getWord';	
import cfg from '../../config';
import isBanned from '../utls/isBanned';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage';
import getLeaguePlayer from '../utls/getLeaguePlayer';
 
let queuedPlayers = [];
let queuedPlayersTwos = [];
let queuedPlayersScrims = [];
 
async function queue(msg) {
    const userMessage = msg.content.toLowerCase();
    const userID = msg.author.id;
    let player = '';
	
	if ((userMessage === '!queue leave all') || (userMessage === '!qlall') || (userMessage === '!ql all')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot leave the queue from here.');
		}
		
		if ((msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name)) {
			for (const [index, playerObj] of queuedPlayers.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayers.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Casual RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Casual RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayers.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayers.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayers.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					await cmdChannels.casualCh.send({ files: embedFilesList, embed: QLEmbed}).catch(console.error);
				}
			}
			for (const [index, playerObj] of queuedPlayersTwos.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayersTwos.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Twos RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Twos RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayersTwos.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayersTwos.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersTwos.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					await cmdChannels.twosCh.send({ files: embedFilesList, embed: QLEmbed}).catch(console.error);
				}
			}
			for (const [index, playerObj] of queuedPlayersScrims.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayersScrims.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Scrims RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Scrims RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayersScrims.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayersScrims.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersScrims.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					await cmdChannels.scrimsCh.send({ files: embedFilesList, embed: QLEmbed}).catch(console.error);
				}
			}
			
			let QLAEmbed = {
				color: 0xb60f0f,
				author: {
					name: `${msg.author.username} has left all RPUGs queues.`,
					icon_url: `${msg.author.displayAvatarURL()}`
				},
			};

			return {
				embedMessage: QLAEmbed,
				embedFiles: [],
				deleteSenderMessage: false
			};
		}
	}
 
    // Leaving Queue
    if ((userMessage === '!queue leave') || (userMessage === '!q leave') || (userMessage === '!ql')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot leave the queue from here.');
		}
		
		//Casual League Queue
		if (msg.channel.name === cmdChannels.casualCh.name) {
			for (const [index, playerObj] of queuedPlayers.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayers.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Casual RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Casual RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayers.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayers.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayers.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					return {
						embedMessage: QLEmbed,
						embedFiles: embedFilesList,
						deleteSenderMessage: false
					};
				}
			}
			return errorMsg('You are not in the Casual RPUGs queue.');
		}
		
		// Twos League Queue
		if (msg.channel.name === cmdChannels.twosCh.name) {
			for (const [index, playerObj] of queuedPlayersTwos.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayersTwos.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Twos RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Twos RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayersTwos.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayersTwos.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersTwos.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					return {
						embedMessage: QLEmbed,
						embedFiles: embedFilesList,
						deleteSenderMessage: false
					};
				}
			}
			return errorMsg('You are not in the Twos RPUGs queue.');
		}
		
		// Scrims League Queue
		if (msg.channel.name === cmdChannels.scrimsCh.name) {
			for (const [index, playerObj] of queuedPlayersScrims.entries()) {
				if (userID === playerObj.discordId) {
					queuedPlayersScrims.splice(index, 1);
					logger.log('info', `UserID ${userID} ${msg.author.username} (${playerObj.playerID} ${playerObj.username}) left the Scrims RPUGs queue.`);
					
					let QLEmbed = {
						color: 0xeb17dd,
						author: {
							name: `${msg.author.username} (${playerObj.username}) has left the Scrims RPUGs queue.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						},
						description: `Players in queue: ${queuedPlayersScrims.length}`,
						thumbnail: {
							url: ''
						}
					};
					
					let embedFilesList = [];
					if (queuedPlayersScrims.length != 0) {
						const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersScrims.length}.png`, 'queue.png'); //from: see clipart_links file
						embedFilesList.push(embedThumb);
						
						QLEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
					}
					
					return {
						embedMessage: QLEmbed,
						embedFiles: embedFilesList,
						deleteSenderMessage: false
					};
				}
			}
			return errorMsg('You are not in the Scrims RPUGs queue.');
		}
		// Error - not in queue
		return errorMsg(`You cannot leave any queue from here.`);
	}
	
    // Joining Queue
	const qjAlias = ['!queue join','!queue john','!q john','!q join','!qj', 'qjoin', 'qjohn'];
	
	if ( qjAlias.some(cmd => (userMessage.startsWith(cmd + ' ')) || (userMessage === cmd)) ) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot join the queue from here.');
		}
		
		if (isBanned(userID)) {
			return errorMsg('You cannot join the queue as you are banned.');
		}
		
		try {
			player = await getPlayerFromDiscordIdQuery(userID);

			if (player === null) {
				throw errorMsg('Unregistered players cannot queue.','For more information, type:' + '```' + '!help / !info' + '```');
			}
			
			if (getDraftFromDiscordId(userID) !== false) {
				throw errorMsg('You are in an unreported match.','Please finish the match and wait for both captains to report the score.')
			}
			
		}
		catch (err) {
			return err;
		}
		
		let qjList = [];	//List of queues person is joining
		
		if ( qjAlias.some(cmd => (userMessage === cmd)) ) {
			if (msg.channel.name === cmdChannels.twosCh.name) {
				qjList.push('t');
			}
			else if (msg.channel.name === cmdChannels.casualCh.name) {
				qjList.push('c');
			}
			else if (msg.channel.name === cmdChannels.scrimsCh.name) {
				qjList.push('s');
			}
			else {
				return errorMsg('You cannot join the queue from here.');
			}
		}
		else if ( qjAlias.some(cmd => userMessage.startsWith(cmd + ' ')) ) {
			const chNames = [ cmdChannels.twosCh.name, cmdChannels.casualCh.name, cmdChannels.scrimsCh.name ]
			//check channel
			if (!(chNames.includes(msg.channel.name))) {
				return errorMsg('You cannot join the queue from here.');
			}
			
			//if starts with qj, qjohn or qjoin, remove first word, else remove first 2 words
			const allowedArgs = ['t','c','s'];
			let qjUserArgs = ''
			if ( (userMessage.startsWith('!qj')) || (userMessage.startsWith('!qjoin')) || (userMessage.startsWith('!qjohn')) ) {
				qjUserArgs = ((userMessage.replace(/[^\s]*/,"")).replace(/[\s,]+/g,'')).split(/(?!$)/u);	//regex expr from here: https://stackoverflow.com/questions/47199953/javascript-replace-first-word-in-sentence-in-class, https://stackoverflow.com/questions/6484670/how-do-i-split-a-string-into-an-array-of-characters
			}
			else {
				qjUserArgs = ((userMessage.replace(/^([\S]+\s){2}/,"")).replace(/[\s,]+/g,'')).split(/(?!$)/u);	//regex expr from here: https://stackoverflow.com/questions/11544318/regex-delete-up-to-second-whitespace
			}
			
			//check if there are invalid args
			if ( qjUserArgs.some(arg => !(allowedArgs.includes(arg))) ) {
				return errorMsg('Invalid queue argument/s provided.','Valid arguments: c,t,s');
			}
			qjList = [ ...new Set(qjUserArgs) ];
		}
		await addToQueue(msg,player,qjList);
	}
	
    //List queue
    if ((userMessage === '!queue') || (userMessage === '!q')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot check the queue from here.');
		}
		if (msg.channel.name === cmdChannels.twosCh.name) {
			return twosQList();
		}
		else if (msg.channel.name === cmdChannels.casualCh.name) {
			return casualQList();
		}
		else if (msg.channel.name === cmdChannels.scrimsCh.name) {
			return scrimsQList();
		}
		else {
			return errorMsg('You cannot check the queue from here.');
		}
    }
	
	if ((userMessage === '!queuecasual') || (userMessage === '!qcasual')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot check the queue from here.');
		}
		if ((msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name)) {
			return casualQList();
		}
	}
		
	if ((userMessage === '!queuetwos') || (userMessage === '!qtwos')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot check the queue from here.');
		}
		if ((msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name)) {
			return twosQList();
		}
	}
	
	if ((userMessage === '!queuescrims') || (userMessage === '!qscrims')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot check the queue from here.');
		}
		if ((msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name)) {
			return scrimsQList();
		}
	}
	
    // Resolve promise
    return false;
}

async function addToQueue(msg,player,queueList) {
	//got list of queues to join now
    const userID = msg.author.id;
	let queueCheckEnable = true;	//parameter for testing queue- allows users to join multiple times if set to false
	
	for (const i in queueList) {
		//let matchPopped = false;	//to break out of for loop if match pops so player is not added to another queue
		const currTime = new Date();
		if (queueList[i] === 't') {
			let queuePopMessage = '';
			if (((queuedPlayersTwos.map(p => p.discordId)).includes(player.discordId)) && (queueCheckEnable)) {
				const errObj = errorMsg('You are already in the Twos RPUGs queue.',`Player: <@${player.discordId}>/${player.username}`,null,false);
				await cmdChannels.twosCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
				//throw errorMsg('You are already in the Twos RPUGs queue.',`Player: <@${player.discordId}>`);
			}
			else {
				player.joinTime = currTime;
				player.idleAlerted = 0;

				queuedPlayers.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				queuedPlayersScrims.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				
				queuedPlayersTwos.push(player);
				logger.log('info', `UserID ${msg.author.id} ${msg.author.username} (${player.playerID} ${player.username}) joined the Twos RPUGs queue.`);
				if (queuedPlayersTwos.length === 4) {
					queuedPlayersTwos.forEach((playerObj) => {
						delete playerObj.joinTime;
						delete playerObj.idleAlerted;
					});
					await otherQueueKick('twos');
					queuePop(queuedPlayersTwos, 'twos');
					queuedPlayersTwos.length = 0;
					logger.log('info', `Twos RPUGs queue popped.`);
					queuePopMessage = 'Beginning Draft.\nPlease check your DMs for a message from SlapBot.'
				}
				
				let embedFilesList = [];
				const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${(queuedPlayersTwos.length === 0) ? (4) : (queuedPlayersTwos.length)}.png`, 'queue.png'); //from: see clipart_links file
				embedFilesList.push(embedThumb);
				
				let QJEmbed = {
					color: 0xeb17dd,
					author: {
						name: `${msg.author.username} (${player.username}) has joined the Twos RPUGs queue.`,
						icon_url: `${msg.author.displayAvatarURL()}`
					},
					description: `Players in queue: ${queuedPlayersTwos.length}`,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
				};
				
				if (queuePopMessage !== '') {
					QJEmbed.title = queuePopMessage;
					QJEmbed.description = `:white_check_mark: **Check-in:** ${cmdChannels.updatesCh}\nPlayers in queue: ${queuedPlayersTwos.length}`
					await cmdChannels.twosCh.send({ files: embedFilesList, embed: QJEmbed })
					return;
				}
				await cmdChannels.twosCh.send({ files: embedFilesList, embed: QJEmbed}).catch(console.error);
			}
		}
		else if (queueList[i] === 'c') {
			let queuePopMessage = '';
			if (((queuedPlayers.map(p => p.discordId)).includes(player.discordId)) && (queueCheckEnable)) {
				const errObj = errorMsg('You are already in the Casual RPUGs queue.',`Player: <@${player.discordId}>/${player.username}`,null,false);
				await cmdChannels.casualCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
				//throw errorMsg('You are already in the Casual RPUGs queue.',`Player: <@${player.discordId}>`);
			}
			else {
				player.joinTime = currTime;
				player.idleAlerted = 0 ;
				
				queuedPlayersTwos.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				queuedPlayersScrims.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				
				queuedPlayers.push(player);
				
				logger.log('info', `UserID ${msg.author.id} ${msg.author.username} (${player.playerID} ${player.username}) joined the Casual RPUGs queue.`);
				if (queuedPlayers.length === 6) {
					queuedPlayers.forEach((playerObj) => {
						delete playerObj.joinTime;
						delete playerObj.idleAlerted;
					});
					await otherQueueKick('casual');
					queuePop(queuedPlayers, 'casual');
					queuedPlayers.length = 0;
					logger.log('info', `Casual RPUGs queue popped.`);
					queuePopMessage = 'Beginning Draft.\nPlease check your DMs for a message from SlapBot.'
				}
				
				let embedFilesList = [];
				const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayers.length}.png`, 'queue.png'); //from: see clipart_links file
				embedFilesList.push(embedThumb);
				
				let QJEmbed = {
					color: 0xeb17dd,
					author: {
						name: `${msg.author.username} (${player.username}) has joined the Casual RPUGs queue.`,
						icon_url: `${msg.author.displayAvatarURL()}`
					},
					description: `Players in queue: ${queuedPlayers.length}`,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
				};

				if (queuePopMessage !== '') {
					QJEmbed.title = queuePopMessage;
					QJEmbed.description = `:white_check_mark: **Check-in:** ${cmdChannels.updatesCh}\nPlayers in queue: ${queuedPlayers.length}`
					cmdChannels.casualCh.send({ files: embedFilesList, embed: QJEmbed });
					return;
				}
				await cmdChannels.casualCh.send({ files: embedFilesList, embed: QJEmbed}).catch(console.error);
			}
		}
		else {			//Last possible case is scrims
			let queuePopMessage = '';
			const LeaguePlayer = await getLeaguePlayer(userID);
			if (((queuedPlayersScrims.map(p => p.discordId)).includes(player.discordId)) && (queueCheckEnable)) {
				const errObj = errorMsg('You are already in the Scrims RPUGs queue.',`Player: <@${player.discordId}>/${player.username}`,null,false);
				await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
				//throw errorMsg('You are already in the Casual RPUGs queue.',`Player: <@${player.discordId}>`);
			}
			else if (!LeaguePlayer) {
				const errObj = errorMsg('You cannot join the Scrims RPUGs queue. You must be on a league team to join.',`Player: <@${player.discordId}>/${player.username}`,null,false);
				await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
				//throw errorMsg('You cannot join the Scrims RPUGs queue. You must be on a league team to join.');
			}
			else if ((queuedPlayersScrims.length === 1 && LeaguePlayer.teamName === queuedPlayersScrims[0].OSLteam) && (queueCheckEnable)) {
				const errObj = errorMsg('You cannot join the Scrims RPUGs queue. Your teammate is already in the queue.',`Player: <@${player.discordId}>/${player.username}`,null,false);
				await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
				//throw errorMsg('You cannot join the Scrims RPUGs queue. Your teammate is already in the queue.');
			}
			else if (getDraftFromTeamName(LeaguePlayer.teamName)) {
				const errObj = errorMsg('You cannot join the Scrims RPUGs queue. Your team is already in a match.',`Please check in (${cmdChannels.updatesCh}) to join the match.`,null,false);
				await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
			}
			else {
				player.OSLusername = LeaguePlayer.username;
				player.OSLleague = LeaguePlayer.league;
				player.OSLteam = LeaguePlayer.teamName;
				
				player.joinTime = currTime;
				player.idleAlerted = 0 ;
				
				queuedPlayers.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				queuedPlayersTwos.forEach((playerObj) => {
					if (playerObj.discordId === player.discordId) {
						playerObj.joinTime = currTime;
						playerObj.idleAlerted = 0;
					}
				});
				
				queuedPlayersScrims.push(player);
				
				logger.log('info', `UserID ${msg.author.id} ${msg.author.username} (${player.playerID} ${player.username}) joined the Scrims RPUGs queue.`);
				if (queuedPlayersScrims.length === 2) {
					queuedPlayersScrims.forEach((playerObj) => {
						delete playerObj.joinTime;
						delete playerObj.idleAlerted;
					});
					await otherQueueKick('scrims');
					queuePop(queuedPlayersScrims, 'scrims');
					queuedPlayersScrims.length = 0;
					logger.log('info', `Scrims RPUGs queue popped.`);
					queuePopMessage = 'Please check your DMs for a message from SlapBot.'
				}
				
				let embedFilesList = [];
				const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${(queuedPlayersScrims.length === 0) ? (2) : (queuedPlayersScrims.length)}.png`, 'queue.png'); //from: see clipart_links file
				embedFilesList.push(embedThumb);
				
				let QJEmbed = {
					color: 0xeb17dd,
					author: {
						name: `${msg.author.username}/${player.username} (${player.OSLteam} - ${player.OSLleague}) has joined the Scrims RPUGs queue.`,
						icon_url: `${msg.author.displayAvatarURL()}`
					},
					description: `Teams in queue: ${queuedPlayersScrims.length}`,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
				};

				if (queuePopMessage !== '') {
					QJEmbed.title = queuePopMessage;
					QJEmbed.description = `:white_check_mark: **Check-in:** ${cmdChannels.updatesCh}\nTeams in queue: ${queuedPlayersScrims.length}`
					cmdChannels.scrimsCh.send({ files: embedFilesList, embed: QJEmbed });
					return;
				}
				await cmdChannels.scrimsCh.send({ files: embedFilesList, embed: QJEmbed}).catch(console.error);
			}
		}
	}
	return;
}

function casualQList() {
	let playerList = '';
			
	queuedPlayers.forEach((playerObj) => {
		playerList += '```';
		playerList += playerObj.username;
		playerList += '```';
	});
	
	let QEmbed = {
		color: 0xeb17dd,
		title: `Players in Casual RPUGs queue:`,
		description: playerList,
		thumbnail: {
			url: ''
		}
	};
	
	let embedFilesList = [];
	if (queuedPlayers.length != 0) {
		const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayers.length}.png`, 'queue.png'); //from: see clipart_links file
		embedFilesList.push(embedThumb);
		
		QEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
	}
	
	return {
		embedMessage: QEmbed,
		embedFiles: embedFilesList,
		deleteSenderMessage: false
	};
}

function twosQList() {
	let playerList = '';
			
	queuedPlayersTwos.forEach((playerObj) => {
		playerList += '```';
		playerList += playerObj.username;
		playerList += '```';
	});
	
	let QEmbed = {
		color: 0xeb17dd,
		title: `Players in Twos RPUGs queue:`,
		description: playerList,
		thumbnail: {
			url: ''
		}
	};
	
	let embedFilesList = [];
	if (queuedPlayersTwos.length != 0) {
		const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersTwos.length}.png`, 'queue.png'); //from: see clipart_links file
		embedFilesList.push(embedThumb);
		
		QEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
	}
	
	return {
		embedMessage: QEmbed,
		embedFiles: embedFilesList,
		deleteSenderMessage: false
	};
}

function scrimsQList() {
	let playerList = '';
			
	queuedPlayersScrims.forEach((playerObj) => {
		playerList += '```';
		playerList += playerObj.username;
		playerList += ` (${playerObj.OSLteam} - ${playerObj.OSLleague})`+'```';
	});
	
	let QEmbed = {
		color: 0xeb17dd,
		title: `Teams in Scrims RPUGs queue:`,
		description: playerList,
		thumbnail: {
			url: ''
		}
	};
	
	let embedFilesList = [];
	if (queuedPlayersTwos.length != 0) {
		const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersTwos.length}.png`, 'queue.png'); //from: see clipart_links file
		embedFilesList.push(embedThumb);
		
		QEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
	}
	
	return {
		embedMessage: QEmbed,
		embedFiles: embedFilesList,
		deleteSenderMessage: false
	};
}

function getQueues() {
	return {
		casual: queuedPlayers,
		twos: queuedPlayersTwos,
		scrims: queuedPlayersScrims
	}
}

async function otherQueueKick(mode) {
	const kickCasualPlayers = [];
	const kickTwosPlayers = [];
	const kickScrimsPlayers = [];
	
	if (mode === 'twos') {
		queuedPlayersTwos.forEach((playerObj) => {
			if (queuedPlayers.map(player => player.discordId).includes(playerObj.discordId)) {
				kickCasualPlayers.push(playerObj);
			}
		});
		queuedPlayersTwos.forEach((playerObj) => {
			if (queuedPlayersScrims.map(player => player.discordId).includes(playerObj.discordId)) {	//scrims player object is different, so compare discord IDs
				kickScrimsPlayers.push(playerObj);
			}
		});
	}
	else if (mode === 'casual') {
		queuedPlayers.forEach((playerObj) => {
			if (queuedPlayersTwos.map(player => player.discordId).includes(playerObj.discordId)) {
				kickTwosPlayers.push(playerObj);
			}
		});
		queuedPlayers.forEach((playerObj) => {
			if (queuedPlayersScrims.map(player => player.discordId).includes(playerObj.discordId)) {	//scrims player object is different, so compare discord IDs
				kickScrimsPlayers.push(playerObj);
			}
		});
	}
	else if (mode === 'scrims') {
		/*
		if (scrimsCheckin) {	//this is for when a non-captain checks into a scrims match
			const CheckinPlayer = await getPlayerFromDiscordIdQuery(scrimsCheckin.discordID).catch(console.error);
			if (queuedPlayers.includes(CheckinPlayer)) {	//scrims player object is different, so compare discord IDs
				kickCasualPlayers.push(CheckinPlayer);
			}
			if (queuedPlayersScrims.includes(CheckinPlayer)) {	//scrims player object is different, so compare discord IDs
				kickScrimsPlayers.push(CheckinPlayer);
			}
		}
		else {
		*/
		queuedPlayersScrims.forEach((playerObj) => {
			if (queuedPlayers.map(player => player.discordId).includes(playerObj.discordId)) {	//scrims player object is different, so compare discord IDs
				kickCasualPlayers.push(playerObj);
			}
		});
		queuedPlayersScrims.forEach((playerObj) => {
			if (queuedPlayersTwos.map(player => player.discordId).includes(playerObj.discordId)) {	//scrims player object is different, so compare discord IDs
				kickTwosPlayers.push(playerObj);
			}
		});
		//}
	}
	
	if (kickCasualPlayers.length > 0) { await kickFromOtherQueue('casual',kickCasualPlayers); }
	if (kickTwosPlayers.length > 0) { await kickFromOtherQueue('twos',kickTwosPlayers); }
	if (kickScrimsPlayers.length > 0) { await kickFromOtherQueue('scrims',kickScrimsPlayers); }
}

async function kickFromOtherQueue(kickQueue,kickPlayers) {
	var cutPlayer;
	for (cutPlayer of kickPlayers) {
		if (kickQueue === 'casual') {
			queuedPlayers = queuedPlayers.filter(playerObj => playerObj.discordId != cutPlayer.discordId);
		}
		else if (kickQueue === 'twos') {
			queuedPlayersTwos = queuedPlayersTwos.filter(playerObj => playerObj.discordId != cutPlayer.discordId);
		}
		else if (kickQueue === 'scrims') {
			queuedPlayersScrims = queuedPlayersScrims.filter(playerObj => playerObj.discordId != cutPlayer.discordId);
		}
	}
	if (kickPlayers.length == 1) {
		logger.log('info', `UserID ${cutPlayer.discordId} ${cutPlayer.username} was kicked from the ${kickQueue.charAt(0).toUpperCase() + kickQueue.slice(1)} RPUGs queue as they got into another match.`);

		var embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/otherQueueKick.png', 'otherQueueKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		var IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${cutPlayer.username} was kicked from the ${kickQueue.charAt(0).toUpperCase() + kickQueue.slice(1)} RPUGs queue.`,
				//icon_url: 'attachment://' + embedAuthThumb.name
			},
			thumbnail: {
				url: 'attachment://' + embedAuthThumb.name
			},
			description: `They got into another match.`
		};
		
		if (kickQueue === 'casual') {
			await cmdChannels.casualCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
		else if (kickQueue === 'twos') {
			await cmdChannels.twosCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
		else if (kickQueue === 'scrims') {
			await cmdChannels.scrimsCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
	}
	else if (kickPlayers.length > 1) {
		let playerList = '';
		let playerListLog = '';
		for (const [index,cutPlayer] of kickPlayers.entries()) {
			if (index != (kickPlayers.length-1)) {
				playerList = playerList.concat(cutPlayer.username,', ');
				playerListLog = playerListLog.concat(cutPlayer.discordId,' ',cutPlayer.username,', ');
			} else {
				playerList = playerList.concat('and ',cutPlayer.username);
				playerListLog = playerListLog.concat('and ',cutPlayer.discordId,' ',cutPlayer.username);
			}
		}
		logger.log('info', `UserID ${playerListLog} were kicked from the ${kickQueue.charAt(0).toUpperCase() + kickQueue.slice(1)} RPUGs queue as they got into another match.`);

		var embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/otherQueueKick.png', 'otherQueueKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		var IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${playerList} were kicked from the ${kickQueue.charAt(0).toUpperCase() + kickQueue.slice(1)} RPUGs queue.`,
				//icon_url: 'attachment://' + embedAuthThumb.name
			},
			thumbnail: {
				url: 'attachment://' + embedAuthThumb.name
			},
			description: `They got into another match.`
		};
		
		if (kickQueue === 'casual') {
			await cmdChannels.casualCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
		else if (kickQueue === 'twos') {
			await cmdChannels.twosCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
		else if (kickQueue === 'scrims') {
			await cmdChannels.scrimsCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
		}
	}
}

//Discord command:
async function kickFromQueue(msg) {
	const userMessage = msg.content.toLowerCase();
    const userID = msg.author.id;
    //let player = '';
	
	// Kicking from Queue
    if (userMessage.startsWith('!kick ') && (isMod(msg.author.id))) {
        if (enforceWordCount(userMessage, 2)) {
			const KickUsername = getWord(userMessage, 2);
            // Casual League Queue
			if (msg.channel.name === cmdChannels.casualCh.name) {
				for (const [index, playerObj] of queuedPlayers.entries()) {
					if (KickUsername === playerObj.username.toLowerCase()) {
						queuedPlayers.splice(index, 1);
						logger.log('info', `UserID ${playerObj.discordId} ${KickUsername} was kicked from the Casual RPUGs queue by Admin ${userID} ${msg.author.username}.`);
						
						const userAvatarURL = (await bot.users.fetch(playerObj.discordId).catch(console.error)).displayAvatarURL();
						
						let kEmbed = {
							color: 0xeda445,
							author: {
								name: `${playerObj.username} was kicked from the Casual RPUGs queue.`,
								icon_url: userAvatarURL
							},
							description: `Players in queue: ${queuedPlayers.length}`,
							thumbnail: {
								url: ''
							}
						};
						
						let embedFilesList = [];
						if (queuedPlayers.length != 0) {
							const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayers.length}.png`, 'queue.png'); //from: see clipart_links file
							embedFilesList.push(embedThumb);
							
							kEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
						}
						
						return {
							embedMessage: kEmbed,
							embedFiles: embedFilesList,
							deleteSenderMessage: false
						};
					}
				}
			}

            // Twos League Queue
			if (msg.channel.name === cmdChannels.twosCh.name) {
				for (const [index, playerObj] of queuedPlayersTwos.entries()) {
					if (KickUsername === playerObj.username.toLowerCase()) {
						queuedPlayersTwos.splice(index, 1);
						logger.log('info', `UserID ${playerObj.discordId} ${KickUsername} was kicked from the Twos RPUGs queue by Admin ${userID} ${msg.author.username}.`);
						
						const userAvatarURL = (await bot.users.fetch(playerObj.discordId).catch(console.error)).displayAvatarURL();
						
						let kEmbed = {
							color: 0xeda445,
							author: {
								name: `${playerObj.username} was kicked from the Twos RPUGs queue.`,
								icon_url: userAvatarURL
							},
							description: `Players in queue: ${queuedPlayersTwos.length}`,
							thumbnail: {
								url: ''
							}
						};
						
						let embedFilesList = [];
						if (queuedPlayersTwos.length != 0) {
							const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersTwos.length}.png`, 'queue.png'); //from: see clipart_links file
							embedFilesList.push(embedThumb);
							
							kEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
						}
						
						return {
							embedMessage: kEmbed,
							embedFiles: embedFilesList,
							deleteSenderMessage: false
						};
					}
				}
			}
			
			// Scrims Queue
			if (msg.channel.name === cmdChannels.scrimsCh.name) {
				for (const [index, playerObj] of queuedPlayersScrims.entries()) {
					if (KickUsername === playerObj.username.toLowerCase()) {
						queuedPlayersScrims.splice(index, 1);
						logger.log('info', `UserID ${playerObj.discordId} ${KickUsername} was kicked from the Scrims RPUGs queue by Admin ${userID} ${msg.author.username}.`);
						
						const userAvatarURL = (await bot.users.fetch(playerObj.discordId).catch(console.error)).displayAvatarURL();
						
						let kEmbed = {
							color: 0xeda445,
							author: {
								name: `${playerObj.username} was kicked from the Scrims RPUGs queue.`,
								icon_url: userAvatarURL
							},
							description: `Teams in queue: ${queuedPlayersScrims.length}`,
							thumbnail: {
								url: ''
							}
						};
						
						let embedFilesList = [];
						if (queuedPlayersScrims.length != 0) {
							const embedThumb = new Discord.MessageAttachment(`./thumbnails/queue${queuedPlayersScrims.length}.png`, 'queue.png'); //from: see clipart_links file
							embedFilesList.push(embedThumb);
							
							kEmbed.thumbnail.url = 'attachment://' + embedThumb.name;
						}
						
						return {
							embedMessage: kEmbed,
							embedFiles: embedFilesList,
							deleteSenderMessage: false
						};
					}
				}
			}
 
            // Error - not in queue
			return errorMsg(`${KickUsername} is not in queue.`);
        }
 
        // Syntax error
		return errorMsg('Did NOT kick player.','To kick from queue, make sure to type:' + '```' + '!kick <Username>' + '```');
	}
}

async function idleCheck(idleThresholdmin,kickThresholdmin) {
	var currentTime = new Date();
	var idleThresholdms = idleThresholdmin * 1000 * 60; //convert mins to ms
	var kickThresholdms = kickThresholdmin * 1000 * 60; //convert mins to ms

	const checkingPlayers = [];
	queuedPlayers.forEach((playerObj) => {
		if (((currentTime - playerObj.joinTime) > idleThresholdms) && (playerObj.idleAlerted != 1)) {
			checkingPlayers.push(playerObj);
			playerObj.idleAlerted = 1; //to ensure the player is only warned once and not repeatedly
		}
	});
	queuedPlayersTwos.forEach((playerObj) => {
		if (((currentTime - playerObj.joinTime) > idleThresholdms) && (playerObj.idleAlerted != 1)) {
			if (!(checkingPlayers.map(player => player.discordId).includes(playerObj.discordId))) {
				checkingPlayers.push(playerObj);
			}
			playerObj.idleAlerted = 1; //to ensure the player is only warned once and not repeatedly
		}
	});
	queuedPlayersScrims.forEach((playerObj) => {
		if (((currentTime - playerObj.joinTime) > idleThresholdms) && (playerObj.idleAlerted != 1)) {
			if (!(checkingPlayers.map(player => player.discordId).includes(playerObj.discordId))) {
				checkingPlayers.push(playerObj);
			}
			playerObj.idleAlerted = 1; //to ensure the player is only warned once and not repeatedly
		}
	});
	
	var idlePlayer;
	for (idlePlayer of checkingPlayers) {
		const playerClient = await bot.users.fetch(idlePlayer.discordId);
		
		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `You will be kicked for idling in approximately ${kickThresholdmin} minutes.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: 'Type:' + '```' + '!qs' + '```' + 'in any queue channel to stay in the queue/s.'
		};
		
		await playerClient.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	
	
	//casual queue kick
	const kickCasualPlayers = [];
	queuedPlayers.forEach((playerObj) => {
		if ((currentTime - playerObj.joinTime) > (idleThresholdms+kickThresholdms+5000)) {
			kickCasualPlayers.push(playerObj);
		}
	});
	
	var cutCasualPlayer;
	for (cutCasualPlayer of kickCasualPlayers) {
		queuedPlayers = queuedPlayers.filter(playerObj => playerObj != cutCasualPlayer);
	}
	if (kickCasualPlayers.length == 1) {
		logger.log('info', `UserID ${cutCasualPlayer.discordId} ${cutCasualPlayer.username} was kicked from the Casual RPUGs queue for idling. They were in the queue for more than ${idleThresholdmin} minutes.`);

		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${cutCasualPlayer.username} was kicked from the Casual RPUGs queue for idling.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: `They were in the queue for more than ${idleThresholdmin} minutes.`
		};
		
		await cmdChannels.casualCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	else if (kickCasualPlayers.length > 1) {
		let playerList = '';
		let playerListLog = '';
		for (const [index,cutCasualPlayer] of kickCasualPlayers.entries()) {
			if (index != (kickCasualPlayers.length-1)) {
				playerList = playerList.concat(cutCasualPlayer.username,', ');
				playerListLog = playerListLog.concat(cutCasualPlayer.discordId,' ',cutCasualPlayer.username,', ');
			} else {
				playerList = playerList.concat('and ',cutCasualPlayer.username);
				playerListLog = playerListLog.concat('and ',cutCasualPlayer.discordId,' ',cutCasualPlayer.username);
			}
		}
		logger.log('info', `UserID ${playerListLog} were kicked from the Casual RPUGs queue for idling. They were in the queue for more than ${idleThresholdmin} minutes.`);

		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${playerList} were kicked from the Casual RPUGs queue for idling.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: `They were in the queue for more than ${idleThresholdmin} minutes.`
		};
		
		await cmdChannels.casualCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	
	//twos queue kick
	const kickTwosPlayers = [];
	queuedPlayersTwos.forEach((playerObj) => {
		if ((currentTime - playerObj.joinTime) > (idleThresholdms+kickThresholdms+5000)) {
			kickTwosPlayers.push(playerObj);
		}
	});
	
	var cutTwosPlayer;
	for (cutTwosPlayer of kickTwosPlayers) {
		queuedPlayersTwos = queuedPlayersTwos.filter(playerObj => playerObj != cutTwosPlayer);
	}
	if (kickTwosPlayers.length == 1) {
		logger.log('info', `UserID ${cutTwosPlayer.discordId} ${cutTwosPlayer.username} was kicked from the Twos RPUGs queue for idling. They were in the queue for more than ${idleThresholdmin} minutes.`);

		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${cutTwosPlayer.username} was kicked from the Twos RPUGs queue for idling.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: `They were in the queue for more than ${idleThresholdmin} minutes.`
		};
		
		await cmdChannels.twosCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	else if (kickTwosPlayers.length > 1) {
		let playerList = '';
		let playerListLog = '';
		for (const [index,cutTwosPlayer] of kickTwosPlayers.entries()) {
			if (index != (kickTwosPlayers.length-1)) {
				playerList = playerList.concat(cutTwosPlayer.username,', ');
				playerListLog = playerListLog.concat(cutTwosPlayer.discordId,' ',cutTwosPlayer.username,', ');
			} else {
				playerList = playerList.concat('and ',cutTwosPlayer.username);
				playerListLog = playerListLog.concat('and ',cutTwosPlayer.discordId,' ',cutTwosPlayer.username);
			}
		}
		logger.log('info', `UserID ${playerListLog} were kicked from the Twos RPUGs queue for idling. They were in the queue for more than ${idleThresholdmin} minutes.`);
		
		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);
	
		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${playerList} were kicked from the Twos RPUGs queue for idling.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: `They were in the queue for more than ${idleThresholdmin} minutes.`
		};
		
		await cmdChannels.twosCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	
	//scrims queue kick
	const kickScrimsPlayers = [];
	queuedPlayersScrims.forEach((playerObj) => {
		if ((currentTime - playerObj.joinTime) > (idleThresholdms+kickThresholdms+5000)) {
			kickScrimsPlayers.push(playerObj);
		}
	});
	
	var cutScrimsPlayer;
	for (cutScrimsPlayer of kickScrimsPlayers) {
		queuedPlayersScrims = queuedPlayersScrims.filter(playerObj => playerObj != cutScrimsPlayer);
	}

	if (kickScrimsPlayers.length == 1) {
		logger.log('info', `UserID ${cutScrimsPlayer.discordID} ${cutScrimsPlayer.username} was kicked from the Scrims RPUGs queue for idling. They were in the queue for more than ${idleThresholdmin} minutes.`);

		let embedFilesList = [];
		const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/idleKick.png', 'idleKick.png'); //from: created on MS Word
		embedFilesList.push(embedAuthThumb);

		let IKEmbed = {
			color: 0xeda445,
			author: {
				name: `${cutScrimsPlayer.username} was kicked from the Scrims RPUGs queue for idling.`,
				icon_url: 'attachment://' + embedAuthThumb.name
			},
			description: `They were in the queue for more than ${idleThresholdmin} minutes.`
		};

		await cmdChannels.scrimsCh.send({ files: embedFilesList, embed: IKEmbed}).catch(console.error);
	}
	
	/*
	queuedPlayersTwos.forEach((playerObj) => {
		if (player.username === playerObj.username) {
			throw 'Error: Player already in queue.';
		}
	});
	*/
	
	// Resolve promise
	return false;
}

function idleReset(msg) {
	const userMessage = msg.content.toLowerCase();
    const userID = msg.author.id;
    let playerName = '';

    if ((userMessage === '!queue stay') || (userMessage === '!q stay') || (userMessage === '!qs')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot stay in the queue from here.');
		}
		
		/*
		if (msg.channel.name === cmdChannels.casualCh.name) {
			for (player of queuedPlayers) {
				if (player.discordId == userID) {
					player.joinTime = new Date();
					player.idleAlerted = 0;
					let QSEmbed = {
						color: 0x58f743,
						author: {
							name: `${msg.author.username} (${player.username}) will not be kicked from the Casual RPUGs queue for idling.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						}
					};
					
					return {
						embedMessage: QSEmbed,
						deleteSenderMessage: false
					};
				}
			}
		}
		else if (msg.channel.name === cmdChannels.twosCh.name) {
			for (player of queuedPlayersTwos) {
				if (player.discordId == userID) {
					player.joinTime = new Date();
					player.idleAlerted = 0;
					let QSEmbed = {
						color: 0x58f743,
						author: {
							name: `${msg.author.username} (${player.username}) will not be kicked from the Twos RPUGs queue for idling.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						}
					};
					
					return {
						embedMessage: QSEmbed,
						deleteSenderMessage: false
					};
				}
			}
		}
		else if (msg.channel.name === cmdChannels.scrimsCh.name) {
			for (player of queuedPlayersScrims) {
				if (player.discordId == userID) {
					player.joinTime = new Date();
					player.idleAlerted = 0;
					let QSEmbed = {
						color: 0x58f743,
						author: {
							name: `${msg.author.username} (${player.username}) will not be kicked from the Scrims RPUGs queue for idling.`,
							icon_url: `${msg.author.displayAvatarURL()}`
						}
					};
					
					return {
						embedMessage: QSEmbed,
						deleteSenderMessage: false
					};
				}
			}
		}
		*/
		
		if ((msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name)) {
			let refreshed = 0;
			for (let player of queuedPlayers) {
				if (player.discordId == userID) {
					playerName = player.username;
					player.joinTime = new Date();
					player.idleAlerted = 0;
					refreshed = 1;
				}
			}
			for (let player of queuedPlayersTwos) {
				if (player.discordId == userID) {
					playerName = player.username;
					player.joinTime = new Date();
					player.idleAlerted = 0;
					refreshed = 1;
				}
			}
			for (let player of queuedPlayersScrims) {
				if (player.discordId == userID) {
					playerName = player.username;
					player.joinTime = new Date();
					player.idleAlerted = 0;
					refreshed = 1;
				}
			}
			
			if (refreshed) {
				let QSEmbed = {
					color: 0x58f743,
					author: {
						name: `${msg.author.username} (${playerName}) will not be kicked from the queue/s for idling.`,
						icon_url: `${msg.author.displayAvatarURL()}`
					}
				};
				
				return {
					embedMessage: QSEmbed,
					deleteSenderMessage: false
				};
			}
		}
		else {
			return errorMsg('You cannot stay in the queue from here.');
		}
		// Error - not in queue
		return errorMsg(`Error: ${msg.author.username} is not in this queue.`);
	}
}

export { queue, kickFromQueue, idleCheck, idleReset, getQueues };