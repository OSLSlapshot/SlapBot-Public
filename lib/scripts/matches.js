import Discord from 'discord.js';
import cfg from '../../config.js';
import { bot, cmdChannels, logger } from '../index.js';
import { padStringToWidth } from 'discord-button-width';
import about from '../commands/about.js';
import activeMatches from '../commands/activeMatches.js';
import { getFeaturedModeQuery, getModeInfo, getPlayerQuery, isLeaguePlayer, getTeamFromDiscordIdQuery, isPlayerInSelectGamemodeQuery } from '../queries/index.js';
import { isMod } from '../utls/isMod.js';
import isBanned from '../utls/isBanned.js';
import errorMsg from '../scripts/errorMessage.js';
import queuePop from '../scripts/queuePop.js';
import { getDraftFromDiscordId, getDraftFromTeamId, removeDraft, isCaptain, getDraftFromIndex } from '../scripts/draftClass.js';
import { updateDatabaseWithMatch } from '../commands/reportMatch.js';
import getWord from '../utls/getWord.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import help from '../commands/help.js';

let queues;

class Queue {
	#lockEmojis
	constructor(messageId = null) {
		this.queueCh = cmdChannels.queueCh;
		this.queueMsgId = messageId;
		this.queuesEnabled = cfg.queueEnable;
		this.queueStatusMsg = null;
		this.queueBlocked = false;
		this.inQueueCheckEnable = true;	//parameter for testing queue- allows users to join multiple times if set to false
		if (!this.inQueueCheckEnable) {
			console.log('Warning: inQueueCheck is disabled');
		}
		this.refreshCooldown = false;
		this.refreshEmbedFn = {
			timer: null,
			numCalls: 0
		};
		this.#lockEmojis = {
			'true': {
				state: 'locked',
				emoji: '🔒'
			},
			'false': {
				state: 'unlocked',
				emoji: '🔓'
			}
		}
		this.queueJoin = {
			timer: null,
			playerList: []
		};
		
		this.modes = this.fetchModes();
		this.allQueues = this.setUpQueues();
		queues = this.allQueues;
		
