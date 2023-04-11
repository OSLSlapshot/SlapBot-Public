import { bot, cmdChannels } from '../';
import enforceWordCount from '../utls/enforceWordCount';
import getWord from '../utls/getWord';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
function info(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!info') || (userMessage === '!i') || (userMessage === '!help') || (userMessage === '!h') ) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot use that here.');
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/info.png', 'info.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		const embedFootimg = new Discord.MessageAttachment('./thumbnails/about.png', 'about.png'); //from: me
		embedFilesList.push(embedFootimg);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `Hi! I'm ${bot.user.username}.`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `Welcome to RPUGs!`,
			description: 'Type:```!register <YourUsername>```to join RPUGs.\n\u200b\nThen type:```!queue join```to join the queue.\n\u200b\nOnce there are 6 people in the queue, the top two ranked players will draft their teams and the teams formed will play in a 3v3 or 2v2 private competitive match.\n\u200b',
			fields: [
				{
					name: 'Rules/Commands',
					value: msg.guild.channels.cache.find(channel => channel.name === cmdChannels.infoCh.name).toString()
				},
				{
					name: 'Casual RPUGs',
					value: msg.guild.channels.cache.find(channel => channel.name === cmdChannels.casualCh.name).toString(),
					inline: true
				},
				{
					name: 'Twos RPUGs',
					value: msg.guild.channels.cache.find(channel => channel.name === cmdChannels.twosCh.name).toString(),
					inline: true
				},
				{
					name: 'Funzone Commands',
					value: msg.guild.channels.cache.find(channel => channel.name === cmdChannels.otherCh.name).toString(),
					inline: true
				},
				{
					name: '\u200b',
					value: '**https://ko-fi.com/OSLCorgo**'
				}
			],
			footer: {
				text: 'Support/Donate (!s/!donate)',
				icon_url: 'attachment://' + embedFootimg.name
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
    }
}

