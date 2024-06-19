import { isMod } from '../utls/isMod.js';
import { shopTrackerController } from '../index.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to refresh daily shop
 *  Syntax: !refreshshop
 */

async function refreshShop(msg) {
	const userMessage = msg.content.toLowerCase();
	if (userMessage === '!refreshshop') {
		if (!isMod(msg.author.id)) {
			// Error - not admin
			return errorMsg("This command is for administrators only.");
		}
		
		await shopTrackerController.runTracker();
		
		return {
			msgContent: 'Shop refreshed',
			deleteSenderMessage: false
		}
	}
}

export default refreshShop;