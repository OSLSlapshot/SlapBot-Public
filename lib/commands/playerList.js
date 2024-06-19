import { queryPlayerList } from '../queries/index.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import isBanned from '../utls/isBanned.js';

/**
 * Command to print out the leaderboard of top players
 * Syntax: !leaderboard
 */
async function playerList(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!playerlist') || (userMessage === '!pl')) {
		return await displayPL(1);
		
	}
	else if ((userMessage.startsWith('!playerlist ')) || (userMessage.startsWith('!pl '))) {
		if (enforceWordCount(userMessage, 2)) {
			//check second arg is int
			if (!(/^\d+$/.test(getWord(userMessage,2)))) {
				return errorMsg('The input must be a number.');
			}
			return await displayPL(parseInt(getWord(userMessage,2)));
		}
		else {
			//error- expected 0 or 1 inputs
			return errorMsg('Either this command does not exist, or expected 0 or 1 inputs for this command.');
		}
	}

    // Resolve promise
    return false;
}

async function displayPL(startPos) {
	// Fetches info for all players from the database
	const result = await queryPlayerList();
	
	let count = -1; //not 0 to skip first loop iteration and not list P0
	let countPL = 0;
		
	const delim = "   ";
		
	let message = '```\n';
	message += `${padSides('ID',4)} ${'Name'.padEnd(16)}\n`;
	message += '```';
	message += '```';

		
	for (const [index, player] of result.entries()) {
		if (countPL < 15) {	//add condition for checking last played
			count += 1;
			if (count >= startPos) {
				message += player.playerId.padStart(4) + ' ' + player.username.padEnd(16) + `\n`;
				countPL += 1;
				
			}
		}
	}
	message += '```';
	
	if (message.slice(-6) === '``````') {
		message = message.slice(0,-6);
		message += '\n*Nothing to see here*';
	}
		
	//let embedFilesList = [];
	//const embedThumb = new Discord.AttachmentBuilder('./thumbnails/lbCasual.png', 'lbCasual.png'); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
	//embedFilesList.push(embedThumb);

	let lbEmbed = {
		color: 0xd4af37,
		title: 'RPUGs Player List',
		//thumbnail: {
		//	url: 'attachment://' + embedThumb.name
		//},
		description: message,
	};
	
	// Returns the message to print
	return {
		embedMessage: lbEmbed,
		//embedFiles: embedFilesList,
		deleteSenderMessage: false
	};
}

export default playerList;
