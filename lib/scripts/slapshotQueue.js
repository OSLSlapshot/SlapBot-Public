//import enforceWordCount from '../utls/enforceWordCount.js';
//import { logger } from '../';
import Discord from 'discord.js';
//import errorMsg from '../scripts/errorMessage.js';
import { getPublicMatchmaking } from '../queries/slapshot.js';
//import { isCommissioner } from '../utls/isMod.js';
import { bot, server, cmdChannels } from '../index.js';
import { getQueues } from '../commands/queue.js';
import { getOngoingDrafts } from './draftClass.js';

async function slapshotQueue() {
	//query slap API
	try {
		var gqResponse = await getPublicMatchmaking();
		return JSON.parse(gqResponse.body);
	}
	catch (err) {
		console.log(gqResponse.body);
		throw err;
	}
}

async function OceNumInSlapPlaylists() {
	
	try {
		const slapQ = await slapshotQueue();
		const qEntities = slapQ["entities"];
		const qPlaylists = slapQ["playlists"]
		
		/*
		let count = 0;
		
		if (qEntities.length === 0) {
			return count;
		}
		
		qEntities.forEach(player => {
			if (player.regions.some( region => region.name === 'Oceania' )) {
				count += player["players"].length;
			}
		});
			
		return count;
		*/
		
		return qPlaylists;
	}
	catch (err) {
		throw err;
	}
}

/*
async function updateSlapQueueVoiceChannel() {
	//This function is not feasible due to Discord's API limits on updating channel names
	
	//const SLAPQ_CH_ID = '939798747460825098';	//test server
	const SLAPQ_CH_ID = '';	//main server
	
	//const foundChannel = await server.channels.cache.find(channels => (channels.id === SLAPQ_CH_ID));
	const foundChannel = await server.channels.cache.get(SLAPQ_CH_ID);
	if (!foundChannel) {
		console.error(`Channel ID ${SLAPQ_CH_ID} not found.`);
		//logger.log('error', `Channel ID ${SLAPQ_CH_ID} not found.`);
		//process.exit(-1);
	}
	
	let queueCount = '';
	try {
		queueCount = await OceNumInSlapQueue();
	}
	catch (err) {
		console.log(err);
		queueCount = 'Err';
	}
	
	await foundChannel.setName(`Rebound Oce Queue: ${queueCount}`).catch(console.error);
	
	return;
}
*/

async function updateSlapQueueTextChannel(firstCall = false) {
	
	const SLAPQ_CH_ID = '939884543920455750';	//test server
	const msgID = '943208131234783264';	//test server
	
	const foundChannel = await server.channels.cache.get(SLAPQ_CH_ID);
	if (!foundChannel) {
		console.error(`Channel ID ${SLAPQ_CH_ID} not found.`);
	}
	
	let playerCount = '';
	let queueCount = '';
	let matchCount = '';
	
	try {
		const playlist = await OceNumInSlapPlaylists();
		queueCount = playlist["in_queue"];
		matchCount = playlist["in_match"];
		playerCount = queueCount + matchCount;
	}
	catch (err) {
		console.log(err);
		queueCount = 'Err';
		matchCount = 'Err';
		playerCount = 'Err';
	}

	//rpugs status
	const queues = getQueues();
	const drafts = getOngoingDrafts();
	
	let casualDraftCount = 0;
	let twosDraftCount = 0;
	let foursDraftCount = 0;
	let scrimsDraftCount = 0;
	
	for (const draft of drafts) {
		if (draft.mode === 'casual') {
			casualDraftCount += 1;
		}
		else if (draft.mode === 'twos') {
			twosDraftCount += 1;
		}
		else if (draft.mode === 'fours') {
			foursDraftCount += 1;
		}
		else if (draft.mode === 'scrims') {
			scrimsDraftCount += 1;
		}
	}
	
	//embed
	let embedFilesList = [];
	const embedThumb = new Discord.MessageAttachment(`./thumbnails/slapReboundLogo.png`, 'slapReboundLogo.png'); //from: Google images
	embedFilesList.push(embedThumb);
	
	const embedFootimg = new Discord.MessageAttachment('./thumbnails/about.png', 'about.png'); //from: me
	embedFilesList.push(embedFootimg);
	
	let QCEmbed = {
		color: 0x3f5bff,
		title: `Rebound Oce Players: ${playerCount}`,
		//description: 'This number only represents those not currently in a match.\n*(Updates every 6 seconds)*\n\u200b\n**RPUGs:**',
		description: `In Queue: ${queueCount}\nIn Match: ${matchCount}\n\u200b\n**RPUGs:**`,
		thumbnail: {
			url: 'attachment://' + embedThumb.name
		},
		fields: [
			{
				name: 'Casual',
				value: `${cmdChannels.casualCh}\nQueue: ${queues.casual.length}\nMatches: ${casualDraftCount}`,
				inline: true
			},
			{
				name: 'Twos',
				value: `${cmdChannels.twosCh}\nQueue: ${queues.twos.length}\nMatches: ${twosDraftCount}`,
				inline: true
			},
			{
				name: 'Fours',
				value: `${cmdChannels.foursCh}\nQueue: ${queues.fours.length}\nMatches: ${foursDraftCount}`,
				inline: true
			},
			{
				name: 'Scrims',
				value: `${cmdChannels.scrimsCh}\nQueue: ${queues.scrims.length}\nMatches: ${scrimsDraftCount}`,
				inline: true
			},
			{
				name: '\u200b',
				value: '*(Updates every 6 seconds)*\n**https://ko-fi.com/OSLCorgo**'
			}
		],
		footer: {
			text: 'Support/Donate (!s/!donate)',
			icon_url: 'attachment://' + embedFootimg.name
		}
	};
	
	//const sentMsg = null;
	let msgObj = await foundChannel.messages.fetch(msgID);
	
	if (firstCall) {
		try {
			bot.user.setActivity(`Oce Pubs: ${queueCount}`,{type: Discord.ActivityType.Watching});
		}
		catch(err) {
			console.log(err);
		}
	}
	
	if (!msgObj) {
		console.error(`Message ID ${msgID} not found in channel ${SLAPQ_CH_ID}.`);
	}
	//if (!(lastMsg)) {
	//	var sentMsg = await foundChannel.send({ files: embedFilesList, embed: QCEmbed}).catch(console.error);
	//	bot.user.setActivity(`Oce Pubs: ${queueCount}`,{type: "WATCHING"}).catch(console.error);
	//}
	
	let prevQ = '';
	try {
		prevQ = parseInt(msgObj["embeds"][0].title.match(/\d+/g).join([]));
	}
	catch (err) {}
	
	if ( prevQ !== queueCount) {
		try {
			bot.user.setActivity(`Oce Pubs: ${queueCount}`,{type: Discord.ActivityType.Watching});
		}
		catch(err) {
			console.log(err);
		}
		//	return lastMsg;
	}
	
	if (msgObj) {
		var sentMsg = await msgObj.edit({ files: embedFilesList, embeds: [QCEmbed]}).catch(console.error);
	}
	
	return sentMsg;
}


export { updateSlapQueueTextChannel };
