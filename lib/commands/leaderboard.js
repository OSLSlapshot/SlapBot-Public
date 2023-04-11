import { sortByRatings, sortByRatingsTwos, sortByRatingsScrims } from '../utls/sortByRatings';
import { queryPlayerDatabase, queryTeamDatabase } from '../queries';
import { cmdChannels } from '../';
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
async function leaderboard(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!leaderboard') || (userMessage === '!lb')) {
		//check if DM
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot use that command here.');
		}
		
		//if casual channel, fetch casual data from 1 - 20
		if (msg.channel.name === cmdChannels.casualCh.name) {
			return await displayLB('casual',1);
		}
		//if twos channel, fetch twos data from 1 - 20
		else if (msg.channel.name === cmdChannels.twosCh.name) {
			return await displayLB('twos',1);
		}
		else if (msg.channel.name === cmdChannels.scrimsCh.name) {
			return await displayLB('scrims',1);
		}
		//else error- can't use here
		else {
			return errorMsg('You cannot use that command here.');
		}
		
	}
	else if ((userMessage === '!leaderboardcasual') || (userMessage === '!lbc') || (userMessage === '!leaderboardtwos') ||  (userMessage === '!lbt') || (userMessage === '!leaderboardscrims') ||  (userMessage === '!lbs')) {
		if ((userMessage === '!leaderboardcasual') || (userMessage === '!lbc')) {
			// fetch casual data from 1 - 20
			return await displayLB('casual',1);
		}
		else if ((userMessage === '!leaderboardtwos') || (userMessage === '!lbt')) {
			//fetch twos data from 1 - 20
			return await displayLB('twos',1);
		}
		else {
			return await displayLB('scrims',1);
		}
	}
	else if ((userMessage.startsWith('!leaderboard')) || (userMessage.startsWith('!lb'))) {
		if (enforceWordCount(userMessage, 2)) {
			//check second arg is int
			if (!(/^\d+$/.test(getWord(userMessage,2)))) {
				return errorMsg('The input must be a number.');
			}
			
			const calledCmd = getWord(userMessage, 1);
			
			if ((calledCmd === '!leaderboard') || (calledCmd === '!lb')) {
				//check if DM
				if (msg.channel.type === 'dm') {
					return errorMsg('You cannot use that command here.');
				}
				
				//if casual channel, fetch casual data from second argument onwards for 20 positions
				if (msg.channel.name === cmdChannels.casualCh.name) {
					return await displayLB('casual',parseInt(getWord(userMessage,2)));
				}
				//if twos channel, fetch twos data from second argument onwards for 20 positions
				else if (msg.channel.name === cmdChannels.twosCh.name) {
					return await displayLB('twos',parseInt(getWord(userMessage,2)));
				}
				else if (msg.channel.name === cmdChannels.scrimsCh.name) {
					return await displayLB('scrims',parseInt(getWord(userMessage,2)));
				}
				//else error- can't use here
				else {
					return errorMsg('You cannot use that command here.');
				}	
			}
			else if ((calledCmd === '!leaderboardcasual') || (calledCmd === '!lbc')) {
				//fetch casual data from second argument onwards for 20 positions
				return await displayLB('casual',parseInt(getWord(userMessage,2)));
			}
			else if ((calledCmd === '!leaderboardtwos') || (calledCmd === '!lbt')) {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB('twos',parseInt(getWord(userMessage,2)));
			}
			else if ((calledCmd === '!leaderboardscrims') || (calledCmd === '!lbs')) {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB('scrims',parseInt(getWord(userMessage,2)));
			}
			else {
				return errorMsg('Please make sure to type the right command.');
			}
		}
		else {
			//error- expected 0 or 1 inputs
			return errorMsg('Either this command does not exist, or expected 0 or 1 inputs for this command.');
		}
	}

    // Resolve promise
    return false;
}

