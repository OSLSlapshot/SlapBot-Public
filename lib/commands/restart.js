import { bot, cmdChannels } from '../index.js';
import { isCommissioner } from '../utls/isMod.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to soft reset database- stops recording data into current season, and starts a new season with the current date and maintains the registered players
 *  Syntax: !softreset
 */
async function restart(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!restart')) {
        if (!isCommissioner(msg.author.id)) {
			// Error - not commissioner
			return errorMsg('This command is for commissioners only.',null,true);
		}
		
		if ((msg.channel.name !== cmdChannels.modCh.name)) {
			return errorMsg("You cannot use that command here.");
		}

		await msg.reply({content: 'Restarting SlapBot...'});
		
		try {
			forced[crash];
		}
		catch (err) {
			//console.log('Restarting bot...');
			throw {name: 'Forced Crash', message: 'Restarting bot...'};
		}
	}
}

export default restart;
