import { isMod } from '../utls/isMod.js';
import { cmdChannels } from '../index.js';
import cfg from '../../config.js';
//import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *	Syntax: !listDrafts
 */
function staffList(msg) {
    const userMessage = msg.content.toLowerCase();
    if (userMessage === '!staff') {
        if (!isMod(msg.author.id)) {
			// Error - not admin
			return errorMsg("This command is for administrators only.");
		}
		
		const commissionerMentions = cfg.moderators.commissioners.map(c => `<@${c}>`);
		const adminMentions = cfg.moderators.admins.map(c => `<@${c}>`);
		
		let staffEmbed = {
			color: 0x0047ab,
			title: 'Staff List',
			description: `Commissioners: ${commissionerMentions.join(', ')}\nAdmins: ${adminMentions.join(', ')}`
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
		};
		
		if (msg.channel.name === cmdChannels.modCh.name) {
			return {
				embedMessage: staffEmbed,
				embedFiles: [],
				deleteSenderMessage: false,
			};
		}
		else {
			return {
				embedMessage: staffEmbed,
				embedFiles: [],
				deleteSenderMessage: false,
				sendToDm: true,
			};
		}
	}
}

export default staffList;
