import Discord from 'discord.js';

function about(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!about') || (userMessage === '!a') || (userMessage === '!support') || (userMessage === '!s') || (userMessage === '!donate') ) {

		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/about.png', {name: 'about.png'}); //from: me
		embedFilesList.push(embedThumb);
		
		const embedimg = new Discord.AttachmentBuilder('./thumbnails/kofi.png', {name: 'kofi.png'}); //from: https://more.ko-fi.com/brand-assets
		embedFilesList.push(embedimg);
		
		let aboutEmbed = {
			color: 0x13c3ff,
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			//title: `Welcome to RPUGs!`,
			//description: 'Type:```!register <YourUsername>```to join RPUGs.\n\u200b\nThen type:```!queue join```to join the queue.\n\u200b\nOnce there are 6 people //in the queue, the top two ranked players will draft their teams and the teams formed will play in a 3v3 or 2v2 private competitive match.\n\u200b',
			/*
			image: {
				url: 'attachment://' + embedimg.name
			},
			*/
			fields: [
				{
					name: 'Developer',
					value: '<@516995472561405966>',
					inline: true
				},
				{
					name: 'Language',
					value: 'JavaScript (NodeJS)',
					inline: true
				},
				{
					name: 'Acknowledgements',
					value: 'A huge thanks to:\n- <@305844162169798656> for his graphic designs,\n- <@313593504213368833> and <@93587049835151360> for their assistance with the Slapshop cosmetic images,\n- <@257439788209143808> for his help in implementing the RPUGs Fours mode,\n- The Slapshot Rebound developers for providing API endpoints for access to in-game information,\n- Many others for their suggestions and testing and,\n- You, the users, for keeping the interest and community alive!',
				},
				{
					//name: 'Support Link',
					name: '\u200b',
					//value: '**https://ko-fi.com/OSLCorgo**\n*On my page, I am sharing details about my work, including past work and potentially teasers for what is to come. I would appreciate your support!*'
					value: '*On my page, I am sharing details about my work, including past work and potentially teasers for what is to come. I would appreciate your support!*'
				}
				/*
				{
					name: 'Details',
					value: 'Since inheriting the bot, which was originally coded to support RPUGs for another game, I have made significant additions and improvements to the code for the OSL.\nI have:\n- Fully revamped the stats collection system and added additional stats, including devising a new file and data structure system for the stats\n- Made code improvements, including major bug fixes, and code structural changes\n- Added new commands, including moderator commands (`adminreport`,`kick`,`cancel`) and user commands (all funzone commands,`active`,`stats`)\n- Added Discord embeds (for aesthetics) for all user interaction\n- Tailored the drafting system to the OSL\'s needs\n- Expanded the drafting system to handle 2v2 drafting\n- Conceived and tested additional ideas for a Python implementation of the bot'
				}
				*/
			],
		};
		
		const supportLinkButton = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setLabel(`OSLCorgo Ko-fi Page`)
					.setURL('https://ko-fi.com/OSLCorgo')
					.setEmoji('<:OSLCorgo:1114817237317075025>')
					.setStyle(Discord.ButtonStyle.Link)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setLabel(`SlapBot Github`)
					.setURL('https://github.com/OSLSlapshot/SlapBot-Public')
					.setEmoji('<:github:1115619415254380605>')
					.setStyle(Discord.ButtonStyle.Link)
			);
		
		return {
			embedMessage: aboutEmbed,
			embedFiles: embedFilesList,
			msgComponents: [supportLinkButton],
			deleteSenderMessage: false
		};
    }
}


export default about;
