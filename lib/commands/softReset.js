import { cmdChannels } from '../index.js';
import { isCommissioner } from '../utls/isMod.js';
import { getDirectories, initDatabase } from '../scripts/initDatabase.js';
import fs from 'fs';
import { softResetDatabaseQuery } from '../queries/index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to soft reset database- stops recording data into current season, and starts a new season with the current date and maintains the registered players
 *  Syntax: !softreset
 */
async function softReset(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!softreset')) {
        if (!isCommissioner(msg.author.id)) {
			// Error - not commissioner
			return errorMsg('This command is for commissioners only.',null,true);
		}

		if (await softResetDatabaseQuery()) {
		
			let embedFilesList = [];
			const embedThumb = new Discord.AttachmentBuilder('./thumbnails/softReset.png', {name: 'softReset.png'}); //from: made on MS Word
			embedFilesList.push(embedThumb);
			
			let SREmbed = {
				color: 0x6de3f7,
				title: 'Soft reset successful.',
				thumbnail: {
					url: 'attachment://' + embedThumb.name
				},
				footer: {
						text: `Soft Reset by Commissioner ${msg.author.id} ${msg.author.username}.`,
						icon_url: msg.author.displayAvatarURL(),
					}
			};
			
			await cmdChannels.modCh.send({ files: embedFilesList, embeds: [SREmbed]}).catch(console.error);
			
			return {
				embedMessage: SREmbed,
				embedFiles: embedFilesList,
				sendToDm: true
			};
		}
		
		return errorMsg('Soft reset failed.'); 
	}
}

export default softReset;
