import { isCurrentCaptain, getDraftFromDiscordId } from '../scripts/draftClass.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import stripUsername from '../utls/stripUsername.js';
import errorMsg from '../scripts/errorMessage.js';
import { floor,random } from 'mathjs';

async function draft(msg) {
    const userMessage = msg.content;
    if ((userMessage.toLowerCase().startsWith('!draft ')) || (userMessage.toLowerCase().startsWith('!d ')) || (userMessage.toLowerCase() === '!randomdraft') || (userMessage.toLowerCase() === '!rd')) {
        // Action
		if ((userMessage.toLowerCase() === '!randomdraft') || (userMessage.toLowerCase() === '!rd')) {
			if (isCurrentCaptain(msg.author.id)) {
				const currentDraft = getDraftFromDiscordId(msg.author.id);
				const draftIdx = Object.keys(currentDraft.remainingPlayers)[Math.floor(Math.random()*(Object.entries(currentDraft.remainingPlayers).length))];
				const response = await currentDraft.draftPlayer(draftIdx);
				if (response){
					if (typeof response === 'object') {
						return response;
					}
					else { return; }
				}
			}
			// Error - not captain
			return errorMsg('You are not a captain for any ongoing matches, or it is not your turn to draft.');
		}
        if (enforceWordCount(userMessage, 2)) {
            if (isCurrentCaptain(msg.author.id)) {
                const userNum = getWord(userMessage, 2);
                const currentDraft = getDraftFromDiscordId(msg.author.id);
                for (const [index,player] of Object.entries(currentDraft.remainingPlayers)) {
                    if (index === userNum) {
                        const response = await currentDraft.draftPlayer(index);
						if (typeof response === 'object') {
							return response;
						}
						else { return; }
                    }
                }

                // Error - no matching username
				return errorMsg('Please enter a valid number.');
            }
            // Error - not captain
			return errorMsg('You are not a captain for any ongoing matches, or it is not your turn to draft.');
        }
        // Error - Syntax
		return errorMsg('Did NOT draft player.','Make sure to type:' + '```' + '!d < number >' + '```');
    }

    // Resolve promise
    return false;
}

export default draft;
