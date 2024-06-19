import { bot, cmdChannels } from '../index.js';
import cfg from '../../config.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import { getSeasonModesQuery, getModeInfo } from '../queries/index.js';
import { padStringToWidth } from 'discord-button-width';
import about from '../commands/about.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';

/**
* Command to check the rating of another player
* Syntax: !rating <username>
*/

async function help(msg) {
	const commandCalls = ['!help','!h', '!info', '!i'];
	const msgAuthorId = msg.author.id;
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		/*
		let helpState = {
			topic: 'home',
			
		}
		*/
		
		if (userMessage.length !== 1) {
			return errorMsg(
				"Expected no inputs for this command."
			);
		}
		
		//Maybe allow multiple inputs- 1st arg would be category, 2nd arg would be sub category (error checking for if it doesn't exist.. maybe default to the level above. E.g. !help commands blah, could default to !help commands, !help blah cancel, could default to !help), include aliases for category and command names
		
		let helpClass = new Help(msg);
		return await helpClass.generateHelp();
	}
	return;
		
		
		/*
		let helpEmbed = generateHelpEmbed(helpState);
		
		await msg.reply({files: helpEmbed.embedFiles, embeds: [helpEmbed.embedMessage], components: helpComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
		.then( async (helpMsg) => {
			const helpFilter =  (i) => {
				if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
					i.reply({content: "How did you even do this?!", ephemeral: true});
					return false;
				}
				
				if (msgAuthorId !== i.user.id) {
					i.reply({content: "This message is not for you!", ephemeral: true});
					return false;
				}
				
				return true;
			};
			
			const helpCollector = helpMsg.createMessageComponentCollector({ filter: helpFilter, idle: 30000 });
			
			helpCollector.on('collect', async i => {
				const buttonPressed = i.customId;
				const cmdCalled = buttonPressed.slice(4);
				const cmdCalledArgs = cmdCalled.split(' ');
				const cmdType = cmdCalledArgs[0];
				
				i.deferUpdate();
				
				if (cmdType === 'topic') {
					helpState.topic = i.values[0];
				}
				
				const newHelp = await generateHelpEmbed(helpState);
				const newHelpButtons = await generateHelpComponents(helpState);
				
				await helpMsg.edit({files: newHelp.embedFiles, embeds: [newHelp.embedMessage], components: newHelpButtons, ephemeral: true});
			});
			
			helpCollector.once('end', async function(collected,reason) {
				if (reason === 'idle') {
					const helpMsgComponents = helpMsg.components;
					for (const r of helpMsgComponents) {
						for (const b of r.components) {
							b.data.disabled = true;
						}
					}
					await helpMsg.edit({components: helpMsgComponents, ephemeral: true});
				}
			});
		}
	}
	*/
}

class Help {
	constructor(inputCmd) {
		this.inputCmd = inputCmd;
		
		this.listOfTopics = {
			basics: 'Getting Started - The Basics',
			roll: 'End-of-Season Roll (for 50,000 Pux)',
			streaming: 'Streaming Matches',
			trackers: 'SlapBot Live Trackers',
			notifications: 'RPUGs Notifications',
			rules: 'Rules',
			gamemodes: 'Game Modes',
			commands: 'SlapBot User Commands',	
		};
		
		this.topicEmojis = {
			basics: '👶',
			roll: '<:pux:1188661791304196216>',
			streaming: '🎥',
			trackers: '📡',
			notifications: '❕',
			rules: '📋',
			gamemodes: '🇬',
			commands: '🇨'
		};
	}
	
	getDefaultHelpState() {
		return {
			lastInteraction: 'home',
			topic: 'home',
			basics: {
				category: ''
			},
			commands: {
				category: '',
				command_name: ''
			},
			gamemode: {
				mode_name: ''
			},
			//rules: {
			//	category: ''
			//}
		};
	}
	
