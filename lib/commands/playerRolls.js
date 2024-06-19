import { isMod } from '../utls/isMod.js';
//import enforceWordCount from '../utls/enforceWordCount.js';
//import getWord from '../utls/getWord.js';
//import { removeDraft } from '../scripts/draftClass.js';
import { bot } from '../index.js';
import { seasonRollQuery } from '../queries/index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
async function seasonRoll(msg) {
    const userMessage = msg.content.toLowerCase();
    if (userMessage === '!seasonroll') {
        if (isMod(msg.author.id)) {
            const rollResult = await seasonRollQuery();
			
			if (!rollResult) {
				return errorMsg('No active player found in this season\'s database.');
			}
			else if (rollResult === 'MatchRequirement') {	//minimum match number condition not satisfied
				return errorMsg('Minimum match number requirement not satisfied.');
			}

			/*
			let rollCount = {'GurGur': 0, 'Krypto': 0, 'aros': 0, 'Turgulu': 0, 'Dandy': 0, 'endEd': 0};
			for (let i = 0; i <1000; i++) {
				 const rollResult = await seasonRollQuery();
				 rollCount[rollResult.Winner.username] += 1;
			}
			
			console.log(rollCount);
			*/
			
			//description formatting
			let descStr = '';
			descStr += `Pool Size: ${rollResult.PoolSize}\n`;
			descStr += `Raffle Size: ${rollResult.RaffleSize}\n`;
			descStr += `Sponsor: <@&555295171885924363> and <@424774651831648256>\n\n`;
			descStr += `:tada: The winner is <@${rollResult.Winner.discordId}> (${rollResult.Winner.username})! :tada:\n\n`;
			descStr += 'Congratulations! :partying_face: You are this RPUGs season\'s winner of 50,000 pux <:rich_gang:782892310627221545>';
			
			//let embedFilesList = [];
			
			const winnerAvatarURL = (await bot.users.fetch(rollResult.Winner.discordId).catch(console.error)).displayAvatarURL();
			const modAvatarURL = (await bot.users.fetch(msg.author.id).catch(console.error)).displayAvatarURL();
			
			let rollEmbed = {
				color: 0x33fff5,
				thumbnail: {
					url: winnerAvatarURL
				},
				title: 'RPUGs End-of-Season Roll',
				description: descStr,
				footer: {
					text: `Rolled by Admin ${msg.author.id} ${msg.author.username}.`,
					icon_url: modAvatarURL,
				}
			};
			
			return {
				embedMessage: rollEmbed,
				deleteSenderMessage: true
			};
        }
        // Error - not admin
		return errorMsg('This command is for administrators only.');
    }
}

export default seasonRoll;
