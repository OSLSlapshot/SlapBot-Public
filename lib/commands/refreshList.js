import { cmdChannels } from '../index.js';
import { writeSelectList, writeLeagueList, writeBanList, writeTipList } from '../queries/index.js';
import { isMod } from '../utls/isMod.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

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
				const allowed_inps = ['select','sel','league','l','ban','b','servertip','st'];
				if (allowed_inps.includes(getWord(userMessage,2))) {
					
					let embedFilesList = [];
					const embedThumb = new Discord.AttachmentBuilder('./thumbnails/refreshList.png', {name: 'refreshList.png'}); //from:
					embedFilesList.push(embedThumb);
					
					let rlEmbed = {
						color: 0x000000,
						author: {
							icon_url: 'attachment://' + embedThumb.name
						},
					};
					
					if ((getWord(userMessage,2) == 'select') || (getWord(userMessage,2) == 'sel')) {
						await writeSelectList();
						rlEmbed.author.name = `Select players list was refreshed.`;
					}
					else if ((getWord(userMessage,2) == 'league') || (getWord(userMessage,2) == 'l')) {
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
					
					await cmdChannels.modCh.send({ files: embedFilesList, embeds: [rlEmbed]}).catch(console.error);
					
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