	initialiseListOfBasicsSteps() {
		this.listOfBasicsSteps = {
			register: {
				step: '1) Register',
				title: 'How to Join',
				emoji: '🖊️',
				description: 'You will need to register to the SlapBot database to be able to participate in RPUGs matches. Simply, use ```!register <PickAUsername>``` (e.g. `!register SlapBot`) to be added to the database.\n\n*For more information on this command, navigate to `SlapBot User Commands` > `RPUGs` > `Register` below.*'
			},
			queue: {
				step: '2) Queue',
				title: 'Joining/Leaving Queue',
				emoji: '👥',
				description: `Once registered, you can join any of the queues for the game modes available in ${cmdChannels.queueCh} using the corresponding buttons below the embed there. To leave the queue for a specific game mode, simply use the same button that you used to join that queue.\n\n*For more information about the game modes, navigate to the ` + '`Game Modes`' + ` topic below.*`,
				image: 'help_basicsQueue.png'
			},
			checkin: {
				step: '3) Check In',
				title: 'Checking In',
				emoji: '✅',
				description: `Once enough players have joined the queue for a game mode, a match will be created and displayed in ${cmdChannels.updatesCh}. All players in the match must check in within five minutes of the match's creation to avoid a match auto-cancellation. To check in, simply click on the button with your RPUGs username in ${cmdChannels.updatesCh}.`,
				image: 'help_basicsCheckin.png'
			},
			draft: {
				step: '4) Draft',
				title: 'Drafting',
				emoji: '🤝',
				description: 'If applicable, a draft message will be sent to the team captains for the match. The captains can navigate the drafting process using the buttons or by using the `!draft <Number>` / `!randomdraft` commands.\n\n*For more information, navigate to `SlapBot User Commands` > `Match and Drafting` > `Draft`/`Random Draft` below.*',
				image: 'help_basicsDraft.png'
			},
			play: {
				step: '5) Play Match',
				title: 'Playing the Match',
				emoji: '🏒',
				description: `Once the check-in and drafting processes are completed, a match summary, including the teams, match password and arena, will be displayed in ${cmdChannels.updatesCh}. A private lobby with the provided match password will be automatically created on Slapshot Rebound. Players must play the match in full (unless a team forfeits) according to the settings of the game mode.`,
				image: 'help_basicsPlay.png'
			},
			report: {
				step: '6) Report Match Result',
				title: 'Reporting the Match',
				emoji: '🏅',
				description: `Once a match is completed, the team captains must report a win/loss for their team appropriately using the buttons in ${cmdChannels.queueCh}.\n\n*Note that if a captain reports the match incorrectly for their team, the opposition captain can still report the match correctly (e.g. Win + Win / Loss + Loss) so that a "Conflicting Match Reports" error is generated. This will allow captains to report the result again correctly.*\n*If both captains report the match incorrectly, players will need to contact staff to revert the match and then to simulate the match with the correct result.*`,
				image: 'help_basicsReport.png'
			},
			stats: {
				//step: 'Check Statistics',
				title: 'Accessing Statistics',
				emoji: '📊',
				description: `A wide range of statistics are available via command with SlapBot, including manipulable leaderboards, individual player statistics, and head-to-head statistics. You can use these commands in ${cmdChannels.commandsCh}. ` + '\n\nPlease navigate to `SlapBot User Commands` > `Statistics` below to see the full range of statistic commands available.',
				image: 'help_basicsStats.png'
			}
		};
	}
	
