import { cmdChannels } from '../';
import { isCommissioner } from '../utls/isMod';
import { getDirectories, initDatabase } from '../scripts/initDatabase';
import fs from 'fs';
import { softResetDatabaseQuery } from '../queries/';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
async function softReset(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!softreset')) {
        if (isCommissioner(msg.author.id)) {
			const dataDir = './Database/data/';
			
			let datesDirs = getDirectories(dataDir);
			const searchStr = '(current)';
			for (const dir of datesDirs) {
				if (dir.slice(-searchStr.length) === searchStr) {
					var currDataDir = dir;
				}
			}
			
			const prevDataDir = (currDataDir.replace(searchStr,'')).replace(' ','');
			
			fs.renameSync(dataDir+currDataDir, dataDir+prevDataDir, (err) => {
				if(err) {
					throw err;
				}
			});
			
			if (initDatabase()) {
				datesDirs = getDirectories(dataDir);
				for (const dir of datesDirs) {
					if (dir.slice(-searchStr.length) === searchStr) {
						var newDataDir = dir;
					}
				}
			}
			else {
				return errorMsg('Failed to set up new database.');
			}
			
			fs.copyFileSync(dataDir+prevDataDir+`/Players.txt`, dataDir+newDataDir+`/Players.txt`);
			fs.copyFileSync(dataDir+prevDataDir+`/Teams.txt`, dataDir+newDataDir+`/Teams.txt`);
			
			await softResetDatabaseQuery();
			
			let embedFilesList = [];
			const embedThumb = new Discord.MessageAttachment('./thumbnails/softReset.png', 'softReset.png'); //from: made on MS Word
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
			
			await cmdChannels.modCh.send({ files: embedFilesList, embed: SREmbed}).catch(console.error);
			
			return {
				embedMessage: SREmbed,
				embedFiles: embedFilesList,
				sendToDm: true
			}; 
        }

        // Error - not commissioner
		return errorMsg('This command is for commissioners only.',null,true);
    }
}

export default softReset;
