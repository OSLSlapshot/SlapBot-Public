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
			image: {
				url: 'attachment://' + embedimg.name
			},
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
					name: 'Support Link',
					value: '**https://ko-fi.com/OSLCorgo**\n*On my page, I am sharing details about my work, including past work and potentially teasers for what is to come. I would appreciate your support!*'
				}
				/*
				{
					name: 'Details',
					value: 'Since inheriting the bot, which was originally coded to support RPUGs for another game, I have made significant additions and improvements to the code for the OSL.\nI have:\n- Fully revamped the stats collection system and added additional stats, including devising a new file and data structure system for the stats\n- Made code improvements, including major bug fixes, and code structural changes\n- Added new commands, including moderator commands (`adminreport`,`kick`,`cancel`) and user commands (all funzone commands,`active`,`stats`)\n- Added Discord embeds (for aesthetics) for all user interaction\n- Tailored the drafting system to the OSL\'s needs\n- Expanded the drafting system to handle 2v2 drafting\n- Conceived and tested additional ideas for a Python implementation of the bot'
				}
				*/
			],
		};
		
		return {
			embedMessage: aboutEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
    }
}


export default about;
