import { cmdChannels } from '../index.js';
import { isMod } from '../utls/isMod.js';
//import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
//import enforceWordCount from '../utls/enforceWordCount.js';
//import getWord from '../utls/getWord.js';
//import stripUsername from '../utls/stripUsername.js';
import { revertMatchQuery } from '../queries/index.js';
//import createMatch from '../scripts/createMatch.js';
//import updatePlayerRatings from '../scripts/updatePlayerRatings.js';
//import recordMatch from '../scripts/recordMatch.js';
//import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
 
async function revertMatch(msg) {
	const commandCalls = ['!revert','!rev'];
	const msgAuthorId = msg.author.id;
	const userArgs = msg.content.trimEnd().match(/\S+/g);	//from here: https://stackoverflow.com/questions/9401897/split-a-string-using-whitespace-in-javascript

	if ((userArgs) && (commandCalls.includes(userArgs[0].toLowerCase()))) {
		if (!isMod(msgAuthorId)) {
			 // Error - not admin
			return errorMsg('This command is for admins only.',null,true);
		}
		
		if (userArgs.length !== 1) {
			return errorMsg(
				"Expected 0 inputs for this command."
			);
		}
		
		await revertMatchQuery();
		
		let RMEmbed = {
			color: 0x6de3f7,
			title: 'The last match was reverted.',
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			footer: {
					text: `Match reverted by Admin ${msgAuthorId} ${msg.author.username}.`,
					icon_url: msg.author.displayAvatarURL(),
				}
		};
		
		await cmdChannels.modCh.send({ embeds: [RMEmbed]}).catch(console.error);
		await cmdChannels.updatesCh.send({ embeds: [RMEmbed]}).catch(console.error);
		
		return {
			embedMessage: RMEmbed,
			//embedFiles: embedFilesList,
			sendToDm: true
		}
	}
}

export default revertMatch;