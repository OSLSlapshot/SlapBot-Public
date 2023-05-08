import { cmdChannels } from '../index.js';
import fetchTip from '../utls/fetchTip.js';
import Discord from 'discord.js';

async function callServerTip(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage == '!servertip') || (userMessage == '!st')) {
		if ((!msg.guild) || (msg.channel.name === cmdChannels.casualCh.name) || (msg.channel.name === cmdChannels.twosCh.name) || (msg.channel.name === cmdChannels.scrimsCh.name) || (msg.channel.name === cmdChannels.otherCh.name)) {
			
			let returnObj = await serverTip();
			if (msg.guild) {
				returnObj.deleteSenderMessage = true;
			}
			
			return returnObj;
			
		}
	}
}

async function serverTip() {

	const selTip = fetchTip();
			
	let embedFilesList = [];
	const embedThumb = new Discord.AttachmentBuilder('./thumbnails/slapshot.png', {name: 'slapshot.png'}); //from: https://cdn.discordapp.com/emojis/654842872532566041.png?v=1
	embedFilesList.push(embedThumb);
	
	let tipEmbed = {
		color: 0xffa500,
		title: 'OSL Knowledge Drop <:business:728089147125792774>',
		description: selTip,
		thumbnail: {
			url: 'attachment://' + embedThumb.name,
		},
	};
	
	return {
		embedMessage: tipEmbed,
		embedFiles: embedFilesList,
	};
}

export { callServerTip, serverTip };