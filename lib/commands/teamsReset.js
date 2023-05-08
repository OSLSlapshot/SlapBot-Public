import { cmdChannels } from '../index.js';
import { isCommissioner } from '../utls/isMod.js';
import { getDirectories} from '../scripts/initDatabase.js';
import fs from 'fs';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
 
function getFiles(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isFile();
  });
}
 
async function teamsReset(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!teamsreset')) {
        if (isCommissioner(msg.author.id)) {
			const dataDir = './Database/data/';
			const tempsDir = './Database/templates/';
			
			let datesDirs = getDirectories(dataDir);
			const searchStr = '(current)';
			for (const dir of datesDirs) {
				if (dir.slice(-searchStr.length) === searchStr) {
					var currDataDir = dir;
				}
			}
			
			let currDataDirFiles = getFiles(dataDir + currDataDir);
			
			const searchFileStr = 'Teams';
			let teamFiles = [];
			for (const dataFile of currDataDirFiles) {
				if (dataFile.substring(0,searchFileStr.length) == searchFileStr) {
					teamFiles.push(dataFile);
				}
			}
			
			const now = new Date();
			now.setHours(now.getHours() + 10); //AEST
			const file_name = `${now.getUTCFullYear()}`+`${now.getUTCMonth()+1}`.padStart(2,"0")+`${now.getUTCDate()}`.padStart(2,"0");
			
			fs.rename(dataDir + currDataDir + '/Teams.txt', dataDir + currDataDir + '/Teams'+ `${teamFiles.length}_${file_name}` +'.txt', err => {
				if(err) throw err;
				fs.copyFile(tempsDir + 'Teams.txt', dataDir + currDataDir + '/Teams.txt', err => {
					if (err) throw err;
				});
			});
			
			let embedFilesList = [];
			const embedThumb = new Discord.AttachmentBuilder('./thumbnails/softReset.png', {name: 'softReset.png'}); //from: made on MS Word
			embedFilesList.push(embedThumb);
			
			let TREmbed = {
				color: 0x6de3f7,
				title: 'Teams reset successful.',
				thumbnail: {
					url: 'attachment://' + embedThumb.name
				},
				footer: {
						text: `Soft Reset by Commissioner ${msg.author.id} ${msg.author.username}.`,
						icon_url: msg.author.displayAvatarURL(),
					}
			};
			
			await cmdChannels.modCh.send({ files: embedFilesList, embeds: [TREmbed]}).catch(console.error);
			
			return {
				embedMessage: TREmbed,
				embedFiles: embedFilesList,
				sendToDm: true
			}; 
        }

        // Error - not commissioner
		return errorMsg('This command is for commissioners only.',null,true);
    }
}

export default teamsReset;
