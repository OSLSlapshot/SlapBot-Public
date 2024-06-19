import { isMod } from '../utls/isMod.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import { removeDraft } from '../scripts/draftClass.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
async function forceRemoveDraft(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage.startsWith('!removedraft ')) || (userMessage.startsWith('!rd ')) || (userMessage.startsWith('!cancel '))) {
        if (!isMod(msg.author.id)) {
			// Error - not admin
			return errorMsg('This command is for administrators only.');
		}
		
		if (!enforceWordCount(userMessage, 2)) {
			// Error - Syntax
			return errorMsg(`Did NOT cancel match.`,'Please use' + '```' + '!rd / !cancel  <index>' + '```',true);
		}
		
		const arrayIndex = Number(getWord(userMessage, 2));
		if (isNaN(arrayIndex)) {
			// Error - Not a number
			return errorMsg(`${arrayIndex} must be a number.`,null,true);
		}
		
		if (await removeDraft(arrayIndex, { cancelCalled: true, adminAuthor: msg.author})) {
			let embedFilesList = [];
			const embedThumb = new Discord.AttachmentBuilder('./thumbnails/reportMatch.png', {name: 'reportMatch.png'}); //from:
			embedFilesList.push(embedThumb);
			
			let cancelEmbed = {
				color: 0x000000,
				author: {
					name: `Draft was removed.`,
					icon_url: 'attachment://' + embedThumb.name
				},
			};
			
			return {
				embedMessage: cancelEmbed,
				embedFiles: embedFilesList,
				sendToDm: true
			};
		}
		// Error - No matching index
		return errorMsg('No matching index.',null,true);
	}
}

export default forceRemoveDraft;
