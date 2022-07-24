import { queryTeamDatabase } from '../queries';
import enforceWordCount from '../utls/enforceWordCount';
import getWord from '../utls/getWord';
import padSides from '../utls/padSides';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage';
import isBanned from '../utls/isBanned';

/**
 * Command to print out the leaderboard of top players
 * Syntax: !leaderboard
 */
async function teamList(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!teamlist') || (userMessage === '!tl')) {
		return await displayTL(1);
		
	}
	else if ((userMessage.startsWith('!teamlist ')) || (userMessage.startsWith('!tl '))) {
		if (enforceWordCount(userMessage, 2)) {
			//check second arg is int
			if (!(/^\d+$/.test(getWord(userMessage,2)))) {
				return errorMsg('The input must be a number.');
			}
			return await displayTL(parseInt(getWord(userMessage,2)));
		}
		else {
			//error- expected 0 or 1 inputs
			return errorMsg('Either this command does not exist, or expected 0 or 1 inputs for this command.');
		}
	}

    // Resolve promise
    return false;
}

async function displayTL(startPos) {
	// Fetches info for all players from the database
	const result = await queryTeamDatabase();
	
	let count = 0;
	let countTL = 0;
		
	const delim = "   ";
		
	let message = '```\n';
	message += `${padSides('ID',4)} ${'Name'.padEnd(16)}\n`;
	message += '```';
	message += '```';

		
	for (const [index, team] of result.entries()) {
		if (countTL < 15) {	//add condition for checking last played
			count += 1;
			if (count >= startPos) {
				message += team.teamID.padStart(4) + ' ' + team.teamName + `\n`;
				countTL += 1;
				
			}
		}
	}
	message += '```';
	
	if (message.slice(-6) === '``````') {
		message = message.slice(0,-6);
		message += '\n*Nothing to see here*';
	}
		
	//let embedFilesList = [];
	//const embedThumb = new Discord.MessageAttachment('./thumbnails/lbCasual.png', 'lbCasual.png'); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
	//embedFilesList.push(embedThumb);

	let lbEmbed = {
		color: 0xd4af37,
		title: 'RPUGs Team List',
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

export default teamList;
