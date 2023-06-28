import { isCommissioner } from '../utls/isMod.js';
import { cmdChannels } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
async function echo(msg) {
    const userMessage = msg.content.toLowerCase();
    if (userMessage.startsWith('!echo ')) {
        if (isCommissioner(msg.author.id)) {
			const genMessage = msg.content.substr(msg.content.indexOf(" ") + 1);
			await cmdChannels.tipsCh.send(genMessage).catch(console.error);
			
			return {
				msgContent: `Echoed message`,
                deleteSenderMessage: false
			}
		}
		// Error - not admin
		return errorMsg('This command is for commissioners only.');
    }
}

export default echo;