	initialiseListOfCommands() {
		this.listOfCommands = {
			info: {
				title: "Information",
				cmdAliases: ["info", "information"],
				emoji: '🗒️',
				//cmdList: [ '!i / !h', '!sub info', '!c <category (optional)>', '!st', '!a / !s / !donate' ]
				cmds: {
					about: {
						name: 'About/Support/Donate',
						emoji: '<:OSLCorgo:1114817237317075025>',
						syntax: '!a',
						alias: ['!about','!support','!s','!donate'],
						inputs: [],
						description: 'Displays information about the bot\'s development, including a link to the developer\'s support page, and acknowledgements.',
						additional_fields: []
					},
					help: {
						name: 'Help',
						emoji: 'ℹ',
						syntax: '!h',
						alias: ['!help', '!info', '!i'],
						inputs: [],
						description: 'Accesses the RPUGs Help Centre for information relating to RPUGs.',
						additional_fields: []
					},
					st: {
						name: 'Server Tip',
						emoji: '<:eaglul:762888062111449151>',
						syntax: ['!st'],
						alias: ['!servertip'],
						inputs: [],
						description: 'Displays a random OSL server tip.',
						additional_fields: []
					},
					cosmetics: {
						name: 'Slapshop Cosmetic Preview Manager',
						emoji: '<:pux:1188661791304196216>',
						syntax: ['!c'],
						alias: ['!cosmetics'],
						inputs: [],
						description: 'Accesses the Slapshop Cosmetic Preview Manager. Contains a library of all cosmetic previews available for Slapshot Rebound\'s in-game Slapshop.',
						additional_fields: []
					}
				}
			},
			rpugs: {
				title: "RPUGs",
				cmdAliases: ["rpugs"],
				emoji: '📝',
				//cmdList: [ '!register  <YourUsername>', '!sub', '!unsub' ]
				cmds: {
					register: {
						name: 'Register',
						emoji: '🖊️',
						syntax: '!register',
						inputs: ['Username'],
						description: 'Registers the user to the RPUGs database with the input username, allowing the user to participate in RPUGs matches.\n\nThe username can be up to 16 characters in length, and can contain alphanumeric characters, periods, underscores and hyphens.',
						additional_fields: []
					},
					sub: {
						name: 'Subscribe',
						emoji: '❕',
						syntax: '!sub',
						alias: ['!subscribe'],
						inputs: [],
						description: 'Gives the user the <@&714332674797600820> role. Players will be able to alert you by pinging this role. You may subscribe/unsubscribe at any time.\n*This is often for when the RPUGs queue is active and nearly full.*\nNote that this role may be pinged multiple times during short spans of time.',
						additional_fields: []
					},
					unsub: {
						name: 'Unsubscribe',
						emoji: '📵',
						syntax: '!unsub',
						alias: ['!unsubscribe'],
						inputs: [],
						description: 'Removes your <@&714332674797600820> role.',
						additional_fields: []
					}
				}
			},
			stats: {
				title: "Statistics",
				cmdAliases: ["stats"],
				emoji: '📈',
				//cmdList: [ '!r / !stats  <name (optional)>', '!rc <name (optional)>', '!vs <name>', '!vsc <name>', '!ss', '!lb  <number (optional)>', '!lbc  <number (optional)>', '!lbt  <number (optional)>', '!lbs  <number (optional)>', '!pl', '!tl' ]
				cmds: {
					leaderboard: {
						name: 'Leaderboard',
						emoji: '🏆',
						syntax: '!lb',
						alias: ['!leaderboard'],
						inputs: ['Start Position Number (optional)'],
						description: 'Displays the RPUGs leaderboard with interaction buttons and menus available. Options include:\n• Season selection\n• Game mode selection\n• Sort order: ascending, descending\n• Sort by: Rating, Matches, Wins, Losses\nA starting position can be optionally provided as input.',
						additional_fields: []
					},
					playerlist: {
						name: 'Player List',
						emoji: '🗃️',
						syntax: '!pl',
						alias: ['!playerlist'],
						inputs: ['Start Position Number (optional)'],
						description: 'Displays the list of players registered into the RPUGs database.\nA starting position can be optionally provided as input.',
						additional_fields: []
					},
					profile: {
						name: 'Profile',
						emoji: '📊',
						syntax: '!p',
						alias: ['!profile'],
						inputs: ['Username (optional)'],
						description: 'Displays the statistics for the user with interaction buttons and menus available. Options include:\n• Season selection (including career)\n• Game mode selection\n• Statistic type: Number statistics, Rating worm, Streak step line, Top versus\nA (RPUGs) username can be optionally provided as input to display another player\'s profile.',
						additional_fields: []
					},
					seasonsummary: {
						name: 'Season Summary',
						emoji: '🗄️',
						syntax: '!ss',
						alias: ['!seasonsummary'],
						inputs: [],
						description: 'Displays the current season\'s summary statistics.\n*The development for this command has been abandoned, and so it simply displays the match count for each game mode in the season.*',
						additional_fields: []
					},
					teamlist: {
						name: 'Team List',
						emoji: '🗃️',
						syntax: '!tl',
						alias: ['!teamlist'],
						inputs: ['Start Position Number (optional)'],
						description: 'Displays the list of teams registered into the RPUGs database.\nA starting position can be optionally provided as input.',
						additional_fields: []
					},
					versus: {
						name: 'Versus',
						emoji: '⚔️',
						syntax: '!vs',
						alias: ['!versus'],
						inputs: ['Username1 (optional)','Username2 (optional)'],
						description: 'Displays the head-to-head and same-team statistics between two players with player selection interaction menus available.\nUp to two usernames can be optionally provided as input.\n*Players that are not in the server cannot be selected from the interaction menus. A (RPUGs) username must be provided as input for such players.*',
						additional_fields: []
					},
				}
			},
			/*
			q: {
				title: "Queue",
				cmdAliases: ["queue", "q"],
				cmdList: [ '!ql / qlall', '!q join / !qj <c | t | s (optional)>', '!q / !qcasual / !qtwos / !qscrims', '!q stay / !qs' ]
			},
			*/
			match: {
				title: "Match and Drafting",
				cmdAliases: ["match"],
				emoji: '🏒',
				//cmdList: [ '!active / !matches', '!d  <number>', '!rd', '!mr  <win/w | loss/l>' ]
				cmds: {
					active: {
						name: 'Active Matches',
						emoji: '📋',
						syntax: '!active',
						alias: ['!active'],
						inputs: [],
						description: 'Displays a list of the current active RPUGs matches.',
						additional_fields: []
					},
					draft: {
						name: 'Draft',
						emoji: '🤝',
						syntax: '!d',
						alias: ['!draft'],
						inputs: ['Number'],
						description: 'Drafts the input player (corresponding to the number provided) to the captain\'s team.\n*This command is only available to match captains during the drafting process in an active match.*',
						additional_fields: []
					},
					randomdraft: {
						name: 'Random Draft',
						emoji: '🎲',
						syntax: '!rd',
						alias: ['!randomdraft'],
						inputs: [],
						description: 'Drafts a randomly selected player to the captain\'s team.\n*This command is only available to match captains during the drafting process in an active match.*',
						additional_fields: []
					}
				}
			},
			staff: {
				title: "Staff",
				cmdAliases: ["admin"],
				emoji: '👮',
				//cmdList: [ '!kick  <name>', '!ar  <index>  <a | b>', '!rd / !cancel  <index>', '!ld', '!lockq / !unlockq', '!seasonroll', '!softreset', '!teamsreset', '!rl <l | b | st>' ]
				cmds: {
					adminreport: {
						name: '(Admin) Report Match',
						emoji: '✅',
						syntax: '!ar',
						alias: ['!adminreport'],
						inputs: ['Match Number', 'Team Designator - A/B'],
						description: '(Admin command) Reports the input match with the input team as the winner.',
						additional_fields: []
					},
					cancel: {
						name: 'Cancel Match',
						emoji: '❌',
						syntax: '!rd',
						alias: ['!cancel', '!removedraft'],
						inputs: ['Match Number'],
						description: '(Admin command) Cancels the input match.',
						additional_fields: []
					},
					listdraft: {
						name: '(Admin) Active Matches',
						emoji: '📋',
						syntax: '!ld',
						alias: ['!listdraft'],
						inputs: [],
						description: '(Admin command) Private messages the active matches with detailed information, including game password, check-in status, and draft order.',
						additional_fields: []
					},
					refreshlist: {
						name: 'Refresh List',
						emoji: '🔁',
						syntax: '!rl',
						alias: ['!refreshlist'],
						inputs: ['List type - select (sel) / league (l) / ban (b) / servertip (st)'],
						description: '(Admin command) Reads from the connected RPUGs Google sheet and refreshes the input list on the server. Possible inputs: select/sel, league/l, ban/b, servertip/st.',
						additional_fields: []
					},
					refreshshop: {
						name: 'Refresh Shop',
						emoji: '<:pux:1188661791304196216>',
						syntax: '!refreshshop',
						inputs: [],
						description: `(Admin command) Refreshes the in-game shop message in ${cmdChannels.dailyShopCh}.`,
						additional_fields: []
					},
					revertmatch: {
						name: 'Revert Match',
						emoji: '⏪',
						syntax: '!revert',
						inputs: [],
						description: '(Admin command) Reverts the last match played.',
						additional_fields: []
					},
					seasonroll: {
						name: 'Season Roll',
						emoji: '🎰',
						syntax: '!seasonroll',
						inputs: [],
						description: '(Commissioner command) Performs a roll to select a player based on a raffle system. The chance of being selected is dependent on a player\'s total match count for the season (excluding matches played in some game modes). Please see the **End-Of-Season Roll** category under **Rules** topic for more information.',
						additional_fields: []
					},
					simulate: {
						name: 'Simulate',
						emoji: '💻',
						syntax: '!simulate',
						inputs: ['Mode Name', 'Winning Usernames', 'Losing Usernames'],
						description: '(Admin command) Simulates the ratings for a match played in the input mode between the input players. The players of the winning team must be specified first. All usernames provided must be separated by commas and no spaces for each of the winning usernames and losing username inputs.',
						additional_fields: []
					},
					softreset: {
						name: 'Soft Reset',
						emoji: '💥',
						syntax: '!softreset',
						inputs: [],
						description: '(Commissioner command) Resets the statistics for all players- the matches played in all modes are set to zero, and the ratings are set to the starting rating for each mode.',
						additional_fields: []
					},
					/*
					teamsreset: {
						
					}
					*/
				}
			},
			fz: {
				title: "Funzone",
				cmdAliases: ["funzone"],
				emoji: '🎮',
				//cmdList: [ '!slap', '!toss', '!dice', '!roll', '!draw / !hitme', '!quote' ]
				cmds: {
					dice: {
						name: 'Dice',
						emoji: '🎲',
						syntax: '!dice',
						inputs: [],
						description: 'Rolls a 6-sided die.',
						additional_fields: []
					},
					draw: {
						name: 'Draw Card',
						emoji: '🃏',
						syntax: '!draw',
						alias: ['!hitme'],
						inputs: [],
						description: 'Draws a random playing card.',
						additional_fields: []
					},
					quote: {
						name: 'Quote',
						emoji: '💡',
						syntax: '!quote',
						inputs: [],
						description: 'Returns a famous quote or a quote by an influential figure.',
						additional_fields: []
					},
					roll: {
						name: 'Roll',
						emoji: '🎰',
						syntax: '!roll',
						inputs: [],
						description: 'Rolls a number between zero and 100.',
						additional_fields: []
					},
					slap: {
						name: 'Slap',
						emoji: '<:Slapbutton:602462041000640563>',
						syntax: '!slap',
						inputs: [],
						description: 'Shot.',
						additional_fields: []
					},
					toss: {
						name: 'Toss',
						emoji: '🪙',	//while not displayed here, the emoji works
						syntax: '!toss',
						inputs: [],
						description: 'Flips a coin.',
						additional_fields: []
					}
				}
			}
		};
	}
	
