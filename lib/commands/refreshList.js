import { cmdChannels } from '../index';
import { writeLeagueList, writeBanList, writeTipList } from '../queries';
import { isMod } from '../utls/isMod';
import enforceWordCount from '../utls/enforceWordCount';
import getWord from '../utls/getWord';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage';

/**
 * Command to print out the current version of the bot
 *  Syntax: !version
 */
async function refreshList(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage.startsWith('!refreshlist')) || (userMessage.startsWith('!rl'))) {
		if (enforceWordCount(userMessage, 2)) {
			if ((getWord(userMessage,1) != '!refreshlist') && (getWord(userMessage,1) != '!rl')) {
				return errorMsg('Please make sure to type the right command.');
			}
			if (isMod(msg.author.id)) {
				const allowed_inps = ['league','l','ban','b','servertip','st'];
				if (allowed_inps.includes(getWord(userMessage,2))) {
					
					let embedFilesList = [];
					const embedThumb = new Discord.MessageAttachment('./thumbnails/refreshList.png', 'refreshList.png'); //from:
					embedFilesList.push(embedThumb);
					
					let rlEmbed = {
						color: 0x000000,
						author: {
							icon_url: 'attachment://' + embedThumb.name
						},
					};
					
					if ((getWord(userMessage,2) == 'league') || (getWord(userMessage,2) == 'l')) {
						await writeLeagueList();
						rlEmbed.author.name = `League players list was refreshed.`;
					}
					else if ((getWord(userMessage,2) == 'ban') || (getWord(userMessage,2) == 'b')) {
						await writeBanList();
						rlEmbed.author.name = `Banned players list was refreshed.`;
					}
					else if ((getWord(userMessage,2) == 'servertip') || (getWord(userMessage,2) == 'st')) {
						await writeTipList();
						rlEmbed.author.name = `Server tips list was refreshed.`;
					}
					
					await cmdChannels.modCh.send({ files: embedFilesList, embed: rlEmbed}).catch(console.error);
					
					return {
						embedMessage: rlEmbed,
						embedFiles: embedFilesList,
						sendToDm: true
					};
				}
				else {
					return errorMsg('Please provide a valid input. Allowed inputs: league/l, ban/b');
				}
			}
			else {
				return errorMsg('This command is for administrators only.');
			}
		}
		else {
			//error- expected 0 or 1 inputs
			return errorMsg('Expected 1 input for this command.');
		}
	}
	// Resolve promise
    return false;
}

export default refreshList;
