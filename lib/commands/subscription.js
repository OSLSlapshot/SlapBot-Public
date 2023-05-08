import enforceWordCount from '../utls/enforceWordCount.js';
import { logger } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

function role(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!subscribe') || (userMessage === '!sub')) {
		//check if DM
		if (!msg.guild) {
			return errorMsg('You cannot use that command here.');
		}
		
        // Action
		const subRole = msg.guild.roles.cache.find(role => role.id === "714332674797600820");
		//const subRole = msg.guild.roles.cache.find(role => role.id === "714332587606278195");	// for test slapbot

		if(msg.member.roles.cache.has(subRole.id)) {
			return errorMsg(`${msg.author.username} is already subscribed to ${subRole.name}.`,null,null,true);
		}
		
		msg.member.roles.add(subRole);
		const message = `${msg.author.username} has subscribed to ${subRole.name}.`;
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/subscribe.png', {name: 'subscribe.png'}); //from: https://cdn.discordapp.com/emojis/587242207568986112.png?v=1
		embedFilesList.push(embedThumb);
		
		let subEmbed = {
			color: 0x6615bd,
			author: {
				name: message,
				icon_url: 'attachment://' + embedThumb.name
			}
		};
		
		logger.log('info',`User ID ${msg.author.id} ${msg.author.username} has subscribed to ${subRole.name}.`);
		
		return {
			embedMessage: subEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: true
		};
    }

    if ((userMessage === '!unsubscribe') || (userMessage === '!unsub')) {
		//check if DM
		if (!msg.guild) {
			return errorMsg('You cannot use that command here.');
		}
		
        // Action
		const subRole = msg.guild.roles.cache.find(role => role.id === "714332674797600820");
		//const subRole = msg.guild.roles.cache.find(role => role.id === "714332587606278195");	//for test slapbot

		if(!(msg.member.roles.cache.has(subRole.id))) {
			return errorMsg(`${msg.author.username} is already not subscribed to ${subRole.name}.`,null,null,true);
		}
		
		msg.member.roles.remove(subRole);
		const message = `${msg.author.username} has unsubscribed from ${subRole.name}.`;
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/unsubscribe.png', {name: 'unsubscribe.png'}); //from: https://cdn.discordapp.com/emojis/587242207568986112.png?v=1
		embedFilesList.push(embedThumb);
		
		let subEmbed = {
			color: 0x6615bd,
			author: {
				name: message,
				icon_url: 'attachment://' + embedThumb.name
			}
		};
		
		logger.log('info',`User ID ${msg.author.id} ${msg.author.username} has unsubscribed from ${subRole.name}.`);
		
		return {
			embedMessage: subEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: true
		};
    }
}

export default role;