	/*
	initialiseListOfRules() {
		this.listOfRules = {
			
		};
	}
	*/
	getAllModes() {
		//const seasonsList = getSeasonModesQuery('career');
		const modesList = [...cfg.modes, ...cfg.retiredModes];
		let modesObj = {};
		for (const m of modesList) {
			modesObj[m.modeName.toLowerCase()] = m;
		}
		return modesObj;
	}
	
	async generateHelp() {
		this.helpState = this.getDefaultHelpState();
		
		const currEmbed = this.generateHelpEmbed('topic','home');
		const currComponents = this.generateHelpComponents();
		
		this.helpMsg = await this.inputCmd.reply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
			.then( async (hMsg) => {
				const helpFilter =  (i) => {
					if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
						i.reply({content: "How did you even do this?!", ephemeral: true});
						return false;
					}
					
					if (this.inputCmd.author.id !== i.user.id) {
						i.reply({content: "This message is not for you!", ephemeral: true});
						return false;
					}
					
					return true;
				};
				
				const helpCollector = hMsg.createMessageComponentCollector({ filter: helpFilter, idle: 60000 });
				
				try {
					helpCollector.on('collect', async i => {
						const buttonPressed = i.customId;
						const cmdCalled = buttonPressed.slice(6);
						const cmdCalledArgs = cmdCalled.split(' ');
						const cmdType = cmdCalledArgs[0];
						
						if (cmdType === 'about') {
							await i.deferReply({ephemeral: true});
							const supportMsg = await about({content: '!a'});
							await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
							return;
						}
						
						await i.deferUpdate();
						
						let newHelp;
						switch(cmdType) {
							case 'topic':
								this.helpState = this.getDefaultHelpState();
								this.helpState.topic = cmdCalledArgs[1] === 'home' ? 'home' : i.values[0];
								newHelp = this.generateHelpEmbed(cmdType,this.helpState.topic);
								break;
							case 'basics':
								this.helpState.basics.category = i.values[0];
								newHelp = this.generateHelpEmbed(cmdType);
								break;
							case 'commandcategory':
								this.helpState.commands.category = i.values[0];
								this.helpState.commands.command_name = '';
								newHelp = this.generateHelpEmbed(cmdType);
								break;
							case 'command':
								this.helpState.commands.command_name = i.values[0];
								newHelp = this.generateHelpEmbed(cmdType);
								break;
							case 'gamemode':
								this.helpState.gamemode.mode_name = i.values[0];
								newHelp = this.generateHelpEmbed(cmdType);
								break;
							/*
							case 'rules':
								this.helpState.rules.category = i.values[0];
								newHelp = this.generateHelpEmbed(cmdType);
								break;
							*/
						}
						
						/*
						if (i.componentType === Discord.ComponentType.StringSelect) {
							//console.log(i);
							this.helpState[cmdType] = i.values[0];
						}
						else if (cmdCalledArgs[1] === 'home') {
							this.helpState.topic = 'home';
						}

						else if (cmdType === 
						
						switch(cmdType) {
							case 'topic':
								this.helpState.topic = i.values[0];
								break;
							case 'commands':
								
						}
						*/
						
						//const cmdArg = cmdCalledArgs[1] === 'home' ? 'home' : i.values[0];
						//const newHelp = this.generateHelpEmbed(cmdType,cmdArg);
						const newHelpButtons = this.generateHelpComponents();
						
						await hMsg.edit({files: newHelp.embedFiles, embeds: [newHelp.embedMessage], components: newHelpButtons, ephemeral: true});
					});
				}
				catch (err) {
					console.log('Error in help collection listener');
					console.log(err);
				}
				
				helpCollector.once('end', async function(collected,reason) {
					if (reason === 'idle') {
						const helpMsgComponents = hMsg.components;
						for (const r of helpMsgComponents) {
							for (const b of r.components) {
								b.data.disabled = true;
							}
						}
						await hMsg.edit({components: helpMsgComponents, ephemeral: true});
					}
				});
			});
	}
	
	generateHelpEmbed(cmdType,cmdArg = null) {
		
		const embedGetter = {
			topic: {
				home: this.generateHomeEmbed.bind(this),
				basics: this.generateBasicsCategoryEmbed.bind(this),
				roll: this.generateRollEmbed.bind(this),
				streaming: this.generateStreamingEmbed.bind(this),
				trackers: this.generateTrackerEmbed.bind(this),
				commands: this.generateCommandsEmbed.bind(this),
				gamemodes: this.generateGamemodesEmbed.bind(this),
				rules: this.generateRulesEmbed.bind(this),
				notifications: this.generateNotificationsEmbed.bind(this)
			},
			basics: this.generateBasicsStepEmbed.bind(this),
			commandcategory: this.generateCommandCategoryEmbed.bind(this),
			command: this.generateCommandEmbed.bind(this),
			gamemode: this.generateModeEmbed.bind(this),
			//rules: this.generateRulesEmbed.bind(this)
		}
		
		if (cmdArg) {
			return embedGetter[cmdType][cmdArg]();
		}
		return embedGetter[cmdType]();
	}
	
	generateHomeEmbed() {
		let listOfTopicsStr = '';
		for (const [key,topic] of Object.entries(this.listOfTopics)) {
			listOfTopicsStr += `\n${this.topicEmojis[key]} ${topic}`;
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/info.png', {name: 'info.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs Help Centre - Home Page`,
			description: `You can use the interactions buttons/menus below to navigate through the information topics available.\n\nTopics available:${listOfTopicsStr}`,
			fields: [
				{
					name: 'Shortcuts',
					value: `${cmdChannels.tipsCh}  •  ${cmdChannels.liveCh}  •  ${cmdChannels.otherCh}\n${cmdChannels.queueCh}  •  ${cmdChannels.updatesCh}  •  ${cmdChannels.commandsCh}`
				}
			],
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateBasicsCategoryEmbed() {
		if (!this.listOfBasicsSteps) {
			this.initialiseListOfBasicsSteps();
		}
		
		let stepsStr = '';
		for (const stepInfo of Object.values(this.listOfBasicsSteps)) {
			if ('step' in stepInfo) {
				stepsStr += `\n${stepInfo.step} ${stepInfo.emoji}`;
			}
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/basicsHelp.png', {name: 'basicsHelp.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Getting Started - The Basics`,
			description: `👋 Welcome to RPUGs!\n\nRanked Pick-Up Games (RPUGs) offer a way to set up private Slapshot Rebound matches in the Discord server here via a queue and team-drafting system. There are various game modes available, most of which are rotated weekly.\n\nThe basics can be summarised by the following steps:${stepsStr}\nVarious statistics are also available.\n\nFor more details, please use the last interaction menu below.`,
			//description: `Type:`+'```!register <YourUsername>```'+' (e.g. `!register SlapBot`)'+` to join RPUGs.\n\u200b\nThen head over to ${cmdChannels.queueCh} and use the buttons to join/leave the corresponding queues.\n\u200b\nOnce there are enough people in the queue, the top two ranked players will draft their teams and the teams formed will play in a private competitive match.\n\u200b`,
			fields: [
				/*
				{
					name: '1) How To Join',
					value: 'You will need to register to the SlapBot database to be able to participate in RPUGs matches. Simply, use ```!register <PickAUsername>``` (e.g. `!register SlapBot`) to be added to the database. For more information on this command, you can navigate through the Help interaction menus (`SlapBot User Commands` > `Information` > `Register`).'
				},
				{
					name: '2) Joining/Leaving Queue',
					value: `Once registered, you can join any of the queues for the game modes available in ${cmdChannels.queueCh} using the buttons below the embed there. To leave the queue for a specific game mode, simply use the same button that you used to join that queue.\n*For more information about the game modes, navigate to the ` + '`Game Modes`' + ` topic in the Help interaction menus below.`
				},
				{
					name: '3) Check In',
					value: `Once enough players have joined the queue for a game mode, a match will be created and displayed in ${cmdChannels.updatesCh}. All players in the match must check in within five minutes of the match's creation to avoid a match auto-cancellation.`
				},
				{
					name: '4) Draft',
					value: 'If applicable, a draft message will be sent to the team captains for the match. The captains can navigate the drafting process using the buttons or by using the `!draft <Number>` / `!randomdraft` commands (for more information, navigate to `SlapBot User Commands` > `Match and Drafting` > `Draft`/`Random Draft` in the Help interaction menus below).'
				},
				{
					name: '5) Play',
					value: `Once the check-in and drafting processes are completed, a match summary, including the teams, match password and arena, will be displayed in ${cmdChannels.updatesCh} and a private lobby will be automatically created on Slapshot-Rebound. Players must play the match in full (unless a team forfeits) according to the settings of the game mode.`
				},
				{
					name: '6) Report Match',
					value: `Once a match in completed, the team captains must report a win/loss for their team appropriately using the buttons in ${cmdChannels.queueCh}.\n*Note that if a captain reports the match incorrectly for their team, the opposition can still report the match correctly (e.g. Win + Win / Loss + Loss) so that a conflicting match reports error is generated. This will allow captains to report the result again correctly.*\n*If both captains report the match incorrectly, players will need to contact staff to revert the match and then to simulate the match with the correct result.*`
				},
				{
					name: 'Accessing Statistics',
					value: `A wide range of statistics are available via command with SlapBot, including manipulable leaderboards, individual player statistics, and head-to-head statistics. You can use these commands in ${cmdChannels.commandsCh}. ` + 'Please navigate to `SlapBot User Commands` > `Statistics` in the Help interaction menus below to see the full range of statistic commands available.'
				},
				*/
				{
					name: '\u200b',
					value: `If you have any more questions, feel free to drop a message in ${cmdChannels.commandsCh}. Someone in the community will be more than happy to help you!`
				}
			],
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateBasicsStepEmbed() {
		if (!this.listOfBasicsSteps) {
			this.initialiseListOfBasicsSteps();
		}
		const stepInfo = this.listOfBasicsSteps[this.helpState.basics.category];
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/basicsHelp.png', {name: 'basicsHelp.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Basics - ${stepInfo.title}`,
			description: `${stepInfo.description}`,
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}  •  ${stepInfo.title}`
			}
		};
		
		if ("image" in stepInfo) {
			const embedImage = new Discord.AttachmentBuilder(`./thumbnails/${stepInfo.image}`, {name: `${stepInfo.image}`});
			embedFilesList.push(embedImage);
			
			infoEmbed.image = {
				url: 'attachment://' + embedImage.name
			}
			infoEmbed.author.name = `${bot.user.username}                                                                \u200b`
		}
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateRollEmbed() {
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/pux.png', {name: 'pux.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: End-of-Season Roll (for 50,000 Pux)`,
			description: `Next Roll Date: **${cfg.nextRollDate}**`
				+ '\nThe RPUGs database is usually reset at the start of every quarter- January, April, July, and October. Before the reset, a roll is performed to select a winner for the RPUGs season. The winner receives <:pux:1188661791304196216> 50,000 pux (Slapshot Rebound in-game currency).'
				+'\n\n**About the draw:**'
				+'\nThe draw is a raffle-based system with the chances of being selected being based on a player\'s total match count for the season (excluding a select few game modes), determined as follows:'
				+ '```'
				+ '\u200b    1-9 matches = 1 ticket'
				+ '\n\u200b  10-19 matches = 5 tickets'
				+ '\n\u200b  20-49 matches = 10 tickets'
				+ '\n\u200b  50-99 matches = 20 tickets'
				+ '\n100-199 matches = 25 tickets'
				+ '\n\u200b   200+ matches = 40 tickets'
				+ '```'
				+ 'A player is then randomly drawn from the raffle pool as the winner.'
				+ '\n\n*For the raffle to occur, a minimum of 100 total matches must be played during the season.',
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}

	generateStreamingEmbed() {
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/help_streaming.png', {name: 'help_streaming.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Streaming Matches`,
			description: 'If you would like to stream RPUGs matches, please let a staff member know. You will be added to the bot\'s database as a streamer, granting you access to all RPUGs match passwords.\n*Note that these permissions will be activated upon the bot\'s next restart, which could take up to 24 hours.*',
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateTrackerEmbed() {
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/help_tracker.png', {name: 'help_tracker.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `SlapBot Live Trackers`,
			description: 'The bot features two live trackers:',
			fields: [
				{
					name: 'Live Player Count - Oceania',
					value: `Operating in ${cmdChannels.liveCh}, the bot displays the numbers of currently active players (in queue or in a match) either in Slapshot Rebound's Quick Play, or in RPUGs in the Oceania region. The message is updated every ${cfg.slapshotLiveTracker.refreshTime} seconds.\nThe bot's activity status also displays the total number of players currently in the game's Quick Play (sum of those in queue and those in a match).`
				},
				{
					name: 'In-Game Slapshop',
					value: `Operating in ${cmdChannels.dailyShopCh}, the bot displays the cosmetics currently available in Slapshot Rebound's In-Game Slapshop. This message is automatically refreshed daily in line with the game's shop refresh time, and the <@&${cfg.dailyShopTracker.shopperRoleId}> role is pinged to inform those who have the role of the refresh. The role can be gained/removed via the interaction buttons available in <#690029394282151994>.`
					+ '\nYou can interact with the buttons below the message for more details on the cosmetics available, potentially including previews of the cosmetics.'
					+ '\n*Note that the cosmetic previews are maintained by the community and are consquently not always available. We would appreciate your contribution of screenshots for the cosmetics currently unavailable! ❤️*'
					+ '\n**Tip: To quickly find out the type of a cosmetic displayed in the shop, you can hover over/tap on the emoji next to the cosmetic\'s name.*'
				},
			],
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateCommandsEmbed() {
		if (!this.listOfCommands) {
			this.initialiseListOfCommands();
		}
		
		let cmdCategoryListStr = '';
		for (const catInfo of Object.values(this.listOfCommands)) {
			cmdCategoryListStr += `\n${catInfo.emoji} ${catInfo.title}`;
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/cmdList.png', {name: 'cmdList.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Commands`,
			description: `*Please select a command category to continue.*\n\nCategories available:${cmdCategoryListStr}`,
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateCommandCategoryEmbed() {
		if (!this.listOfCommands) {
			this.initialiseListOfCommands();
		}
		
		let cmdListStr = '';
		for (const cmdInfo of Object.values(this.listOfCommands[this.helpState.commands.category].cmds)) {
			cmdListStr += `\n${cmdInfo.emoji} ${cmdInfo.name}`;
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/cmdList.png', {name: 'cmdList.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Commands`,
			description: `*Please select a command to continue.*\n\nCommands available (for this category):${cmdListStr}`,
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}  •  ${this.listOfCommands[this.helpState.commands.category].title}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateCommandEmbed() {
		if (!this.listOfCommands) {
			this.initialiseListOfCommands();
		}
		const cmdInfo = this.listOfCommands[this.helpState.commands.category].cmds[this.helpState.commands.command_name];
		
		let syntaxStr = '`' + cmdInfo.syntax;
		for (const [idx,inp] of cmdInfo.inputs.entries()) {
			syntaxStr += ` [Inp${idx+1}: ${inp}]`;
		}
		syntaxStr += '`';
		
		let aliasStr = '';
		if ('alias' in cmdInfo) {
			aliasStr = '\nAlias: ' + '`' + cmdInfo.alias.join('`, `') + '`';
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/cmdList.png', {name: 'cmdList.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Commands - ${cmdInfo.name}`,
			description: `Syntax: ${syntaxStr}${aliasStr}\n\n${cmdInfo.description}`,
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}  •  ${this.listOfCommands[this.helpState.commands.category].title}  •  ${cmdInfo.name}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateGamemodesEmbed() {
		if (!this.modesList) {
			this.modesList = this.getAllModes();
		}
		let modesListStr = '';
		for (const modeInfo of Object.values(this.modesList)) {
			modesListStr += `\n${modeInfo.emoji} ${modeInfo.modeName}`;
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/gameModes.png', {name: 'gameModes.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Game Modes`,
			description: `The RPUGs game modes comprise *standard* game modes (always available to join), and *featured* game modes (one of which is randomly rolled every Monday at 4 AM AEST to play during the week).\n*Please select a game mode to learn more about it.*\n\nGame modes available:${modesListStr}`,
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateModeEmbed() {
		const modeInfo = getModeInfo(this.helpState.gamemode.mode_name);
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/gameModes.png', {name: 'gameModes.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Game Modes - ${modeInfo.modeName}`,
			description: '```' + `${JSON.stringify(modeInfo,null,'\u200b\t')}` + '```',
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}  •  ${modeInfo.modeName}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateRulesEmbed() {
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rules.png', {name: 'rules.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Rules`,
			description: //'```asciidoc'
				//+ '\n= RPUG Rules ='
				'The following offenses will result in a warning for that player:'
				+ '\n• Rage/early quitting'
				+ '\n• Toxicitiy'
				+ '\n• Intentionally throwing'
				+ '\n• Intentionally or frequently AFK\'ing in-game'
				+ '\n• Intentionalyl or frequently missing check-ins'
				+ '\n• Intentionally or frequently causing delays for starting matches/periods'
				+ '\n• Intentionally or frequently not reporting the match result as a captain'
				+ '\n• Intentionally or frequently reporting the match result early or incorrectly as a captain'
				+ '\n• Multiple account usage/smurfing'
				+ '\n• Attempting to participate in a match you did not queue in'
				+ '\n• Unnecessarily pinging moderators to cancel matches when not required'
				+ '\n• Non-Oceanic players can only participate in queues where all players are not from Oceania'
				+ '\n\nAll of the above warnings will be at the discretion of the moderators. If a player receives 3 warnings, they will be banned from participating in rpugs for 1 month and their rating will be reduced. As a rough guide for the rating adjustment, the following numbers can be referred to:'
				+ '```'
				+ '--- Current Rating:'
				+ '\n• 3000 - reduced by 800'
				+ '\n• 2500 - reduced by 600'
				+ '\n• 2000 - reduced by 400'
				+ '\n• 1500 - reduced by 200'
				+ '\n• 1000 - reduced by 100'
				+ '\n•  500 - reduced by 50'
				+ '```'
				+ '\nWarnings will expire after 1 month from when the warning was issued.',
				//+ '```',
				
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateNotificationsEmbed() {
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rpugs_notifs.png', {name: 'rpugs_notifs.png'});
		embedFilesList.push(embedThumb);
		
		let infoEmbed = {
			color: 0x34baeb,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: `${bot.user.displayAvatarURL()}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `RPUGs: Notifications`,
			description: `Players can ping the <@&714332674797600820> role in ${cmdChannels.commandsCh} to initiate/alert players to join RPUGs queues.\nIf you would like to receive these pings, you can get the <@&714332674797600820> role by using` + '```!subscribe```' + `\nTo unsubscribe, simply use` + '```!unsubscribe```' + '\nYou may subscribe/unsubscribe at any time.\n*Note that this role may be pinged multiple times during short spans of time.*',
			footer: {
				text: `${this.helpState.topic === 'home' ? 'Home' : this.listOfTopics[this.helpState.topic]}`
			}
		};
		
		return {
			embedMessage: infoEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generateHelpComponents() {
		let componentRows = [];
		
		//const row0 = generateTopComponentRow(params.topic);
		componentRows = this.addComponentRow(componentRows, this.generateTopComponentRow() );
		
		componentRows = this.generateTopicComponentRows(componentRows);
		
		return componentRows;
	}

	addComponentRow(componentRowList,rowToAdd) {
		componentRowList.push(rowToAdd);
		return componentRowList;
	}

	generateTopComponentRow() {
		const buttonWidth = 94;
		
		let row = new Discord.ActionRowBuilder()
		if (this.helpState.topic === 'home') {
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!help topic home`)
					.setLabel(`\u200b${padStringToWidth('Home',2*buttonWidth,"center")}\u200b`)
					.setEmoji('🏠')
					.setStyle(Discord.ButtonStyle.Secondary)
					.setDisabled(true)
			)
		}
		else {
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!help topic home`)
					.setLabel(`\u200b${padStringToWidth('Home',2*buttonWidth,"center")}\u200b`)
					.setEmoji('🏠')
					.setStyle(Discord.ButtonStyle.Secondary)
					.setDisabled(false)
			)
		}
			
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!help about`)
				.setLabel(`\u200b${padStringToWidth('About',buttonWidth,"center")}\u200b`)
				.setEmoji('<:OSLCorgo:1114817237317075025>')
				.setStyle(Discord.ButtonStyle.Secondary)
		);
			
		return row;
	}

	generateTopicComponentRows(components) {
		//const topicSelectComponentRow = generateTopicSelectComponentRow(params);
		//components.push(topicSelectComponentRow);
		components = this.addComponentRow(components, this.generateTopicSelectComponentRow() );
		
		switch(this.helpState.topic) {
			case 'basics':
				components = this.addComponentRow(components, this.generateBasicsStepSelectComponentRow() );
				break;
			case 'commands':
				components = this.addComponentRow(components, this.generateCommandCategorySelectComponentRow() );
				if (this.helpState.commands.category) {
					components = this.addComponentRow(components, this.generateCommandSelectComponentRow() );
				}
				break;
			case 'gamemodes':
				if (!this.modesList) {
					this.modesList = this.getAllModes();
				}
				components = this.addComponentRow(components, this.generateGamemodeSelectComponentRow());
				break;
			case 'rules':
				
				break;
		}
		
		return components;
	}

	generateTopicSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!help topic')
					.setPlaceholder('Select topic')
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const [i,t] of Object.entries(this.listOfTopics)) {
			if (i === this.helpState.topic) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(t)
						.setValue(i)
						.setEmoji(this.topicEmojis[i])
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(t)
					.setValue(i)
					.setEmoji(this.topicEmojis[i])
					.setDefault(false)
			);
		}
		
		return row;
	}

	generateBasicsStepSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!help basics')
					.setPlaceholder('Select topic')
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const [step,stepInfo] of Object.entries(this.listOfBasicsSteps)) {
			if (step === this.helpState.basics.category) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(stepInfo.title)
						.setValue(step)
						.setEmoji(stepInfo.emoji)
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(stepInfo.title)
					.setValue(step)
					.setEmoji(stepInfo.emoji)
					.setDefault(false)
			);
		}
		
		return row;
	}

	generateCommandCategorySelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!help commandcategory')
					.setPlaceholder('Select category')
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const [i,t] of Object.entries(this.listOfCommands)) {
			if (i === this.helpState.commands.category) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(t.title)
						.setValue(i)
						.setEmoji(t.emoji)
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(t.title)
					.setValue(i)
					.setEmoji(t.emoji)
					.setDefault(false)
			);
		}
		
		return row;
	}

	generateCommandSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!help command')
					.setPlaceholder('Select command')
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const [i,t] of Object.entries(this.listOfCommands[this.helpState.commands.category].cmds)) {
			if (i === this.helpState.commands.command_name) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(t.name)
						.setValue(i)
						.setEmoji(t.emoji)
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(t.name)
					.setValue(i)
					.setEmoji(t.emoji)
					.setDefault(false)
			);
		}
		
		return row;
	}

	generateGamemodeSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!help gamemode')
					.setPlaceholder('Select mode')
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const [mode,modeInfo] of Object.entries(this.modesList)) {
			if (mode === this.helpState.gamemode.mode_name) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(modeInfo.modeName)
						.setValue(mode)
						.setEmoji(modeInfo.emoji)
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(modeInfo.modeName)
					.setValue(mode)
					.setEmoji(modeInfo.emoji)
					.setDefault(false)
			);
		}
		
		return row;	
	}
	
}

export default help;