async function displayLB(mode,startPos) {
	// Fetches info for all players from the database
	if (mode === 'scrims') {
		var result = await queryTeamDatabase();
	}
	else {
		var result = await queryPlayerDatabase();
	}
	
	if (mode === 'casual') {
		result.sort(sortByRatings);
		// Format message
		//const activeResult=[];
		let count = 0;
		let countLB = 0;
		
		const delim = "   ";
		
		let message = '```\n';
		//message += `${padSides('#',3)} ${'Name'.padEnd(16)${delim}${padSides('R',4)}${delim}${padSides('M-W-L',11)}${delim}Last Match\n`;
		message += `${padSides('#',3)} ${'Name'.padEnd(16)}${delim}${padSides('R',4)}${delim} M   W   L \n`;
		message += '```';
		message += '```';
		//message += '**Casual Leaderboard**\n========================================\nName    Rating    M-W-L    Last Played\n----------------------------------------\n';
		//message += 'Casual Leaderboard (Name / Rating / M-W-L / Last Played)\n=================================================================\n';
		
		for (const [index, player] of result.entries()) {
			if (((player.casualWins + player.casualLosses) >= 5) && (countLB < 15) && (!(isBanned(player.discordId)))) {	//add condition for checking last played
				//activeResult.push(result[index]);
				count += 1;
				if (count >= startPos) {
					//const LP = new Date(player.casualLastPlayed);
					//const LPformat = `${LP.getUTCDate()}/${LP.getUTCMonth() + 1}/${LP.getUTCFullYear()}`;
					
					// Limit to top 15 players to avoid chat overflow
					//message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(20) + delim + `${player.casualRating}`.padEnd(4) + delim + padSides(`${player.casualWins+player.casualLosses}-${player.casualWins}-${player.casualLosses}`,11) + delim + `${LPformat}`.padEnd(10) + `\n`;
					message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(16) + delim + `${player.casualRating}`.padEnd(4) + delim + `${padSides(player.casualWins+player.casualLosses,3)} ${padSides(player.casualWins,3)} ${padSides(player.casualLosses,3)}\n`;
					countLB += 1;
				}
			}
		}
		message += '```';
		
		if (message.slice(-6) === '``````') {
			message = message.slice(0,-6);
			message += '\n*Nothing to see here*';
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/lbCasual.png', 'lbCasual.png'); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
		embedFilesList.push(embedThumb);

		let lbEmbed = {
			color: 0xd4af37,
			title: 'Casual RPUGs Leaderboard',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			description: message,
		};
		
		// Returns the message to print
		return {
			embedMessage: lbEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	else if (mode === 'twos') {
		result.sort(sortByRatingsTwos);
		// Format message
		let count = 0;
		let countLB = 0;
		
		const delim = "   ";
		
		let message = '```\n';
		//message += `${padSides('#',3)} ${'Name'.padEnd(16)${delim}${padSides('R',4)}${delim}${padSides('M-W-L',11)}${delim}Last Match\n`;
		message += `${padSides('#',3)} ${'Name'.padEnd(16)}${delim}${padSides('R',4)}${delim} M   W   L \n`;
		message += '```';
		message += '```';
		//message += 'Twos Leaderboard (Name / Rating / M-W-L / Last Played)\n=================================================================\n';
		
		for (const [index, player] of result.entries()) {
			if (((player.twosWins + player.twosLosses) >= 5) && (countLB < 15) && (!(isBanned(player.discordId)))) {	//add condition for checking last played
				//activeResult.push(result[index]);
				count += 1;
				if (count >= startPos) {
					//const LP = new Date(player.casualLastPlayed);
					//const LPformat = `${LP.getUTCDate()}/${LP.getUTCMonth() + 1}/${LP.getUTCFullYear()}`;
					// Limit to top 20 players to avoid chat overflow
					//message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(20) + delim + `${player.twosRating}`.padEnd(4) + delim + padSides(`${player.twosWins+player.twosLosses}-${player.twosWins}-${player.twosLosses}`,11) + delim + `${LPformat}`.padEnd(10) + `\n`;
					message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(16) + delim + `${player.twosRating}`.padEnd(4) + delim + `${padSides(player.twosWins+player.twosLosses,3)} ${padSides(player.twosWins,3)} ${padSides(player.twosLosses,3)}\n`;
					countLB += 1;
				}
			}
		}
		message += '```';
		
		if (message.slice(-6) === '``````') {
			message = message.slice(0,-6);
			message += '\n*Nothing to see here*';
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/lbTwos.png', 'lbTwos.png'); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
		embedFilesList.push(embedThumb);

		let lbEmbed = {
			color: 0xd4af37,
			title: 'Twos RPUGs Leaderboard',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			description: message,
		};
		
		// Returns the message to print
		return {
			embedMessage: lbEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	else if (mode === 'scrims') {
		result.sort(sortByRatingsScrims);
		// Format message
		let count = 0;
		let countLB = 0;
		
		const delim = "   ";
		
		let message = '```\n';
		//message += `${padSides('#',3)} ${'Name'.padEnd(16)${delim}${padSides('R',4)}${delim}${padSides('M-W-L',11)}${delim}Last Match\n`;
		message += `${padSides('#',3)} ${'Name'.padEnd(16)}${delim}${padSides('R',4)}${delim} M   W   L \n`;
		message += '```';
		message += '```';
		//message += 'Twos Leaderboard (Name / Rating / M-W-L / Last Played)\n=================================================================\n';
		
		for (const [index, team] of result.entries()) {
			//if (((player.teamWins + player.teamLosses) >= 1) && (countLB < 15) && (!(isBanned(player.discordId)))) {	//add condition for checking last played
			if (((team.teamWins + team.teamLosses) >= 1) && (countLB < 15)) {
				//activeResult.push(result[index]);
				count += 1;
				if (count >= startPos) {
					//const LP = new Date(player.casualLastPlayed);
					//const LPformat = `${LP.getUTCDate()}/${LP.getUTCMonth() + 1}/${LP.getUTCFullYear()}`;
					// Limit to top 20 players to avoid chat overflow
					//message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(20) + delim + `${player.twosRating}`.padEnd(4) + delim + padSides(`${player.twosWins+player.twosLosses}-${player.twosWins}-${player.twosLosses}`,11) + delim + `${LPformat}`.padEnd(10) + `\n`;
					message += `${count}.`.padStart(3) + ' ' + team.teamName.padEnd(16) + delim + `${team.teamRating}`.padEnd(4) + delim + `${padSides(team.teamWins+team.teamLosses,3)} ${padSides(team.teamWins,3)} ${padSides(team.teamLosses,3)}\n`;
					countLB += 1;
				}
			}
		}
		message += '```';
		
		if (message.slice(-6) === '``````') {
			message = message.slice(0,-6);
			message += '\n*Nothing to see here*';
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/OSLLogo.jpg', 'OSLLogo.jpg'); //from:
		embedFilesList.push(embedThumb);

		let lbEmbed = {
			color: 0xd4af37,
			title: 'Scrims RPUGs Leaderboard',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			description: message,
		};
		
		// Returns the message to print
		return {
			embedMessage: lbEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	//Resolve promise
	return false;
}

export default leaderboard;