function infoSub(msg) {
	const userMessage = msg.content.toLowerCase();
	if ((userMessage === '!subscribe info') || (userMessage === '!sub info')) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot use that here.');
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/infoSub.png', 'infoSub.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		const embedFootimg = new Discord.MessageAttachment('./thumbnails/about.png', 'about.png'); //from: me
		embedFilesList.push(embedFootimg);
		
		let subEmbed = {
			color: 0x34baeb,
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs role`,
			description: `Players will be able to alert you by tagging the RPUGs role. This is often for when the RPUGs queue is active and nearly full.\n*You may subscribe/unsubscribe at any time.*\n\u200b`,
			fields: [
				{
					name: 'Subscribe',
					value: '```!subscribe / !sub```'
				},
				{
					name: 'Unsubscribe',
					value: '```!unsubscribe / !unsub```'
				},
				{
					name: '\u200b',
					value: '**https://ko-fi.com/OSLCorgo**'
				},
			],
			footer: {
				text: 'Support/Donate (!s/!donate)',
				icon_url: 'attachment://' + embedFootimg.name
			}
		};
		
		return {
			embedMessage: subEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
    }
}

function cmdList(msg) {
	const userMessage = msg.content.toLowerCase();
	if ((userMessage === '!commands') || (userMessage === '!c') || (userMessage.startsWith('!commands ')) || (userMessage.startsWith('!c '))) {
		if (msg.channel.type === 'dm') {
			return errorMsg('You cannot use that here.');
		}
		
		/*
		var cats = {
			info: {
				title: "Information",
				cmdAliases: "info",
				cmdList: [ '!info / !i / !help / !h', '!sub info / !subscribe info', '!commands / !c', '!version / !v' ]
				},
			rpugs: {
				title: "RPUGs",
				cmdAliases: "rpugs",
				cmdList: [ '!register \u0020< YourUsername >', '!subscribe / !sub', '!unsubscribe / !unsub' ]
			},
			stats: {
				title: "Stats",
				cmdAliases: "stats",
				cmdList: [ '!rating / !r / !stats \u0020< name (optional) >', '!leaderboard / !lb \u0020< start position (optional) >', '!leaderboardcasual / !lbc \u0020< start position (optional) >', '!leaderboardtwos / !lbt \u0020< start position (optional) >' ]
			},
			q: {
				title: "Queue",
				cmdAliases: "queue/q",
				cmdList: [ '!queue leave / !q leave / !ql', '!queue join / !q join / !qj', '!queue / !q', '!queue stay / !q stay / !qs' ]
			},
			match: {
				title: "Match",
				cmdAliases: "match",
				cmdList: [ '!active / !matches', '!draft / !d  \u0020< number >', '!matchreport / !mr \u0020< win/w | loss/l >' ]
			},
			admin: {
				title: "Admin",
				cmdAliases: "admin",
				cmdList: [ '!kick \u0020< name >', '!adminReport / !ar \u0020< index > \u0020< a | b >', '!removedraft / !rd / !cancel \u0020< index >', '!listdraft / !ld', '!softreset', '!refreshlist / !rl \u0020< league/l | ban/b >' ]
			},
			fz: {
				title: "Funzone",
				cmdAliases: "funzone",
				cmdList: [ '!slap', '!toss', '!dice', '!roll', '!draw / !hitme' ]
			}
		}
		*/
		
		var cats = {
			info: {
				title: "Information",
				cmdAliases: ["info"],
				cmdList: [ '!i / !h', '!sub info', '!c <category (optional)>', '!st', '!v', '!a / !s / !donate' ]
				},
			rpugs: {
				title: "RPUGs",
				cmdAliases: ["rpugs"],
				cmdList: [ '!register  <YourUsername>', '!sub', '!unsub' ]
			},
			stats: {
				title: "Stats",
				cmdAliases: ["stats"],
				cmdList: [ '!r / !stats  <name (optional)>', '!rc <name (optional)>', '!vs <name>', '!vsc <name>', '!ss', '!lb  <number (optional)>', '!lbc  <number (optional)>', '!lbt  <number (optional)>', '!lbs  <number (optional)>', '!pl', '!tl' ]
			},
			q: {
				title: "Queue",
				cmdAliases: ["queue", "q"],
				cmdList: [ '!ql / qlall', '!q join / !qj <c | t | s (optional)>', '!q / !qcasual / !qtwos / !qscrims', '!q stay / !qs' ]
			},
			match: {
				title: "Match",
				cmdAliases: ["match"],
				cmdList: [ '!active / !matches', '!d  <number>', '!rd', '!mr  <win/w | loss/l>' ]
			},
			admin: {
				title: "Admin",
				cmdAliases: ["admin"],
				cmdList: [ '!kick  <name>', '!ar  <index>  <a | b>', '!rd / !cancel  <index>', '!ld', '!lockq / !unlockq', '!seasonroll', '!softreset', '!teamsreset', '!rl <l | b | st>' ]
			},
			fz: {
				title: "Funzone",
				cmdAliases: ["funzone"],
				cmdList: [ '!slap', '!toss', '!dice', '!roll', '!draw / !hitme', '!quote' ]
			}
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/cmdList.png', 'cmdList.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		if ((userMessage === '!commands') || (userMessage === '!c')) {
			const embedFootimg = new Discord.MessageAttachment('./thumbnails/about.png', 'about.png'); //from: me
			embedFilesList.push(embedFootimg);
			
			let catVal = '';
			Object.keys(cats).forEach(cat => {
				catVal += '```' + cats[`${cat}`].title + ': !c ';
				catVal += cats[`${cat}`].cmdAliases.join(' / ');
				catVal += '```';
			});
			
			catVal += '```All: !c all```'
			
			let cmdEmbed = {
				color: 0x34baeb,
				thumbnail: {
					url: 'attachment://' + embedThumb.name
				},
				title: `RPUGs Commands`,
				description: `More detailed descriptions available in ${msg.guild.channels.cache.find(channel => channel.name === cmdChannels.infoCh.name)}.\nPlease type:` + '```!c <category>```',
				fields: [
					{
						name: 'Categories',
						value: catVal,
					},
					{
						name: '\u200b',
						value: '**https://ko-fi.com/OSLCorgo**'
					}
				],
				footer: {
					text: 'Support/Donate (!s/!donate)',
					icon_url: 'attachment://' + embedFootimg.name
				}
			};
			
			return {
				embedMessage: cmdEmbed,
				embedFiles: embedFilesList,
				deleteSenderMessage: false
			};
		}
		
		else if ((userMessage.startsWith('!commands ')) || (userMessage.startsWith('!c '))) {
			if (enforceWordCount(userMessage,2)) {
				const catCalled = getWord(userMessage,2);
				
				let cmdEmbed = {
					color: 0x34baeb,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
					title: `RPUGs Commands`,
					description: `More detailed descriptions available in ${msg.guild.channels.cache.find(channel => channel.name === cmdChannels.infoCh.name)}.`,
					fields: [],
				};
				
				for (const [cat,catFields] of Object.entries(cats)) {
					if (catFields.cmdAliases.includes(catCalled)) {
						let catVal = catFields.cmdList.map(cmd => '```'+ cmd + '```').join('');
						
						cmdEmbed.fields = [
								{
									name: catFields.title,
									value: catVal,
								}
							]
							
						return {
							embedMessage: cmdEmbed,
							embedFiles: embedFilesList,
							deleteSenderMessage: false
						};
					}
					else if (catCalled === 'all') {
						let catVal = catFields.cmdList.join('\n');
						
						cmdEmbed.fields.push({
							name: catFields.title,
							value: catVal,
						});
					}
				}
				
				if (catCalled === 'all') {
					return {
						embedMessage: cmdEmbed,
						embedFiles: embedFilesList,
						deleteSenderMessage: false
					};
				}
				else {
					//alias not found
					return errorMsg('Could not find this category.','Please make sure to type a valid category.');
				}			
			}
		
			else {
				// Error Syntax
				return errorMsg('Expected 0 or 1 inputs for this command.');
			}
		}
	}
}

export { info, infoSub, cmdList };
