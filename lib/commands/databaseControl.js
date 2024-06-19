import { isCommissioner } from '../utls/isMod.js';
//import { cmdChannels } from '../index.js';
//import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import { genNewDataStruct } from '../queries/index.js';
import getWord from '../utls/getWord.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
async function genPlayerList(msg) {
    const userMessage = msg.content.toLowerCase();
    if (userMessage.startsWith('!dostuff')) {
        if (!isCommissioner(msg.author.id)) {
			// Error - not admin
			return errorMsg('This command is for commissioners only.');
		}
		
		if (await genNewDataStruct(getWord(userMessage,2))) {
			return {
				msgContent: 'lfg',
				deleteSenderMessage: false
			};
		}
		
		return {
			msgContent: 'stfu',
			deleteSenderMessage: false
		}
    }
}

export default genPlayerList;
