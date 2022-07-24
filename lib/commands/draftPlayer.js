import { isCurrentCaptain, getDraftFromDiscordId } from '../scripts/draftClass';
import enforceWordCount from '../utls/enforceWordCount';
import getWord from '../utls/getWord';
import stripUsername from '../utls/stripUsername';
import errorMsg from '../scripts/errorMessage';

async function draft(msg) {
    const userMessage = msg.content;
    if ((userMessage.toLowerCase().startsWith('!draft ')) || (userMessage.toLowerCase().startsWith('!d '))) {
        // Action
        if (enforceWordCount(userMessage, 2)) {
            if (isCurrentCaptain(msg.author.id)) {
                const userNum = getWord(userMessage, 2);
                const currentDraft = getDraftFromDiscordId(msg.author.id);
                for (const [index,player] of Object.entries(currentDraft.remainingPlayers)) {
                    if (index === userNum) {
                        await currentDraft.draftPlayer(index);
                        return;
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