		//await this.startQueue();	//can't call await inside constructor, it is supposed to be for initialising variables and not executing methods- call method separately after initialising
	}
	
	fetchModes() {
		return cfg.modes;
	}
	
	setUpQueues() {
		const featuredMode = this.getFeaturedMode();
		this.featuredMode = featuredMode.mode;
		/*
		if (featuredMode.rolled) {
			const featuredModeRolledEmbed = {
				color: 0xffd700,
				description: `:sparkles: This week's featured mode is ${capitaliseFirstLetter(this.featuredMode)} :sparkles:`,
			}
			
			cmdChannels.updatesCh.send({embeds: [featuredModeRolledEmbed]});
		}
		*/
		let queueObj = {};
		for (const m of this.modes) {
			if ((m.enabled) || (m.modeName.toLowerCase() === this.featuredMode)) {
				queueObj[m.modeName.toLowerCase()] = [];
			}
		}
		return queueObj;
	}
	
	getFeaturedMode() {
		return getFeaturedModeQuery();
	}
	
	async startQueue() {
		//this.queueMsgId = '1114861074458615848';	//queues embed test server
		//const queuesMsgId = 0;	//queues embed OSL
		//const qjMsgId = 0;	//joining queue
		//const qlMsgId = 0;	//leaving queue
		//const mrMsgId = ;	//match report - this should go in another file, or function
		
		//For a resetting timer function call - for running a refresh after last interaction, add a cooldown- done
		//https://stackoverflow.com/questions/68220537/javascript-or-jquery-function-with-timer-that-resets-each-time-it-is-called
		
		let queueStatusEmbed = this.createQueueEmbed();
		let queueStatusButtons = this.createQueueComponents();

		if (this.queueMsgId) {
			try {
				this.queueStatusMsg = await this.queueCh.messages.fetch(this.queueMsgId);
				this.queueStatusMsg = await this.queueStatusMsg.edit({content: '', files: [], embeds: [queueStatusEmbed], components: queueStatusButtons});
			}
			catch (error) {
				if (error.code === 10008) {
					console.error(`Message ID ${this.queueMsgId} not found in channel ${this.queueCh}.`);
					console.log(error);
				}
				else {
					console.log(error);
				}
			}
		}
		else {
			const queueStatusBanner = this.getQueueBanner();
			await this.queueCh.send({files: queueStatusBanner});
			this.queueStatusMsg = await this.queueCh.send({files: [], embeds: [queueStatusEmbed], components: queueStatusButtons});
			this.queueMsgId = this.queueStatusMsg.id;
			console.log(`New queue message sent. The message ID is ${this.queueMsgId}.`);
		}
		
		//await queueCh.send({embeds: [queueJoinEmbed], components: qjButtonRows});
		//await queueCh.send({embeds: [queueJoinEmbed], components: qjButtonRows});
		
		const queueCollector = await this.queueStatusMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button });
		
		if (!this.queuesEnabled) {
			await this.toggleQueueLock();
		}
		
		try{
			queueCollector.on('collect', async i => {
				const buttonPressed = i.customId;
				const cmdCalled = buttonPressed.slice(4);
				const userId = i.user.id;
				//const currTime = new Date();
				//console.log(`${currTime}: ${cmdCalled} called by ${i.user.username}`);
				switch (cmdCalled) {
					case 'refresh':
						await i.deferUpdate();
						let followUpMsg = '';
						if ((cfg.idleParams.idleCheckerEnable) && (this.isInQueue(userId))) {
							await this.idleReset(userId);
							followUpMsg += 'Your queue idle timer has been reset.\n';
						}
						
						if (this.refreshCooldown) {
							followUpMsg += 'Refresh cooldown - please wait to refresh the RPUGs Queues message.';
						}
						else {
							await this.refreshWithCooldown();
							followUpMsg += 'The RPUGs Queues message above has been refreshed.';
						}
						await i.followUp({content: followUpMsg, ephemeral: true})
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
						break;
					case 'help':
						await i.deferReply({ephemeral: true});
						await help(i);
						/*
						await i.editReply({content: 'Please use `!help` in ' + `${cmdChannels.commandsCh}` + ' for info', emphemeral: true})
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
						*/
						break;
					case 'about':
						await i.deferReply({ephemeral: true});
						const supportMsg = await about({content: '!a'});
						await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
						break;
					case 'kick':
						await i.deferReply({ephemeral: true});
						if (!(isMod(userId))) {
							const errObj = errorMsg('This command is for administrators only.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
							break;
						}
						
						const featuredModeInfo = getModeInfo(this.featuredMode);
						
						const queueSelect = new Discord.ActionRowBuilder()
							.addComponents(
								new Discord.StringSelectMenuBuilder()
									.setCustomId('!kick queue select')
									.setPlaceholder('Select queue')
								/*
								// manually setting emoji for now, so not looping through modes- maybe define the emoji in config as well
								for (const m of this.modes) {
									queueSelect.addOptions(
										new Discord.StringSelectMenuOptionBuilder()
											.setLabel('Option')
											.setValue('option')
											.setDescription('A selectable option')
											.setEmoji('😄'),
								}
								*/
									.addOptions(
										new Discord.StringSelectMenuOptionBuilder()
											.setLabel('Casual')
											.setValue('casual')
											.setEmoji('3️⃣'),
										new Discord.StringSelectMenuOptionBuilder()
											.setLabel('Select')
											.setValue('select')
											.setEmoji('🇸'),
										new Discord.StringSelectMenuOptionBuilder()
											.setLabel('Scrims')
											.setValue('scrims')
											.setEmoji('<:osl:1115348694481510541>'),
										new Discord.StringSelectMenuOptionBuilder()
											.setLabel(`${featuredModeInfo.modeName}`)
											.setValue(`${this.featuredMode}`)
											.setEmoji(`${featuredModeInfo.emoji}`),
									)
							);
						
						let cancelButtonRow = new Discord.ActionRowBuilder()
							.addComponents(
								new Discord.ButtonBuilder()
									.setCustomId('!kick cancel')
									.setLabel('Cancel')
									.setEmoji('🏃')
									.setStyle(Discord.ButtonStyle.Danger)
							);
						
						const kickMsg = await i.editReply({content: '**Kick from queue command**\n*Lets flex some power, shall we?* :smiling_imp:', components: [queueSelect,cancelButtonRow], ephemeral: true});
						const kickCollector = await kickMsg.createMessageComponentCollector({idle: 20000});
						
						let kickList = [];
						let modeSelected;
						kickCollector.on('collect', async kicki => {
							const interaction = kicki.customId;
							const kickCmdCalled = interaction.slice(6);
							let currComponentState;
							
							switch (kickCmdCalled) {
								case 'cancel':
									await kicki.deferUpdate();
									kickCollector.stop()
									await i.editReply({content: 'Kick command cancelled.\nSo *weak* :unamused:', components: [], ephemeral: true})
									.then(
										async (msg) => {
											setTimeout(() => i.deleteReply(msg), 10000);
										}
									);
									break;
								case 'queue select':
									const selectedQueueName = kicki.values[0];
									const selectedQueue = this.allQueues[selectedQueueName];
									const selectedQueueSize = selectedQueue.length;
									//Check if anyone is in queue and if not, prompt separately to say "you're a dumbass, go again"
									if (selectedQueueSize === 0) {
										await kicki.deferReply({ephemeral: true});
										await i.editReply({components: [queueSelect, cancelButtonRow], ephemeral: true});
										await kicki.editReply({content: 'There is no one in that queue. Try again. <:pepega:573122566751780865>', components: [], ephemeral: true})
										.then(
											async (msg) => {
												setTimeout(() => i.deleteReply(msg), 10000);
											}
										);
										break;
									}
									await kicki.deferUpdate();
									
									modeSelected = selectedQueueName;
									const currQueueSelectState = kicki.message.components[0];
									const currQueueSelectOptionsState = currQueueSelectState.components[0].data.options;
									
									for (const q of currQueueSelectOptionsState) {
										if (q.value === selectedQueueName) {
											q.default = true;
										}
										else if (q.default) {
											delete q.default;
										}
									}
									
									const kickFromButtons = new Discord.ActionRowBuilder()
										.addComponents(
											new Discord.ButtonBuilder()
												.setCustomId('!kick from all')
												.setLabel('Kick from All Queues')
												//.setEmoji('🏃')
												.setStyle(Discord.ButtonStyle.Primary)
												.setDisabled(true)
										)
										.addComponents(
											new Discord.ButtonBuilder()
												.setCustomId('!kick from single')
												.setLabel(`Kick From ${capitaliseFirstLetter(selectedQueueName)} Queue`)
												//.setEmoji('🏃')
												.setStyle(Discord.ButtonStyle.Primary)
										);
									/*
									//There is no option to filter the list of users... yet, it just displays the entire list of users in the server (or channel, idk)
									const playerSelectRow = new Discord.ActionRowBuilder()
										.addComponents(
											new Discord.UserSelectMenuBuilder()
												.setCustomId('!kick player select')
												.setPlaceholder('Select player')
												.setMinValues(1)
												.setMaxValues(selectedQueueSize)
												//.addOptions(
												//	
												//);
										);
									*/
									let playerSelect = new Discord.StringSelectMenuBuilder()
										.setCustomId('!kick player select')
										.setPlaceholder('Select queue')
										.setMinValues(0)
										.setMaxValues(selectedQueueSize);
									for (const p of selectedQueue) {
										//await ... fetch the user using their discordId - need the username
										playerSelect.options.push(
											new Discord.StringSelectMenuOptionBuilder()
												.setLabel(`${p.username}`)	//using RPUGs username since the discord username will have to be fetched- fix this
												.setValue(`${p.discordId}`)	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
												.setDefault(false)
										);
									}
									const playerSelectRow = new Discord.ActionRowBuilder()
										.addComponents(playerSelect);
									
									await i.editReply({components: [currQueueSelectState, kickFromButtons, playerSelectRow, cancelButtonRow], ephemeral: true});
									
									break;
								case 'from all':	//kick from all queues or single queue
									await kicki.deferUpdate();
									currComponentState = kicki.message.components;
									currComponentState[1].components[1].data.disabled = false;
									currComponentState[1].components[0].data.disabled = true;
									await i.editReply({components: currComponentState, ephemeral: true});
									break;
								case 'from single':
									await kicki.deferUpdate();
									currComponentState = kicki.message.components;
									currComponentState[1].components[1].data.disabled = true;
									currComponentState[1].components[0].data.disabled = false;
									await i.editReply({components: currComponentState, ephemeral: true});
									break;
								case 'player select':
									await kicki.deferUpdate();
									
									currComponentState = kicki.message.components;
									kickList = kicki.values;
									const currPlayerSelectState = currComponentState[2];
									const currPlayerSelectOptionsState = currPlayerSelectState.components[0].data.options;
									
									for (const p of currPlayerSelectOptionsState) {
										if (kickList.includes(p.value)) {
											p.default = true;
										}
										else {
											p.default = false;
										}
									}

									let currCancelButtonRow = currComponentState[3];
									const currCancelButtonRowComponents = currCancelButtonRow.components;
									
									if (currCancelButtonRowComponents.length === 1) {
										currCancelButtonRowComponents.push(
											new Discord.ButtonBuilder()
												.setCustomId('!kick confirm')
												.setLabel('Confirm')
												.setEmoji('<:arosThumb:821354780265676801>')
												.setStyle(Discord.ButtonStyle.Secondary) 
										);
										
										await i.editReply({components: currComponentState, ephemeral: true});
										break;
									}
									else if (kickList.length === 0) {
										currComponentState[3] = cancelButtonRow;
										
										await i.editReply({components: currComponentState, ephemeral: true});
										break;
									}
									break;
								case 'confirm':	//(or complete, etc.. w/e it will be called)
									await kicki.deferUpdate();
									
									const kickFromAll = kicki.message.components[1].components[0].data.disabled;
									let playersKicked = {};	//needed in case some players leave before being kicked
									for (const discId of kickList) {
										if (kickFromAll) {
											playersKicked[`${discId}`] = await this.removeFromQueue(discId,null,false);
											await this.refreshEmbed();
											
											
										}
										else {
											playersKicked[`${discId}`] = await this.removeFromSingleQueue(discId,modeSelected);
											await this.refreshEmbed();
										}
									}
									//send kick embed thing to updatesCh and mod channel
									const mentionStr = Object.entries(playersKicked)
										.filter( ([,resp]) => resp === true)
										.map( ([d]) => `<@${d}>`)
										.join(', ');
									let embedFilesList = [];
									const embedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/adminKick.png', {name: 'adminKick.png'}); //from: created on MS Word
									embedFilesList.push(embedAuthThumb);

									let kickEmbed = {
										color: 0xeda445,
										author: {
											name: `The following player/s were kicked from the RPUGs queue/s by an admin. `,
										},
										description: `${mentionStr}`,
										thumbnail: {
											url: "attachment://" + embedAuthThumb.name,
										},
									};
										
									await cmdChannels.updatesCh.send({files: embedFilesList, embeds: [kickEmbed]});
									
									kickEmbed.footer = {
										text: `Command performed by Admin ${i.user.id} ${i.user.username}`
									};
									await cmdChannels.modCh.send({files: embedFilesList, embeds: [kickEmbed]});
									
									kickCollector.stop();
									let modEmbedFilesList = [];
									const modEmbedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/adminKickSuccess.gif', {name: 'adminKickSuccess.gif'}); //from: created on MS Word
									modEmbedFilesList.push(modEmbedAuthThumb);
									
									await i.editReply({content: 'Kick command completed', components: [], files: modEmbedFilesList, ephemeral: true})
									.then(
										async (msg) => {
											setTimeout(() => i.deleteReply(msg), 10000);
										}
									);
									break;
							}
						});
						kickCollector.on('end', async (collected,reason) => {
							if (reason === 'idle') {
								await i.editReply({content: 'Kick command timed out. Why are you doing this?', components: [], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
							}
						});
						
						
						break;
					case 'lock':
						await i.deferUpdate();
						if (!(isMod(userId))) {
							const errObj = errorMsg('This command is for administrators only.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
							break;
						}
						if (await this.toggleQueueLock()) {
							const queueLockState = this.#lockEmojis[this.queueBlocked.toString()]
							await i.followUp({content: `${queueLockState.emoji} Queue successfully ${queueLockState.state}`, ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
						}
						else {
							const errObj = errorMsg('An error occurred while toggling the queue lock.', 'Please contact the developer.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
						}
						break;
					case 'twos':
					case 'fours':
					case 'casual':
					case 'solo':
					case 'fullhouse':
					case 'dodgepuck':
					case 'dodgechaos':
					case 'select':
					case 'scrims':
						await i.deferUpdate();
						//error checks below not needed if user is already in queue and is also allowed to leave whether banned or not and whether queue is blocked or not
						if (this.isInQueue(userId,cmdCalled)) {
							await this.removeFromQueue(userId,cmdCalled);
							const modeName = `${capitaliseFirstLetter(cmdCalled)}`;
							await i.followUp({content: `You left the ${modeName} RPUGs queue.`, ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
							break;
						}
						
						if (isBanned(userId)) {
							const errObj = errorMsg('You cannot join the queue as you are banned.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
							break;
						}
						
						if (this.queueBlocked) {
							const errObj = errorMsg('You cannot join the queue as the queue is locked.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
							break;
						}
						let player;
						try {
							player = getPlayerQuery(userId,null);

							if (player === null) {
								const errObj = errorMsg('Unregistered players cannot queue.','For more information, use the :information_source: Help button.');
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
								break;
							}
							
							if (getDraftFromDiscordId(userId) !== false) {
								const errObj = errorMsg('You are in an unreported match.','Please finish the match and wait for both captains to report the score.');
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
								break;
							}
							
						}
						catch (err) {
							console.log(err);
						}
						
						if (cmdCalled === 'select') {
							//check if in selection list, also !rl command has to be updated
							if (!(await this.isPlayerInSelectGamemode(userId))) {
								const errObj = errorMsg('You cannot join the Select RPUGs queue. You must be on the select list to join.','For more information on how to be selected for this queue, use `!help` in ' + `${cmdChannels.commandsCh}` + ' and navigate to `Game Modes > Select` in the interaction menus.',null,false);
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 20000);
									}
								);
								break;
							}
						}
						
						if (cmdCalled === 'scrims') {
							if ((this.inQueueCheckEnable) && (this.allQueues.scrims.length === 1) && (this.allQueues.scrims[0].scrims.players.includes(userId))) {
								const errObj = errorMsg('You cannot join the Scrims RPUGs queue. Your teammate is already in the queue.',null,null,false);
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
								break;
							}
							
							if (!(isLeaguePlayer(userId))) {
								const errObj = errorMsg('You cannot join the Scrims RPUGs queue. You must be on an OSL league team to join.',`See <#863250493349691442> to play in the OSL league- new players welcome!`,null,false);
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
								break;
							}
							
							const playerTeam = getTeamFromDiscordIdQuery(userId);
							if (getDraftFromTeamId(playerTeam.teamId)) {
								const errObj = errorMsg('You cannot join the Scrims RPUGs queue. Your team is already in a match.',`Please check in (${cmdChannels.updatesCh}) to join the match.`,null,false);
								await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
								.then(
									async (msg) => {
										setTimeout(() => i.deleteReply(msg), 10000);
									}
								);
								break;
							}
							else {
								player.scrims = playerTeam;
							}
						}
						
						//not in queue, and all error checks passed, add to queue
						await this.addToQueue(player,cmdCalled);
						const modeName = `${capitaliseFirstLetter(cmdCalled)}`;
						logger.log('info', `UserID ${userId} ${i.user.username} (P${player.playerId} ${player.username}) joined the ${modeName} RPUGs queue.`);
						await i.followUp({content: `You joined the ${modeName} RPUGs queue.`, ephemeral: true})
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
						
						if (!(this.queueJoin.playerList.includes(player.username))) {
							this.queueJoin.playerList.push(player.username);
						}

						if (this.queueJoin.timer) {
							clearTimeout(this.queueJoin.timer);
							this.queueJoin.timer = null;
						}

						this.queueJoin.timer = setTimeout(async () => {
							await this.queueCh.send({content: `${this.queueJoin.playerList.join(',')} joined a queue.`})
								.then(
									async (msg) => {
										await msg.delete();
									}
								)
								.catch(console.error);
							this.queueJoin.playerList = [];
						}, 2000);		

						break;
					case 'current matches':
						await i.deferReply({ephemeral: true});
						const activeMatchesMsg = await activeMatches({content: '!active'});
						await i.editReply({files: activeMatchesMsg.embedFiles, embeds: [activeMatchesMsg.embedMessage], emphemeral: true});
						break;
					case 'leave all':
						await i.deferUpdate();
						if (await this.removeFromQueue(userId)) {
							await i.followUp({content: `You left all RPUGs queues.`, ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
						}
						else {
							const errObj = errorMsg('You are not in any RPUGs queues.');
							await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 10000);
								}
							);
						}
						break;
					case 'report win':
					case 'report loss':
						await i.deferReply({ephemeral: true});
						
						const winOrLoss = getWord(cmdCalled, 2);
						let mrResponse = await this.handleMatchReport(userId,winOrLoss);
						mrResponse.ephemeral = true;
						await i.followUp(mrResponse)
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
						break;
				}
				//const completeTime = new Date();
				//console.log(`${completeTime}: ${cmdCalled} by ${i.user.username} completed`);
			});
		}
		catch (err) {
			console.log('Error in queue collection listener');
			console.log(err);
		}
	}
	
	getQueueBanner() {
		let embedFilesList = [];
		const embedImg = new Discord.AttachmentBuilder(`./thumbnails/queueStatusMsgBanner.png`, {name: 'queueStatusMsgBanner.png'});
		embedFilesList.push(embedImg);
		
		return embedFilesList;
	}

	createQueueEmbed() {
		const featuredModeFields = this.getFeaturedModeFields(this.featuredMode);
		
		const queueEmbed = {
			color: 0x2832c2,
			//title: 'RPUGs Queues',
			//description: '*Join/Leave the corresponding queues using the buttons below.*',
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			//image: {
			//	url: 'attachment://' + embedImg.name
			//},
			fields: [	//maybe this can be a for statement for each mode
				{
					name: `${'► Casual - 3v3'.padEnd(21, ' ')}\u200b`,
					value: '»\n»\n»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \n» \u200b',
					inline: true
				},
				{
					name: `${'► Select - 3v3'.padEnd(21, ' ')}\u200b`,
					value: '»\n»\n»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \n» \u200b',
					inline: true
				},
				{
					name: `${'► Scrims - League'.padEnd(21,' ')}\u200b`,
					value: '»',
					//value: '»\u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(151,' ')}\u200b`,
					value: `${':sparkles: **Featured Mode of the Week** :sparkles:'}`,
					inline: false
				},
			],
			//footer: {
			//	text: 'Last Refresh: ${}'
			//}
		};
		
		for (const f of featuredModeFields) {
			queueEmbed.fields.push(f);
		}
		
		queueEmbed.fields.push({
			name: 'Shortcuts',
			value: `${cmdChannels.tipsCh}  •  ${cmdChannels.liveCh}\n${cmdChannels.updatesCh}  •  ${cmdChannels.commandsCh}  •  ${cmdChannels.otherCh}`,
			inline: false
		})
		
		return queueEmbed;
	}
	
	getFeaturedModeFields(mode) {
		//maybe automate later
		const featuredModesFields = {
			twos: [
				{
					name: `${'► Twos - 2v2'.padEnd(21,' ')}\u200b`,
					value: '»\n»\n»\u200b',
					//value: '» <@741455857820237935>\n» <@516995472561405966>\n» \u200b',
					inline: true
				},
			],
			fours: [
				{
					name: `${'► Fours - 4v4'.padEnd(32,' ')}\u200b`,
					value: '»\n»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(20,' ')}\u200b`,
					value: '»\n»\n»\u200b',
					inline: true
				},
			],
			solo: [
				{
					name: '► Solo - 1v1',
					value: '»\u200b',
					inline: true
				},
			],
			fullhouse: [
				{
					name: `${'► Fullhouse - 6v6'.padEnd(12,' ')}\u200b`,
					value: '»\n»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(13,' ')}\u200b`,
					value: '»\n»\n»\n»\u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(13,' ')}\u200b`,
					value: '»\n»\n»\u200b',
					inline: true
				},
			],
			dodgepuck: [
				{
					name: `${'► Dodgepuck - 3v3'.padEnd(21, ' ')}\u200b`,
					value: '»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \n» \u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(20,' ')}\u200b`,
					value: '»\n»\u200b',
					inline: true
				},
			],
			dodgechaos: [
				{
					name: `${'► Dodgechaos - 6v6'.padEnd(12,' ')}\u200b`,
					value: '»\n»\n»\n»\u200b',
					//value: '» \n» <@516995472561405966>\n» \n» \u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(13,' ')}\u200b`,
					value: '»\n»\n»\n»\u200b',
					inline: true
				},
				{
					name: `\u200b${''.padEnd(13,' ')}\u200b`,
					value: '»\n»\n»\u200b',
					inline: true
				},
			]
			/*
			chaos: [
				{
					name: '► Chaos - 3v3',
					value: '» \n» \u200b',
					inline: true
				},
			]
			*/
		}
		
		return featuredModesFields[mode];
	}

	createQueueComponents() {
		/*
		let buttonLabels = {
			'col1': [
				'Refresh',
				'Twos',
				'Casual',
				'Leave All'
			],
			'col2': [
				'Help',
				'',
				'Scrims'
			],
			'col3': [
				'Support',
			]
		};
		
		
		for (let [label,col] of Object.entries(buttonLabels)) {
			const maxWidth = Math.max(
				...col.map((button) => getStringWidth(button))
			);
			buttonLabels[label] = col.map(b => padStringToWidth(b, maxWidth, "center"));
		};
		*/
		
		//whitespace characters
		//https://qwerty.dev/whitespace/
		
		const utilityButtonWidth = 60;
		
		let queueStatusRow1 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs refresh`)
					//.setLabel(`\u200b${buttonLabels['col1'][0]}\u200b`)	//Refresh
					.setLabel(`\u200b${padStringToWidth	('Refresh',utilityButtonWidth,"center")}\u200b`)
					.setEmoji('🔁')
					.setStyle(Discord.ButtonStyle.Secondary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs help`)
					//.setLabel(`\u200b ${buttonLabels['col2'][0]} \u200b`)	//Help
					.setLabel(`\u200b${padStringToWidth('Help',utilityButtonWidth,"center")}\u200b`)
					.setEmoji('ℹ️')
					.setStyle(Discord.ButtonStyle.Secondary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs about`)
					//.setLabel(`\u200b${buttonLabels['col3'][0]}\u200b`)	//About
					.setLabel(`\u200b${padStringToWidth('About',utilityButtonWidth-17,"center")}\u200b`)
					.setEmoji('<:OSLCorgo:1114817237317075025>')
					.setStyle(Discord.ButtonStyle.Secondary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs kick`)
					//.setLabel(`\u200b${buttonLabels['col3'][0]}\u200b`)	//Kick
					//.setLabel(`\u200b${padStringToWidth('Support',utilityButtonWidth,"center")}\u200b`)
					//.setEmoji('<:queuekick5:1115224358634401812>')
					.setEmoji('👟')
					.setStyle(Discord.ButtonStyle.Secondary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs lock`)
					//.setLabel(`\u200b${buttonLabels['col3'][0]}\u200b`)	//Lock
					//.setLabel(`\u200b${padStringToWidth('Support',utilityButtonWidth,"center")}\u200b`)
					.setEmoji('🔓')
					//.setEmoji('🔒')
					.setStyle(Discord.ButtonStyle.Secondary)
			);
			
		/*
		//Separate embeds for joining and leave queue take up too much vertical space
		let queueJoinEmbed = {
			color: 0xb0fc38,
			title: 'Join Queue',
			description: '*Join the corresponding queues above using the buttons below*',
		};
		*/
		
		const modeButtonWidth = 114;
		
		let queueStatusRow2 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs casual`)
					//.setLabel(`\u200b${buttonLabels['col1'][2]}\u200b`)	//Casual
					.setLabel(`\u200b${padStringToWidth('Casual',modeButtonWidth,"center")} \u200b`)
					.setEmoji('3️⃣')
					.setStyle(Discord.ButtonStyle.Success)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs select`)
					//.setLabel(`\u200b${buttonLabels['col1'][2]}\u200b`)	//Casual
					.setLabel(`\u200b${padStringToWidth('Select',modeButtonWidth,"center")}\u200b`)
					.setEmoji('3️⃣')
					.setStyle(Discord.ButtonStyle.Success)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs scrims`)
					//.setLabel(`\u200b${buttonLabels['col2'][2]} \u200b`)	//Scrims
					.setLabel(`\u200b${padStringToWidth('Scrims',utilityButtonWidth+20,"center")}\u200b`)	//2 hair space
					.setEmoji('<:osl:1115348694481510541>')
					.setStyle(Discord.ButtonStyle.Success)
			);
			/*
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs fullhouse`)
					//.setLabel(`\u200b${buttonLabels['col2'][2]} \u200b`)	//Fullhouse
					.setLabel(`\u200b${padStringToWidth('Full-House',modeButtonWidth,"center")}\u200b`)
					.setEmoji('<:osl:1115348694481510541>')
					.setStyle(Discord.ButtonStyle.Success)
			);
			*/
			/*
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs solo`)
					//.setLabel(`\u200b${buttonLabels['col2'][2]} \u200b`)	//Ones
					.setLabel(`\u200b${padStringToWidth('Solo',modeButtonWidth,"center")}\u200b`)
					.setEmoji('<:osl:1115348694481510541>')
					.setStyle(Discord.ButtonStyle.Success)
			);
			*/
			//.addComponents(
			//	new Discord.ButtonBuilder()
			//		.setCustomId(`!qs chaos`)
			//		.setLabel(`\u200b${buttonLabels['col3'][2]} \u200b`)	//Chaos
			//		.setStyle(Discord.ButtonStyle.Success)
			//);
		const featuredModeInfo = getModeInfo(this.featuredMode);
		
		const featuredModeButtonWidths = {
			twos: {
				width: 440,
				extra: ''
			},
			fours: {
				width: 437,
				extra: '  '	//2 hair space
			},
			fullhouse: {
				width: 436,
				extra: ''
			},
			dodgepuck: {
				width: 436,
				extra: '  '	//2 hair space
			},
			solo: {
				width: 438,
				extra: '   '	//3 hair space
			},
			dodgechaos: {
				width: 439,
				extra: ' '
			}
		}
		
		let queueStatusRow3 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs ${this.featuredMode}`)
					//.setLabel(`\u200b ${buttonLabels['col1'][1]} \u200b`)	//Twos
					.setLabel(`\u200b` + padStringToWidth(`${featuredModeInfo.modeName}`,featuredModeButtonWidths[this.featuredMode].width,"center") + `${featuredModeButtonWidths[this.featuredMode].extra}\u200b`)
					.setEmoji(`${featuredModeInfo.emoji}`)
					.setStyle(Discord.ButtonStyle.Success)
			)
			/*
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs twos`)
					//.setLabel(`\u200b ${buttonLabels['col1'][1]} \u200b`)	//Twos
					.setLabel(`\u200b${padStringToWidth('Twos',modeButtonWidth,"center")} \u200b`)
					.setEmoji('2️⃣')
					.setStyle(Discord.ButtonStyle.Success)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs fours`)
					//.setLabel(`\u200b${padStringToWidth('Fours',133.5,"center")}\u200b`)	//Fours
					.setLabel(`\u200b${padStringToWidth('Fours',modeButtonWidth,"center")}\u200b`)
					.setEmoji('4️⃣')
					.setStyle(Discord.ButtonStyle.Success)
			);
			
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs disabledButton`)
					.setLabel(`\u200b${buttonLabels['col3'][1]} \u200b`)	//Disabled Button
					.setStyle(Discord.ButtonStyle.Success)
					.setDisabled(true)
			);
			*/
		
		
			
		let queueStatusRow4 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs leave all`)
					//.setLabel(`\u200b${buttonLabels['col1'][3]}\u200b`)	//Leave All
					.setLabel(`\u200b${padStringToWidth('Leave All Queues',440,"center")} \u200b`)
					.setEmoji('<a:pepeexit:1114822714562203699>')
					.setStyle(Discord.ButtonStyle.Danger)
			);
		
		const matchesButtonsWidth = 103;
			
		let queueStatusRow5 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs current matches`)
					//.setLabel(`\u200b${padStringToWidth('Current Matches',modeButtonWidth,"center")}\u200b`)	//133.5 width originally for this button
					.setLabel(`\u200b${padStringToWidth('Current Matches',matchesButtonsWidth,"center")} \u200b`)	//133.5 width originally for this button
					//.setLabel(`Current Matches`)	//133.5 width originally for this button
					.setEmoji('📋')
					.setStyle(Discord.ButtonStyle.Primary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs report win`)
					//.setLabel(`\u200b${padStringToWidth('Current Matches',modeButtonWidth,"center")}\u200b`)	//133.5 width originally for this button
					.setLabel(`\u200b${padStringToWidth('Report Win',matchesButtonsWidth,"center")}\u200b`)	//133.5 width originally for this button
					//.setLabel(`Current Matches`)	//133.5 width originally for this button
					.setEmoji('🇼')
					.setStyle(Discord.ButtonStyle.Success)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!qs report loss`)
					//.setLabel(`\u200b${buttonLabels['col1'][3]}\u200b`)	//Leave All
					.setLabel(`\u200b${padStringToWidth('Report Loss',matchesButtonsWidth,"center")}\u200b`)
					.setEmoji('🇱')
					.setStyle(Discord.ButtonStyle.Danger)
			);
		
		let queueButtons = [queueStatusRow1, queueStatusRow2, queueStatusRow3, queueStatusRow4, queueStatusRow5];
		queueButtons = this.disableQueueButtonsForDisabledQueues(queueButtons);
		
		return queueButtons;
	}

	async idleReset(id) {
		//improve the following to track player join time separately in future, but for now reset join times in all queues
		for (const q of Object.values(this.allQueues)) {
			for (let p of q) {
				if (p.discordId == id) {
					p.joinTime = new Date();
					p.idleAlerted = false;
					break;
				}
			}
		}
	}

	async refreshWithCooldown() {
		this.refreshCooldown = true;
		setTimeout(() => {
			this.refreshCooldown = false;
		}, 10000);
		await this.refreshEmbed();
	}
	/*
	async kickFromQueue(user) {
		let testMenu = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('testies')
					.setPlaceholder('Select queue')
					.addOptions(
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel('Option')
							.setValue('option1')
							.setDescription('A selectable option')
							.setEmoji(':smile:')
					)
			);

	}
	*/
	async toggleQueueLock()  {
		this.queueBlocked = !this.queueBlocked;
		try {
			await this.toggleQueueButtons();
			return true;
		}
		catch (err) {
			console.log(err);
			return false;
		}
	}
	
	async toggleQueueButtons() {
		let currQueueButtons = this.queueStatusMsg.components;
		let currQueueEmbed = this.queueStatusMsg.embeds[0];
		
		const queueNames = Object.keys(this.allQueues);
		for (const r of currQueueButtons) {
			for (const b of r.components) {
				const buttonName = b.data.custom_id.slice(4);
				//if ((queueNames.includes(buttonName)) || (buttonName === 'leave all')) {	//I don't think I need to lock the leave all button?
				if ((queueNames.includes(buttonName)) && (!(this.disabledQueueNames.includes(buttonName)))) {
					b.data.disabled = !b.data.disabled;
				}
				else if (buttonName === 'lock') {
					const queueState = this.#lockEmojis[this.queueBlocked.toString()];
					b.data.emoji.name = queueState.emoji;
					
					currQueueEmbed.data.description = this.queueBlocked ? `${queueState.emoji} *All queues are currently ${queueState.state}.*` : '';
				}
			}
		}

		this.queueStatusMsg = await this.queueStatusMsg.edit({components: currQueueButtons, embeds: [currQueueEmbed]});
		
		return;
	}
	
	disableQueueButtonsForDisabledQueues(btns) {
		this.disabledQueueNames = [];
		for (const m of this.modes) {
			if (!m.enabled) {
				this.disabledQueueNames.push(m.modeName.toLowerCase());
			}
		}
		for (const r of btns) {
			for (const b of r.components) {
				const buttonName = b.data.custom_id.slice(4);
				//if ((queueNames.includes(buttonName)) || (buttonName === 'leave all')) {	//I don't think I need to lock the leave all button?
				if (this.disabledQueueNames.includes(buttonName)) {
					b.data.disabled = true;
					break;
				}
			}
		}

		return btns;
	}

	isInQueue(id,mode = null) {
		if (!this.inQueueCheckEnable) { return false; }
		if (!mode) {
			for (const q of Object.values(this.allQueues)) {
				if ((q.map(p => p.discordId)).includes(id)) {
					return true;
				}
			}
		}
		else {
			if ((this.allQueues[mode].map(p => p.discordId)).includes(id)) {
				return true;
			}
		}
		return false;
	}
	
	async isPlayerInSelectGamemode(discordId) {
		return await isPlayerInSelectGamemodeQuery(discordId);
	}
	
	async removeFromQueue(player, mode = null, refreshEmbed = true) {
		//if mode is null, remove from all queues
		if (!mode) {
			let removedAtLeastOnce = false;
			for (const [mn,q] of Object.entries(this.allQueues)) {
				if (await this.removeFromSingleQueue(player,mn)) {
					removedAtLeastOnce = true;
				}
			}
			if (!removedAtLeastOnce) {
				return false;
			}
		}
		else {
			await this.removeFromSingleQueue(player,mode);
			await this.idleReset(player);
		}
		if (refreshEmbed) {
			await this.refreshEmbed();
		}
		return true;
	}
	
	async removeFromSingleQueue(player,mode) {
		let removed = false;
		for (const [mn,q] of Object.entries(this.allQueues)) {
			if (mn === mode) {
				for (const [index, playerObj] of q.entries()) {
					if (player === playerObj.discordId) {
						q.splice(index, 1);
						removed = true;
						const modeName = `${capitaliseFirstLetter(mn)}`;
						logger.log('info', `UserID ${player} (P${playerObj.playerId} ${playerObj.username}) left the ${modeName} RPUGs queue.`);
						break;
					}
				}
				break;
			}
		}
		return removed;
	}
	
	async addToQueue(player, mode) {
		const currTime = new Date();
		player.joinTime = currTime;
		player.idleAlerted = false;
		this.allQueues[mode].push(player);

		await this.idleReset(player.discordId);
		
		let poppedQueue = [];
		const queueModeName = `${capitaliseFirstLetter(mode)}`;
		const selectedQueue = this.allQueues[mode];
		for (const c of this.modes) {
			if ((c.modeName === queueModeName) && (selectedQueue.length === c.numPlayers)) {
				for (const p of selectedQueue) {
					delete p.joinTime;
					delete p.idleAlerted;
					poppedQueue.push(p);
				}
				
				for (const p of poppedQueue) {
					await this.removeFromQueue(p.discordId,null,false);
				}
				queuePop(poppedQueue,mode);
				logger.log('info', `${queueModeName} RPUGs queue popped.`);
				
				break;
			}
		}
		
		await this.refreshEmbed();

		return;
	}

	async refreshEmbed() {
		//used to have an argument for only editing the affected mode (e.g. joining a specific queue), but editing embeds is very time-consuming so it's better to just re-do all fields and use the resetting timer (as used below) to ensure that the embed doesn't refresh too frequently
		
		//resetting timer so that the embed doesn't have to edit overly often- as it slows the bot down
		//const refCallTime = new Date();
		//console.log(`${refCallTime}: Refresh function called`);
		if (this.refreshEmbedFn.timer) {
			await this.#nullRefreshTimer();
		}
		
		this.refreshEmbedFn.numCalls += 1;
		
		if (this.refreshEmbedFn.numCalls >= 10) {
			await this.executeRefreshOnServer();
            await this.#nullRefreshTimer();
			this.refreshEmbedFn.numCalls = 0;
			
			//const refNumCallsTime = new Date();
			//console.log(`${refNumCallsTime}: Refreshed embed due to numCalls`);
			return;
		}
		
		this.refreshEmbedFn.timer = setTimeout(async () => {
			await this.executeRefreshOnServer();
            await this.#nullRefreshTimer();
			this.refreshEmbedFn.numCalls = 0;
			
			//const refTimer = new Date();
			//console.log(`${refTimer}: Refreshed embed due to timer`);
			
			setTimeout(async () => {
				await this.executeRefreshOnServer();
				//const ref3sec = new Date();
				//console.log(`${ref3sec}: Refreshed 3 seconds after timer`);
			}, 3000);
            
		}, 2000);
		
		return;
	}
	
	async #nullRefreshTimer() {
		clearTimeout(this.refreshEmbedFn.timer);
        this.refreshEmbedFn.timer = null;
		return;
	}
	
	async executeRefreshOnServer() {
		let currQueueEmbedFields = this.queueStatusMsg.embeds[0].data.fields;
		for (const mn of Object.keys(this.allQueues)) {
			for (const [i,f] of currQueueEmbedFields.entries()) {
				const fieldModeName = f.name.split(' ')[1] || '';
				const fieldModeNameLowerCase = fieldModeName.toLowerCase();
				
				if ((fieldModeName) && (fieldModeNameLowerCase === mn)) {
					const modeInfo = getModeInfo(fieldModeNameLowerCase);
					
					let queuePlayerMentions = this.allQueues[mn].map(p => `<@${p.discordId}>`);
					let queuePlayerIdleAlertStates = this.allQueues[mn].map(p=> p.idleAlerted);
					
					const numSpots = modeInfo.numPlayers - 1 - queuePlayerMentions.length;
					for (let j = 0; j < numSpots; j++) {
						queuePlayerMentions.push('');
					}
					
					if (fieldModeNameLowerCase === this.featuredMode) {
						const featuredModeFields = this.getFeaturedModeFields(fieldModeNameLowerCase);
						
						let fieldLineSum = 0;
						for (let k = 0; k < featuredModeFields.length; k++) {
							const numFieldLines = featuredModeFields[k].value.match(new RegExp('»','g')).length;
							
							let fieldVal = '';
							for (let l = 0; l < numFieldLines; l++) {
								fieldVal += `${queuePlayerIdleAlertStates[fieldLineSum+l] ? ':clock9:' : '»'}`;
								fieldVal += `${queuePlayerMentions[fieldLineSum+l]}\n`;
								//fieldVal += '<@741455857820237935>\n'	//for testing
							}
							fieldLineSum += numFieldLines;
							
							currQueueEmbedFields[i+k].value = fieldVal;
						}

					}
					/*
					let numLines;
					for (const m of this.modes) {
						if (m.modeName === fieldModeName) {
							numLines = m.numPlayers - 1;
							break;
						}
					}
					
					let queuePlayerMentions = this.allQueues[mn].map(p => `<@${p.discordId}>`);
					let queuePlayerIdleAlertStates = this.allQueues[mn].map(p=> p.idleAlerted);
					const numSpots = numLines - queuePlayerMentions.length;
					for (let j = 0; j < numSpots; j++) {
						queuePlayerMentions.push('');
					}
					
					if (numLines>5) {
						let field1Val = '';
						for (let k = 0; k < Math.ceil(numLines/2); k++) {
							field1Val += `${queuePlayerIdleAlertStates[k] ? ':clock9:' : '»'}`;
							field1Val += `${queuePlayerMentions[k]}\n`;
						}
						f.value = field1Val;
						
						let field2Val = '';
						for (let k = Math.ceil(numLines/2); k < numLines; k++) {
							field2Val += `${queuePlayerIdleAlertStates[k] ? ':clock9:' : '»'}`;
							field2Val += `${queuePlayerMentions[k]}\n`;
						}
						currQueueEmbedFields[i+1].value = field2Val;
					}
					*/
					else if (mn === 'scrims') {
						const scrimPlayer = this.allQueues[mn][0];
						let fieldVal = '';
						if (scrimPlayer) {
							fieldVal += `${scrimPlayer.idleAlerted ? ':clock9:' : '»'}`;
							fieldVal += `<@${scrimPlayer.discordId}>\n${scrimPlayer.scrims.teamName.replace(/_/g,' ')}\n(${scrimPlayer.scrims.league})`;
						}
						else {
							fieldVal += '»';
						}
						f.value = fieldVal;
					}
					else {
						let fieldVal = '';
						for (const [idx,pm] of queuePlayerMentions.entries()) {
							fieldVal += `${queuePlayerIdleAlertStates[idx] ? ':clock9:' : '»'}`;
							fieldVal += `${pm}\n`;
						}
						f.value = fieldVal;
					}
					
					break;
				}
			}
		}
		
		/*
		this.queueStatusMsg.embeds[0].data.footer = {
			text: `Last Refresh: ${}`
		};
		*/
		let currQueueEmbed = this.queueStatusMsg.embeds[0].data;
		currQueueEmbed.fields = currQueueEmbedFields;
		this.queueStatusMsg = await this.queueStatusMsg.edit({embeds: [currQueueEmbed]});
		
		return;
	}
	
	async idleCheck(idleThresholdmin,kickThresholdmin) {
		const currentTime = new Date();
		const idleThresholdms = idleThresholdmin * 1000 * 60; //convert mins to ms
		const kickThresholdms = kickThresholdmin * 1000 * 60; //convert mins to ms

		let checkingPlayers = [];
		for (const q of Object.values(this.allQueues)) {
			for (const p of q) {
				if (((currentTime - p.joinTime) > idleThresholdms) && (!p.idleAlerted)) {
					const checkingPlayersDiscordIds = checkingPlayers.map(player => player.discordId);
					if (!checkingPlayersDiscordIds.includes(p.discordId)) {
						checkingPlayers.push(p);
					}
					p.idleAlerted = true; //to ensure the player is only warned once and not repeatedly
				}
			}
		}
		for (const idlePlayer of checkingPlayers) {
			const playerClient = await bot.users.fetch(idlePlayer.discordId);
			
			let embedFilesList = [];
			const embedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/idleKick.png', {name: 'idleKick.png'}); //from: created on MS Word
			embedFilesList.push(embedAuthThumb);
		
			let IKEmbed = {
				color: 0xeda445,
				author: {
					name: `You will be kicked for idling in approximately ${kickThresholdmin} minutes.`,
					icon_url: 'attachment://' + embedAuthThumb.name
				},
				description: 'Click the :repeat: `Refresh` button in ' + `${this.queueCh} to reset your queue idle timer.`
			};
			
			try {
				await playerClient.send({ files: embedFilesList, embeds: [IKEmbed]});
			}
			catch (error) {
				if (error.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${idlePlayer.discordId}> ${playerClient.username}`,null,false);
					try {
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]});
					}
					catch (error) {
						console.log(error);
					}
				}
				else {
					console.log(error);
				}
			}
		}
		if (checkingPlayers.length > 0) {
			await this.refreshEmbed();
		}
		let kickPlayers = [];
		for (const [m,q] of Object.entries(this.allQueues)) {
			for (const p of q) {
				if ((currentTime - p.joinTime) > (idleThresholdms+kickThresholdms+5000)) {
					//q = q.filter(playerObj => playerObj !== p);
					//console.log(p);
					const kickPlayerDiscordIds = kickPlayers.map(p => p.discordId);
					if (!kickPlayerDiscordIds.includes(p.discordId)) {
						kickPlayers.push(p);
					}
				}
			}
		}

		if (kickPlayers.length > 0) {
			for (const p of kickPlayers) {
				await this.removeFromQueue(p.discordId,null,false);
			}
			
			await this.refreshEmbed();
			
			const loggerStr = kickPlayers.map(p => `${p.discordId} ${p.username}`).join(', ');
			logger.log('info', `UserID/s ${loggerStr} was/were kicked from the RPUGs queue/s for idling.`);
			/*
			const mentionStr = kickPlayers.map(p => `<@${p.discordId}>`).join(', ');
			
			let embedFilesList = [];
			const embedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/idleKick.png', {name: 'idleKick.png'}); //from: created on MS Word
			embedFilesList.push(embedAuthThumb);
		
			let IKEmbed = {
				color: 0xeda445,
				author: {
					name: `The following player/s were kicked from the RPUGs queue/s for idling. They were in the queue for more than ${idleThresholdmin} minutes.`,
					icon_url: 'attachment://' + embedAuthThumb.name
				},
				description: `${mentionStr}`
			};
			
			await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [IKEmbed]}).catch(console.error);
			*/
		}
		
	}

	async handleMatchReport(id,score) {
		if (!isCaptain(id)) {
			const errObj = errorMsg('You are not a captain for any ongoing matches.','Only captains can report scores.');
			//await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true});
			//break;
			return {
				content: '',
				files: errObj.embedFiles,
				embeds: [errObj.embedMessage]
			}
		}
		
		const currentDraft = getDraftFromDiscordId(id);
		if (!currentDraft.matchInProgress) {
			const errObj = errorMsg('Did NOT report match.','Match has not started yet.');
			//await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true});
			//break;
			return {
				content: '',
				files: errObj.embedFiles,
				embeds: [errObj.embedMessage]
			}
		}

		let currentTeam;
		if (currentDraft.captainsObject[0].discordId === id) {
			currentTeam = 'teamA';
			var currCaptainObj = currentDraft.captainsObject[0];
			var othCaptainObj = currentDraft.captainsObject[1];
		}
		else if (currentDraft.captainsObject[1].discordId === id) {
			currentTeam = 'teamB';
			var currCaptainObj = currentDraft.captainsObject[1];
			var othCaptainObj = currentDraft.captainsObject[0];
		}
		
		const otherTeam = currentTeam === 'teamA' ? 'teamB' : 'teamA';
		
		if (score === 'win') {
			if (!currentDraft.reportedScores[currentTeam]) {
				currentDraft.reportedScores[currentTeam] = currentTeam;
				// following line is temporary for testing- remove later
				//currentDraft.reportedScores[otherTeam] = currentTeam;
			} else {
				const errObj = errorMsg('You have already reported the match.');
				//await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true});
				//break;
				return {
					content: '',
					files: errObj.embedFiles,
					embeds: [errObj.embedMessage]
				}
			}
		}
		else if (score === 'loss') {
			if (!currentDraft.reportedScores[currentTeam]) {
				currentDraft.reportedScores[currentTeam] = otherTeam;
				// following line is temporary for testing- remove later
				//currentDraft.reportedScores[otherTeam] = otherTeam;
			} else {
				const errObj = errorMsg('You have already reported the match.');
				//await i.followUp({files: errObj.embedFiles, embeds: [errObj.embedMessage], ephemeral: true});
				//break;
				return {
					content: '',
					files: errObj.embedFiles,
					embeds: [errObj.embedMessage]
				}
			}
		}
		
		if (currentDraft.reportedScores.teamA && currentDraft.reportedScores.teamB) {
			// Score indicates the same team won
			if (currentDraft.reportedScores.teamA === currentDraft.reportedScores.teamB) {
				//UpdataDatabase
				const mr = await updateDatabaseWithMatch(currentDraft,false,false);
				//await this.singleReportMsg.edit({ files: mr.embedFiles, embeds: [mr.embedMessage]});
				//await i.followUp({content: `Match reported! The rating updates are shown in ${cmdChannels.updatesCh}.`});
				return {
					content: `Match reported! The rating updates are shown in ${cmdChannels.updatesCh}.`,
					files: [],
					embeds: []
				}
				
			}
			else {
				currentDraft.reportedScores = {}; // reset
				const conflictErr = errorMsg('Match reports from both captains conflict.','Please contact an administrator, or try reporting the match again.');
				await currentDraft.captainsClient[otherTeam].send({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				//await currentDraft.captainsClient[currentTeam].send({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				//await i.followUp({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				//currentDraft.singleReportMsg = await currentDraft.singleReportMsg.edit({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				if (currentDraft.singleReportMsg) {	//in future add a checking window- wait for message to be sent
					currentDraft.singleReportMsg = await currentDraft.singleReportMsg.edit({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				}
				else {
					currentDraft.singleReportMsg = await cmdChannels.updatesCh.send({ files: conflictErr.embedFiles, embeds: [conflictErr.embedMessage]});
				}
				return {
					content: '',
					files: conflictErr.embedFiles,
					embeds: [conflictErr.embedMessage]
				}
			}
			
		}
		else {
			
			let winLoss = '';
			
			if (currentDraft.reportedScores[currentTeam] === currentTeam) {
				winLoss = 'Win';
			}
			else {
				winLoss = 'Loss';
			}
			
			let SRembed = {
				color: 0xc261fa,
				author: {
					name: `${currCaptainObj.username} has reported the match.`,
					icon_url: currentDraft.captainsClient[currentTeam].displayAvatarURL()
				},
				description: `Waiting for <@${othCaptainObj.discordId}> to also report the match...` + '\n' + `*Please use the :regional_indicator_w: / :regional_indicator_l: buttons in ${this.queueCh} to report.*`,
				/*
				thumbnail: {
					url: 'attachment://' + embedThumb.name
				},
				*/
				fields: [
					{
						name: 'Score reported',
						value: winLoss,
					}
				]
			};
					
			if (currentDraft.mode === 'scrims') {
				SRembed.author.name = `${currCaptainObj.username} (${currCaptainObj.scrims.teamName}) has reported the match.`;
				SRembed.description = `Waiting for <@${othCaptainObj.discordId}> (${othCaptainObj.scrims.teamName}) to also report the match...` + '\n' + `*Please use the :regional_indicator_w: / :regional_indicator_l: buttons in ${this.queueCh} to report.*`;
			}
			
			if (currentDraft.singleReportMsg) {
				currentDraft.singleReportMsg = await currentDraft.singleReportMsg.edit({files: [], embeds: [SRembed]});
			}
			else {
				currentDraft.singleReportMsg = await cmdChannels.updatesCh.send({files: [], embeds: [SRembed]});
			}
			
			SRembed.description = `Waiting for <@${othCaptainObj.discordId}> to also report the match...`
			//await i.followUp({embeds: [SRembed]});
			return {
				content: '',
				files: [],
				embeds: [SRembed]
			}
		}
	}

	isInQueueCheckEnabled() {
		return this.inQueueCheckEnable;
	}
}

function getQueues() {
	return queues;
}

export { Queue, getQueues };
