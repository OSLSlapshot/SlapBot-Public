import { bot, logger, cmdChannels } from '../index.js';
import { floor, random } from 'mathjs';
import stripUsername from '../utls/stripUsername.js';
import cfg from '../../config.js';
import Discord from 'discord.js'; 
import { getPlayerFromDiscordIdQuery } from '../queries/index.js';
import errorMsg from './errorMessage.js';
import { getQueues } from '../commands/queue.js';
import { createLobby } from '../queries/slapshot.js';
import { isMod } from '../utls/isMod.js';

const ongoingDrafts = [];

function getDraftConfig(mode) {
	if (mode === 'casual') {
		return {
			draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			arenaName: 'Slapstadium'
		}
	}
	else if (mode === 'twos') {
		return {
			draftOrder: getDraftOrder(mode),
			numPlayers: 4,
			arenaName: 'Slapstadium_Mini'
		}
	}
	else if (mode === 'fours') {
		return {
			draftOrder: getDraftOrder(mode),
			numPlayers: 8,
			arenaName: 'Slapville_Jumbo'
		}
	}
}
 
function getDraftOrder(mode) {
	if (mode === 'casual') {
		// 1-2-1 (Random first captain)
		if (Math.floor(Math.random() * 2)) {
			return {
				1: 'teamB',
				2: 'teamA',
				3: 'teamA',
				4: 'teamB'
			};
		} else {
			return {
				1: 'teamA',
				2: 'teamB',
				3: 'teamB',
				4: 'teamA'
			};
		}
	}
	else if (mode === 'twos') {
		return {
				1: 'teamB',
				2: 'teamA',
		};
	}
	else if (mode === 'fours') {
		// 1-2-2-1 (Random first captain)
		if (Math.floor(Math.random() * 2)) {
			return {
				1: 'teamB',
				2: 'teamA',
				3: 'teamA',
				4: 'teamB',
				5: 'teamB',
				6: 'teamA'
			};
		} else {
			return {
				1: 'teamA',
				2: 'teamB',
				3: 'teamB',
				4: 'teamA',
				5: 'teamA',
				6: 'teamB'
			};
		}
	}
}

function makepw(length) {
    let text = "";
    //var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let possible = "0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }
 
class Draft {
    constructor(captains, remainingPlayers, mode) {
		let index = 1;
		for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
			if (index === draft.index) {
				index+=1;
			}
		}
		this.index = index;
        ongoingDrafts.splice(index,0,this);
        this.mode = mode;
        this.captainsObject = captains;
        this.allPlayers = [...captains, ...remainingPlayers];
        this.teamA = [captains[0]];
        this.teamB = [captains[1]];
        this.nonCaptains = [...remainingPlayers];
		//this.remainingPlayers = { '1': remainingPlayers[0], '2': remainingPlayers[1], '3': remainingPlayers[2], '4': remainingPlayers[3] };
		this.remainingPlayers = {};
		for (const [i,p] of remainingPlayers.entries()) {
			this.remainingPlayers[`${i+1}`] = p;
		}
        this.draftNumber = 1;
        this.matchInProgress = false;
        this.reportedScores = {};
		
		this.draftConfig = getDraftConfig(mode);
		
		this.draftOrder = this.draftConfig.draftOrder;
		
        this.startDraft();
    }
 
    async startDraft() {
		
		this.checkinTimer = Math.floor((Date.now() + cfg.checkinTime * 60 * 1000) / 1000);
		
		// embeds: Author: Match found, alert.png, Description: Captains are drafting. Captains are:, Field inline: Team A, capt0, Field inline, Team B, capt1
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
		embedFilesList.push(embedThumb);
		
		const delim = "            ";
		
		let initNCEmbed = {
			color: 0x000000,
			author: {
				name: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Match found!`,
				icon_url: 'attachment://' + embedThumb.name
			},
			description: 'The captains are drafting.\nCaptains:',
			fields: [
				{
					name: 'Team A',
					value: '```' + `${this.captainsObject[0].username} (` + this.captainsObject[0][`${this.mode}`+'Rating'] + ')' + delim + '```',
					inline: true
				},
				{
					name: 'Team B',
					value: '```' + `${this.captainsObject[1].username} (` + this.captainsObject[1][`${this.mode}`+'Rating'] + ')' + delim + '```' + '\u200b',
					inline: true
				},
				{
					name: `:green_square: Remember to check in for the match!`,
					value: `Channel link: ${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkinTimer}:R>*`
				}
			]
		};

		
        // Initial DM to other players
		for (const player of this.nonCaptains) {
			const playerClient = await bot.users.fetch(player.discordId);
			await playerClient.send({ files: embedFilesList, embeds: [initNCEmbed]}).catch(console.error);
		}
		
		initNCEmbed.fields[2] = {
			name: ":green_square: Check in below :green_square:",
			value: `:warning: Cancelling <t:${this.checkinTimer}:R>`	//https://hammertime.cyou/en-GB
		};
		
		//create buttons for each player
		let buttonRows = [];
		let playerIdUser = [];
		for (const p of this.allPlayers) {
			playerIdUser.push({
				playerID: p.playerID,
				username: p.username,
				discordId: p.discordId
			});
		}
		let prevButton = {
			data: {
				custom_id: ''
			}
		};
		for (let r = 0; r < 5; r++) {
			let row = new Discord.ActionRowBuilder();
			for (let c = 0; c <5; c++) {
				const currPlayerID = `${playerIdUser[0].playerID}`;
				const currPlayerDiscordId = `${playerIdUser[0].discordId}`;
				//console.log(prevButton);
				if (prevButton.data.custom_id !== `${currPlayerID} ${currPlayerDiscordId}`) {
					row.addComponents(
						new Discord.ButtonBuilder()
							.setCustomId(`${playerIdUser[0].playerID} ${playerIdUser[0].discordId}`)
							.setLabel(`${playerIdUser[0].username}`)
							.setStyle(Discord.ButtonStyle.Success)
					)
					prevButton = row.components[c];
				}
				else {
					row.addComponents(
						new Discord.ButtonBuilder()
							//.setCustomId(`${playerUsernames[0]}`)
							.setCustomId(`${playerIdUser[0].playerID} ${playerIdUser[0].discordId} ${r},${c}`)
							.setLabel(`${playerIdUser[0].username}`)
							.setStyle(Discord.ButtonStyle.Success)
					)
				}
				
				playerIdUser.shift();
				
				if (playerIdUser.length === 0) {
					break;
				}
			}
			buttonRows.push(row);
			
			if (playerIdUser.length === 0) {
				break;
			}
		}
		
		await cmdChannels.updatesCh.send({ components: buttonRows, files: embedFilesList, embeds: [initNCEmbed]})
		.then( emMsg => {
			//emMsg.react('✅');
			
			let poppedQueue = [];
			this.allPlayers.forEach((playerObj) => {
				poppedQueue.push(playerObj.discordId);
			});

			//const filter =  (reaction, user) => reaction.emoji.name === '✅' && poppedQueue.includes(user.id);
			const filter =  (interaction) => {
				if (!(interaction.isButton())) {
					interaction.reply({content: "How did you even do this?!", ephemeral: true});
					return false;
				}

				const buttonCustomId = interaction.customId.split(" ");
				
				if (buttonCustomId[1] === interaction.user.id) {
					interaction.reply({content: "You have checked in!", ephemeral: true});
					return true;
				}
				else {
					interaction.reply({content: "This button is not for you!", ephemeral: true});
					return false;
				}
			}
			//const collector = emMsg.createReactionCollector(filter, { maxUsers: 6, time: cfg.checkinTime * 60 * 1000 }); // 5 min
			//const collector = emMsg.createReactionCollector({ filter: filter, maxUsers: this.draftConfig.numPlayers, time: cfg.checkinTime * 60 * 1000 }); // 5 min
			const collector = emMsg.createMessageComponentCollector({ filter: filter, maxUsers: this.draftConfig.numPlayers, time: cfg.checkinTime * 60 * 1000 });
			//const collector = emMsg.createMessageComponentCollector({ filter: filter, maxUsers: 1, time: cfg.checkinTime * 6 * 1000 });
			this.checkinCollector = collector;

			//collector.once('collect', (reaction,user) => {});
			collector.on('collect', async i => {
				poppedQueue = poppedQueue.filter(id => id !== i.user.id);

				for (const r of i.message.components) {
					for (const b of r.components) {
						if (b.data.custom_id === i.customId) {
							b.data.disabled = true;
						}
					}
				}
				await i.message.edit({
					components: i.message.components
				});
			});
			
			var thisClass = this;
			
			collector.once('end', async function(collected,reason) {
				if (reason === 'time') {	//limit, time, userLimit
					const collectorMsg = thisClass.checkinCollector.options.message;
					collectorMsg.embeds[0].fields[2] = {
						name: ":x: Check-in expired",
						value: "\u200b"
					};
					
					await collectorMsg.edit({
						embeds: collectorMsg.embeds,
					})
					.then( async matchMsg => {
						await matchMsg.removeAttachments();
					})
					
					let missedQueue = [];
					let missedPlayer = '';
					
					for (const id of poppedQueue) {
						missedPlayer = await getPlayerFromDiscordIdQuery(id);
						missedQueue.push(missedPlayer);
					}

					let playerList = '';

					missedQueue.forEach((player) => {
						playerList += '```';
						playerList += `${player.playerID} ${player.username} (${player.discordId})`;
						playerList += '```';
					});
					
					let ACEmbed = {
						color: 0xd7fc03,
						fields: [
							{
								name: 'The match below was automatically cancelled.',
								value: 'The following players did not check in:' + playerList
							}
						]
					};

					const cancelDraftIdx = thisClass.index;

					if (cancelDraftIdx) {
						await cmdChannels.modCh.send({embeds: [ACEmbed]}).catch(console.error);

						await removeDraft(cancelDraftIdx,{
							cancelCalled: true,
							adminAuthor: bot.user
						});
					}
				}
				else if (reason === 'userLimit') {
					const collectedMsg = collected.values().next().value;	//https://stackoverflow.com/questions/32373301/first-item-from-a-map-on-javascript-es2015
					//console.log(collectedMsg.attachments);
					collectedMsg.message.embeds[0].fields[2] = {
						name: ":white_check_mark: Check-in complete",
						value: "\u200b"
					};
					
					await collectedMsg.message.edit({
						embeds: collectedMsg.message.embeds,
					})
					.then( async matchMsg => {	//needed because: https://github.com/Rapptz/discord.py/issues/5139
						await matchMsg.removeAttachments();
					})
					
					/*
					.then( async matchMsg2 => {
						await collectedMsg.message.edit({
							embeds: collectedMsg.message.embeds,
							//files: embedFilesList
						})
					});
					*/
					/*
					cmdChannels.updatesCh.send({
						embeds: collectedMsg.message.embeds,
						components: collectedMsg.message.components
					});
					*/
					
					async function sleep(ms) {
						return new Promise(res => setTimeout(res,ms))
					}
					
					let waited = 0;
					
					while ((!thisClass.gamepass) && (waited < 300*2) && (await getDraftFromIndex(thisClass.index))) {
						await sleep(500);
						waited++;
					}
					
					if (waited === 300*2) {
						let WaitEmbed = {
							color: 0xffcd01,
							fields: [
								{
									name: 'The captains took too long to draft teams.',
									value: 'Please create the lobby manually.'
								}
							]
						};
					
						await cmdChannels.updatesCh.send({ embeds: [WaitEmbed] });
					}
					
					if (thisClass.gamepass) {
						const lobbySettings = {
							"region": "oce-east",
							"name": `RPUGs Match ${thisClass.index} - ${thisClass.mode.charAt(0).toUpperCase() + thisClass.mode.slice(1)} - ${thisClass.captainsObject[0].playerID},${thisClass.captainsObject[1].playerID}`,
							"password": `${thisClass.gamepass}`,
							"creator_name": "SlapBot-OSL",
							"is_periods": true,
							"arena": thisClass.draftConfig.arenaName,
						};
						
						const response = await createLobby(lobbySettings);
						//console.log(response);
						let result;
						
						try {
							result = JSON.parse(response.body);
						}
						catch (err) {
							result = {
								"success": false,
								"error": response.body
							};
						}
						
						
						let resultEmbed;
						
						if (result["success"]) {
							resultEmbed = {
								color: 0x0147ab,
								fields: [
									{
										name: 'A match lobby has been automatically created in-game.',
										value: 'The lobby will be destroyed in 15 minutes if a player has not joined in this time.\n*If a player joins the lobby, the lobby will be destroyed 1 minute after the last player leaves.*'
									}
								]
							};
						}
						else {
							if (result["error"] === "You have reached the limit of 5 lobbies") {
								resultEmbed = {
									color: 0xffcd01,
									fields: [
										{
											name: 'Lobby limit reached.',
											value: 'Please create the lobby manually.'
										}
									]
								};
							}
							else {
								let currTime = new Date(); //UTC
								currTime.setHours(currTime.getHours() + 10); //AEST
								currTime = currTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ
								console.log(`${currTime} AEST: ${result["error"]}`);
								resultEmbed = {
									color: 0xffcd01,
									fields: [
										{
											name: 'An internal error occurred when creating the in-game lobby.',
											value: 'Please create the lobby manually.'
										}
									]
								};
							}
						}
						await cmdChannels.updatesCh.send({ embeds: [resultEmbed] });
					}
				}
			});
		})
		.catch(err => console.error(err));
			
        // Initial DMs to both captains
        const captainA = await bot.users.fetch(this.captainsObject[0].discordId);
        const captainB = await bot.users.fetch(this.captainsObject[1].discordId);
        this.captainsClient = {
            teamA: captainA,
            teamB: captainB
        };

        this.nextDraft();
    }
	
	formatDraftOrderStr(team) {
		let do_str = "";
		for (const [dnum,d] of Object.entries(this.draftOrder)) {
			let emoji_str = "";
			if (team === d) {
				emoji_str += ":green_circle:";
			}
			else {
				emoji_str += ":red_circle:";
			}
			
			if (dnum == this.draftNumber) {
				emoji_str = `>> ${emoji_str} <<`;
			}
			emoji_str += " ";
			do_str += emoji_str;
		}
		return do_str;
	}
	
	async nextDraft(draftedPlayer = null) {
        if (this.draftNumber < ( this.draftConfig.numPlayers - 1 )) {
            this.currentCaptain = this.draftOrder[this.draftNumber];
            this.otherCaptain = this.currentCaptain === 'teamA' ? 'teamB' : 'teamA';
            const currentCaptainClient = this.captainsClient[this.currentCaptain];
            const otherCaptainClient = this.captainsClient[this.otherCaptain];
 
            //switch (this.draftNumber) {
			if (this.draftNumber == 1) {
				//case 1:
				let embedFilesList = [];
				const embedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
				embedFilesList.push(embedAuthThumb);

				let embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftTrue.png', {name: 'turnToDraftTrue.png'}); //from: created on MS Word
				embedFilesList.push(embedThumb);
				
				let init1Cdesc = 'The other captain is:'
				init1Cdesc += '```' + this[this.otherCaptain][0].username + ' (' + this[this.otherCaptain][0][`${this.mode}`+'Rating'] + ')' + '```' + '\n\u200b';
				//init1Cdesc += '*The drafting order will be 1-2-1. After your draft, the other captain will draft twice.*\n\u200b' ;
				init1Cdesc += `*Draft order:* ${this.formatDraftOrderStr(this.currentCaptain)}`;
				
				let init1CUDplayer = '';
					
				for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
					init1CUDplayer += '```';
					init1CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
					init1CUDplayer += '```';
				}
				
				let init1CEmbed = {
					color: 0x6ef55f,
					author: {
						name: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Match found!`,
						icon_url: 'attachment://' + embedAuthThumb.name
					},
					title: 'You are a captain!',
					description: init1Cdesc,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
					fields: [
						{
							name: 'Team A',
							value: '```' + '(C) ' + `${this.captainsObject[0].username} (` + this.captainsObject[0][`${this.mode}`+'Rating'] + ')' + '```',
							inline: true
						},
						{
							name: 'Team B',
							value: '```' + '(C) ' + `${this.captainsObject[1].username} (` + this.captainsObject[1][`${this.mode}`+'Rating'] + ')' + '```',
							inline: true
						},
						{
							name: 'Undrafted Players',
							value: init1CUDplayer
						},
						{
							name: `:green_square: Remember to check in for the match!`,
							value: `Channel link: ${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkinTimer}:R>*\n\u200b`
						},
						{
							name: 'You start the draft.',
							value: 'Please type **!d  <number>** to draft the corresponding player to your team or type **!rd** to draft a randomly-selected player to your team.'
						}
					]
				};
				
				await currentCaptainClient.send({ files: embedFilesList, embeds: [init1CEmbed]}).catch(console.error);
				
				
				embedFilesList = [];
				embedFilesList.push(embedAuthThumb);
				
				embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftFalse.png', {name: 'turnToDraftFalse.png'}); //from: created on MS Word
				embedFilesList.push(embedThumb);
				
				let init2Cdesc = 'The other captain is:'
				init2Cdesc += '```' + this[this.currentCaptain][0].username + ' (' + this[this.currentCaptain][0][`${this.mode}`+'Rating'] + ')' + '```' + '\n\u200b';
				//init2Cdesc += '*The drafting order will be 1-2-1. After the other captain drafts, you will draft twice.*\n\u200b' ;
				init2Cdesc += `*Draft order:* ${this.formatDraftOrderStr(this.otherCaptain)}`;
				
				let init2CUDplayer = '';
				for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
					init2CUDplayer += '```';
					init2CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
					init2CUDplayer += '```';
				}
				
				let init2CEmbed = {
					color: 0xed0505,
					author: {
						name: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Match found!`,
						icon_url: 'attachment://' + embedAuthThumb.name
					},
					title: 'You are a captain!',
					description: init2Cdesc,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
					fields: [
						{
							name: 'Team A',
							value: '```' + '(C) ' + `${this.captainsObject[0].username} (` + this.captainsObject[0][`${this.mode}`+'Rating'] + ')' + '```',
							inline: true
						},
						{
							name: 'Team B',
							value: '```' + '(C) ' + `${this.captainsObject[1].username} (` + this.captainsObject[1][`${this.mode}`+'Rating'] + ')' + '```',
							inline: true
						},
						{
							name: 'Undrafted Players',
							value: init2CUDplayer
						},
						{
							name: `:green_square: Remember to check in for the match!`,
							value: `Channel link: ${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkinTimer}:R>*\n`
						},
						{
							name: '\u200b',
							value: '*Waiting for the other captain to draft...*'
						}
					]
				};
				
				await otherCaptainClient.send({ files: embedFilesList, embeds: [init2CEmbed]}).catch(console.error);
				//break;
			}
			else if ((this.draftNumber != 1) && (this.draftNumber != Object.keys(this.draftOrder).length)) {
				//case 2:
				let embedFilesList = [];
				let embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftTrue.png', {name: 'turnToDraftTrue.png'}); //from: created on MS Word
				embedFilesList.push(embedThumb);

				let teamAVal = '';
				
				this.teamA.forEach((playerObj) => {
					teamAVal += '```';
					teamAVal += `${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
					teamAVal += '```';
				});
				
				let teamBVal = '';
				
				this.teamB.forEach((playerObj) => {
					teamBVal += '```';
					teamBVal += `${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
					teamBVal += '```';
				});

				let init1CUDplayer = '';
				
				for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
					init1CUDplayer += '```';
					init1CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
					init1CUDplayer += '```';
				}
				
				let draft2Embed = {
					color: 0x6ef55f,
					author: {
						name: `${this[this.otherCaptain][0].username} has drafted ${draftedPlayer.username}.`,
						icon_url: otherCaptainClient.displayAvatarURL()
					},
					description: '```' + `Mode: ${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}` + '```' + '\n\u200b' + `*Draft order:* ${this.formatDraftOrderStr(this.currentCaptain)}`,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
					fields: [
						{
							name: 'Team A',
							value: teamAVal,
							inline: true
						},
						{
							name: 'Team B',
							value: teamBVal,
							inline: true
						},
						{
							name: 'Undrafted Players',
							value: init1CUDplayer + '\u200b'
						},
						{
							name: 'Your turn to draft.',
							value: 'Please type **!d  <number>** to draft the corresponding player to your team or type **!rd** to draft a randomly-selected player to your team.'
						}
					]
				};
				
				await currentCaptainClient.send({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
				
				embedFilesList = [];
				embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftFalse.png', {name: 'turnToDraftFalse.png'}); //from: created on MS Word
				embedFilesList.push(embedThumb);
				
				draft2Embed.color = 0xed0505;
				draft2Embed.thumbnail = {
					url: 'attachment://' + embedThumb.name
				};
				draft2Embed.description = '```' + `Mode: ${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}` + '```' + '\n\u200b' + `*Draft order:* ${this.formatDraftOrderStr(this.otherCaptain)}`;
				draft2Embed.fields.pop();
				draft2Embed.fields[2].value = init1CUDplayer;
				draft2Embed.fields.push({
						name: '\u200b',
						value: '*Waiting for the other captain to draft...*'
				});
				
				await otherCaptainClient.send({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
				//break;
			}
			else {	//final draft
				await this.draftPlayer(Object.keys(this.remainingPlayers)[0]);
			}
        }
		else {
            const gamepass = makepw(3)
			this.gamepass = gamepass;
			
			let embedFilesList = [];
			const embedThumb = new Discord.AttachmentBuilder('./thumbnails/draftComplete.png', {name: 'draftComplete.png'}); //from: 
			embedFilesList.push(embedThumb);
			
			const embedThumb2 = new Discord.AttachmentBuilder('./thumbnails/casualArena.jpg', {name: 'casualArena.jpg'}); //from: 
			embedFilesList.push(embedThumb2);
			
			let teamAVal = '';
					
			this.teamA.forEach((playerObj) => {
				teamAVal += '```';
				teamAVal += `${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
				teamAVal += '```';
			});
			
			let teamBVal = '';
			
			this.teamB.forEach((playerObj) => {
				teamBVal += '```';
				teamBVal += `${playerObj.username} (` + playerObj[`${this.mode}`+'Rating'] + ')';
				teamBVal += '```';
			});
			
			let DCEmbed = {
				color: 0xf9fc47,
				author: {
					name: 'Drafting complete!',
					icon_url: 'attachment://' + embedThumb.name
				},
				thumbnail: {
					url: 'attachment://' + embedThumb2.name
				},
				fields: [
					{
						name: 'Mode',
						value: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}`,
						inline: true
					},
					{
						name: 'Game Password',
						value: `${gamepass}`,
						inline: true
					},
					{
						name: 'Arena',
						value: this.draftConfig.arenaName,
						inline: true
					},
					{
						name: 'Team A',
						value: teamAVal,
						inline: true
					},
					{
						name: 'Team B',
						value: teamBVal,
						inline: true
					},
					{
						name: '\u200b\n:white_check_mark: Check-in',
						value: `${cmdChannels.updatesCh}\n\u200b\nOne of the captains may create a competitive lobby with the password **${gamepass}** and **${this.draftConfig.arenaName}** arena.\nWhen the match is finished, please report the match result in <#` + cmdChannels[`${this.mode}`+'Ch'] + `> by typing **!mr** \u200b <**W** | **L** >.`,
					}
				]
			};
			
            logger.log('info', `Draft complete! Use password **${gamepass}**. Teams A: ${this.teamA.join(', ')} | Team B: ${this.teamB.join(', ')}.`);
			
			this.matchInProgress = true;
			
			await this.captainsClient.teamA.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
            await this.captainsClient.teamB.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
			for (const player of this.nonCaptains) {
                const playerClient = await bot.users.fetch(player.discordId);
                await playerClient.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
            }
			
			DCEmbed.fields.pop();
			DCEmbed.fields[1] = {
				name: '\u200b',
				value: '\u200b',
				inline: true
			};
            
			const draftCompleteButtons = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId('gamepass')
					.setLabel('Game Password')
					.setStyle(Discord.ButtonStyle.Secondary)
			);
			
			await cmdChannels.updatesCh.send({components: [draftCompleteButtons], files: embedFilesList, embeds: [DCEmbed]})
			.then(draftCompleteMsg => {
				const filter =  (interaction) => {
					if (!(interaction.isButton())) {
						interaction.reply({content: "How did you even do this?!", ephemeral: true});
						return false;
					}
					
					const playerDiscordIds = this.allPlayers.map(p => p.discordId);
					
					if ((playerDiscordIds.includes(interaction.user.id)) || (isMod(interaction.user.id))) {
						interaction.reply({content: `${this.gamepass}`, ephemeral: true});
						return true;
					}
					else {
						interaction.reply({content: "This button is not for you!", ephemeral: true});
						return false;
					}
				}
				const collector = draftCompleteMsg.createMessageComponentCollector({ filter: filter });
				this.draftCompleteCollector = collector;

				collector.on('collect', async i => {});
				
				collector.once('end', async (c,r) => {
					draftCompleteMsg.components[0].components[0].data.disabled = true;
					await draftCompleteMsg.edit({
						components: draftCompleteMsg.components
					});
				});
			});
        }
    }
	
	async draftPlayer(num) {
        for (const [currentIndex, player] of Object.entries(this.remainingPlayers)) {
            if (currentIndex === num) {
                delete this.remainingPlayers[currentIndex];
                this[this.currentCaptain].push(player);
                //const otherCaptainClient = this.captainsClient[this.otherCaptain];
                //await otherCaptainClient.send(`The other team has drafted: **${player.username}**`);
                logger.log('info', `${this[this.currentCaptain][0].username} has drafted ${player.username}`);
                this.draftNumber += 1;
                this.nextDraft(player);
                return true;
            }
        }
		return false;
    }
}

class ScrimsDraft {
    constructor(captains,teamA,teamB) {
		let index = 1;
		for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
			if (index === draft.index) {
				index+=1;
			}
		}
		this.index = index;
        ongoingDrafts.splice(index,0,this);
        this.mode = 'scrims';
        this.captainsObject = captains;
        this.teamA = teamA;
        this.teamB = teamB;
		this.allPlayers = [...teamA.playerList, ...teamB.playerList];
        this.matchInProgress = false;
        this.reportedScores = {};

        this.startCheckin();
		//if (checkinList) { this.checkinComplete(checkinList); }
    }
 
    async startCheckin() {
		
		const captainA = await bot.users.fetch(this.captainsObject[0].discordId);
        const captainB = await bot.users.fetch(this.captainsObject[1].discordId);
        this.captainsClient = {
            teamA: captainA,
            teamB: captainB
        };
		
		// embeds: Author: Match found, alert.png, Description: Captains are drafting. Captains are:, Field inline: Team A, capt0, Field inline, Team B, capt1
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
		embedFilesList.push(embedThumb);
		
		let initNCEmbed = {
			color: 0x000000,
			author: {
				name: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Match found!`,
				icon_url: 'attachment://' + embedThumb.name
			},
			description: 'Captains:',
			fields: [
				{
					name: 'Team A',
					value: '```' + `${this.captainsObject[0].username} (${this.captainsObject[0].OSLteam})` + '```',
					inline: true
				},
				{
					name: 'Team B',
					value: '```' + `${this.captainsObject[1].username} (${this.captainsObject[1].OSLteam})` + '```' + '\u200b',
					inline: true
				},
				{
					name: `Remember to check in for the match by reacting with :white_check_mark:!`,
					value: `Channel link: ${cmdChannels.updatesCh}` + `\n*If **three** players from each team have not checked in within ${cfg.checkinTime} minutes, the match will be automatically cancelled.*`
				}
			]
		};
		
        // Initial DM to other players
		for (const player of this.teamA.playerList) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [initNCEmbed]}).catch(async function (error) {
				if (error.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${player.discordID}>/${player.username} (${player.teamName} - ${player.league})`,null,false);
					await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
				}
				else {
					console.error;
				}
			});
		}
		for (const player of this.teamB.playerList) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [initNCEmbed]}).catch(async function (error) {
				if (error.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${player.discordID}>/${player.username} (${player.teamName} - ${player.league})`,null,false);
					await cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
				}
				else {
					console.error;
				}
			});
		}

		initNCEmbed.fields[2] = {
			name: 'Remember to check in for the match by reacting below! :white_check_mark:',
			value: `*If **three** players from each team have not checked in within ${cfg.checkinTime} minutes, the match will be automatically cancelled.*`
		}
		
		this.teamACheckedIn = [];
		this.teamBCheckedIn = [];
		
		await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [initNCEmbed]})
		.then( emMsg => {
			emMsg.react('✅');
			
			//let poppedQueue = [];
			//this.allPlayers.forEach((playerObj) => {
			//	poppedQueue.push(playerObj.discordId);
			//});
			
			const filter =  (reaction, user) => {
				if ((reaction.emoji.name === '✅') && ((this.teamA.playerList.map(x => x.discordID)).includes(user.id)) && !((this.teamACheckedIn.map(x => x.discordID)).includes(user.id))) {
					const queues = getQueues();
					if ((getDraftFromDiscordId(user.id) !== false) && (user.id !== this.captainsObject[0].discordId)) {
						const errObj = errorMsg('The following player cannot check in as they are in an unreported match.',`<@${user.id}>\nPlease finish the match and wait for both captains to report the score.`);
						cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else if (((queues.casual.map(player => player.discordId)).includes(user.id)) || ((queues.twos.map(player => player.discordId)).includes(user.id)) || ((queues.fours.map(player => player.discordId)).includes(user.id))) {
						const errObj = errorMsg('The following player cannot check in as they are in another queue.',`<@${user.id}>\nPlease leave the queue to check in.`);
						cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else {
						const checkinPlayer = this.teamA.playerList.filter(x => x.discordID === user.id)[0]
						this.teamACheckedIn.push(checkinPlayer);
					}
				}
				else if ((reaction.emoji.name === '✅') && ((this.teamB.playerList.map(x => x.discordID)).includes(user.id)) && !((this.teamBCheckedIn.map(x => x.discordID)).includes(user.id))) {
					const queues = getQueues();
					if ((getDraftFromDiscordId(user.id) !== false) && (user.id !== this.captainsObject[1].discordId)) {
						const errObj = errorMsg('The following player cannot check in as they are in an unreported match.',`<@${user.id}>\nPlease finish the match and wait for both captains to report the score.`);
						cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else if (((queues.casual.map(player => player.discordId)).includes(user.id)) || ((queues.twos.map(player => player.discordId)).includes(user.id)) || ((queues.fours.map(player => player.discordId)).includes(user.id))) {
						const errObj = errorMsg('The following player cannot check in as they are in another queue.',`<@${user.id}>\nPlease leave the queue to check in.`);
						cmdChannels.scrimsCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else {
						const checkinPlayer = this.teamB.playerList.filter(x => x.discordID === user.id)[0]
						this.teamBCheckedIn.push(checkinPlayer);
					}
				}
				return ((this.teamACheckedIn.length >= 3) && (this.teamBCheckedIn.length >= 3));
			}
			
			//const filter =  (reaction, user) => {return true;}
			
			const collector = emMsg.createReactionCollector({ filter: filter, maxUsers: 1, time: cfg.checkinTime * 60 * 1000 }); // 5 min
			this.checkinCollector = collector;
				
			collector.on('collect', () => {});
			
			var thisClass = this;
			
			collector.on('end', async function(collected,reason) {
				if (reason === 'time') {	//limit, time, userLimit
					//collected.forEach( reaction => {
					//	reaction.users.cache.forEach( user => {
					//		poppedQueue = poppedQueue.filter(id => id !== user.id);
					//	});
					//});
					
					let missedQueue = [];
					//let missedTeam = '';
					
					//for (const id of poppedQueue) {
					//	missedPlayer = await getPlayerFromDiscordIdQuery(id);
					//	missedQueue.push(missedPlayer);
					//}
					
					if (thisClass.teamACheckedIn.length < 3) { missedQueue.push(thisClass.teamA); }
					if (thisClass.teamBCheckedIn.length < 3) { missedQueue.push(thisClass.teamB); }

					let teamList = '';

					//console.log(missedQueue);
					//console.log(missedQueue[0]);
					missedQueue.forEach((team) => {
						teamList += '```';
						teamList += `${team.teamID} ${team.teamName} - ${team.teamLeague}`;
						teamList += '```';
					});
					
					let ACEmbed = {
						color: 0xd7fc03,
						fields: [
							{
								name: 'The match below was automatically cancelled.',
								value: 'The following teams did not check in:' + teamList
							}
						]
					};

					//const cancelDraftIdx = (await getDraftFromDiscordId(poppedQueue[0])).index;
					//getDraftFromIndex(userDraftIndex)
					/*
					cmdChannels.modCh.send({embeds: ACEmbed}).catch(console.error);
					await removeDraft(thisClass.index,{
						cancelCalled: true,
						adminAuthor: bot.user,
					});
					*/
					const cancelDraftIdx = (await getDraftFromDiscordId(thisClass.captainsObject[0].discordId)).index;

					if (cancelDraftIdx) {
						cmdChannels.modCh.send({embeds: [ACEmbed]}).catch(console.error);

						await removeDraft(cancelDraftIdx,{
							cancelCalled: true,
							adminAuthor: bot.user
						});
					}
					
					//return false;
				}
				else if (reason === 'userLimit') {
					//check if match hasn't already been cancelled
					const draftExists = (await getDraftFromDiscordId(thisClass.captainsObject[0].discordId)).index;
					if (draftExists) {
						let ACEmbed = {
							color: 0x6ef55f,
							fields: [
								{
									name: 'Both teams have checked in for the match. :white_check_mark:',
									value: '*The match will not be automatically cancelled.*'
								}
							]
						};
						
						cmdChannels.updatesCh.send({ embeds: [ACEmbed] });
						/*
						return {
							teamAjoined: teamACheckedIn,
							teamBjoined: teamBCheckedIn
						};
						*/
						thisClass.checkinComplete();
					}
				}
			});
		})
		.catch(err => console.error(err));
	}
	
	async checkinComplete() {
		const gamepass = makepw(3)
		this.gamepass = gamepass;
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/draftComplete.png', {name: 'draftComplete.png'}); //from: 
		embedFilesList.push(embedThumb);
		
		const embedThumb2 = new Discord.AttachmentBuilder('./thumbnails/twosArena.jpg', {name: 'twosArena.jpg'}); //from: my own
		embedFilesList.push(embedThumb2);
		
		let teamAVal = '';
		teamAVal += '```';
		teamAVal += `${this.teamA.teamName}`;
		teamAVal += '```';
		
		let teamBVal = '';
		teamBVal += '```';
		teamBVal += `${this.teamB.teamName}`;
		teamBVal += '```';
		
		let DCEmbed = {
			color: 0xf9fc47,
			author: {
				name: 'Drafting complete!',
				icon_url: 'attachment://' + embedThumb.name
			},
			thumbnail: {
				url: 'attachment://' + embedThumb2.name
			},
			fields: [
				{
					name: 'Mode',
					value: `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}`,
					inline: true
				},
				{
					name: 'Game Password',
					value: `${gamepass}`,
					inline: true
				},
				{
					name: 'Arena',
					value: 'Slap Stadium',
					inline: true
				},
				{
					name: 'Team A',
					value: teamAVal,
					inline: true
				},
				{
					name: 'Team B',
					value: teamBVal,
					inline: true
				},
				{
					name: '\u200b\n:white_check_mark: Check-in',
					value: `${cmdChannels.updatesCh}\n\u200b\nOne of the captains may create a competitive lobby with the password **${gamepass}** and **Slap Stadium** arena.\nWhen the match is finished, please report the match result in ${cmdChannels.scrimsCh} by typing **!mr** \u200b <**W** | **L** >.`,
				}
			]
		};
		
		logger.log('info', `Draft complete! Use password **${gamepass}**. Teams A: ${this.teamA.teamName} | Team B: ${this.teamB.teamName}.`);
		
		this.matchInProgress = true;
		
		for (const player of this.teamACheckedIn) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [DCEmbed]});
		}
		for (const player of this.teamBCheckedIn) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [DCEmbed]});
		}
		
		DCEmbed.fields.pop();
		DCEmbed.fields[1] = {
			name: '\u200b',
			value: '\u200b',
			inline: true
		};
		await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
		
		const lobbySettings = {
			"region": "oce-east",
			"name": `RPUGs Match ${this.index} - ${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} - ${this.captainsObject[0].playerID},${this.captainsObject[1].playerID}`,
			"password": `${this.gamepass}`,
			"creator_name": "SlapBot",
			"is_periods": true
		};
		
		const response = await createLobby(lobbySettings);
		//console.log(response);
		let result;
		
		try {
			result = JSON.parse(response.body);
		}
		catch (err) {
			result = {
				"success": false,
				"error": response.body
			};
		}
		
		
		let resultEmbed;
		
		if (result["success"]) {
			resultEmbed = {
				color: 0x0147ab,
				fields: [
					{
						name: 'A match lobby has been automatically created in-game.',
						value: 'The lobby will be destroyed in 15 minutes if a player has not joined in this time.\n*If a player joins the lobby, the lobby will be destroyed 1 minute after the last player leaves.*'
					}
				]
			};
		}
		else {
			if (result["error"] === "You have reached the limit of 5 lobbies") {
				resultEmbed = {
					color: 0xffcd01,
					fields: [
						{
							name: 'Lobby limit reached.',
							value: 'Please create the lobby manually.'
						}
					]
				};
			}
			else {
				let currTime = new Date(); //UTC
				currTime.setHours(currTime.getHours() + 10); //AEST
				currTime = currTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ
				console.log(`${currTime} AEST: ${result["error"]}`);
				resultEmbed = {
					color: 0xffcd01,
					fields: [
						{
							name: 'An internal error occurred when creating the in-game lobby.',
							value: 'Please create the lobby manually.'
						}
					]
				};
			}
		}
		cmdChannels.updatesCh.send({ embeds: [resultEmbed] });
	}
}

function getOngoingDrafts() {
    return ongoingDrafts;
}
 
async function removeDraft(userDraftIndex,cancelObj) {
    for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
        if (draft.index === Number(userDraftIndex)) {
			draft.checkinCollector.stop();
			if (draft.mode !== 'scrims') {
				draft.draftCompleteCollector.stop();
			}
			if (cancelObj.cancelCalled) {
	
				//draft.checkinCollector.stop();
				
				let embedFilesList = [];
				const embedThumb = new Discord.AttachmentBuilder('./thumbnails/cancel.png', {name: 'cancel.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
				embedFilesList.push(embedThumb);
				
				let cancelDMEmbed = {
					color: 0x000000,
					author: {
						name: `Your match was cancelled.`,	
						icon_url: 'attachment://' + embedThumb.name
					}
				}
				
				// DM all players to notify of cancellation of match]
				//const cancelDMMessage = `Your match was cancelled.`;
				if (draft.mode == 'scrims') {
					await draft.captainsClient.teamA.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
					await draft.captainsClient.teamB.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
					for (const player of draft.teamACheckedIn) {
						if (player.discordID !== draft.captainsObject[0].discordId) {
							const playerClient = await bot.users.fetch(player.discordID);
							await playerClient.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
						}
					}
					for (const player of draft.teamBCheckedIn) {
						if (player.discordID !== draft.captainsObject[1].discordId) {
							const playerClient = await bot.users.fetch(player.discordID);
							await playerClient.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
						}
					}
				}
				else {
					for (const player of draft.allPlayers) {
						const playerClient = await bot.users.fetch(player.discordId);
						await playerClient.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
					}
				}
				
				let cancelCHEmbed = {
					color: 0x000000,
					author: {
						name: `Match ${userDraftIndex} was cancelled.`,	
						icon_url: 'attachment://' + embedThumb.name
					}
				}

				await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [cancelCHEmbed]}).catch(console.error);
				
				let cancelModEmbed = {
					color: 0x000000,
					title: `Match ${userDraftIndex} was cancelled.`,
					thumbnail: {
						url: 'attachment://' + embedThumb.name
					},
					fields: [],
					footer: {
						text: `Cancelled by Admin ${cancelObj.adminAuthor.id} ${cancelObj.adminAuthor.username}.`,
						icon_url: cancelObj.adminAuthor.displayAvatarURL(),
					}
				};
					
				let matchFieldVal = '';
				matchFieldVal += '```';
				matchFieldVal += `Mode: ${draft.mode.charAt(0).toUpperCase()+draft.mode.slice(1)}\n`;
				if (draft.gamepass) {matchFieldVal += `Gamepass: ${draft.gamepass}\n`;}
				matchFieldVal += `In Progress: ${draft.matchInProgress}\n`;
				if (draft.mode === 'twos') {
					matchFieldVal += `Draft Order: ${draft.draftOrder['1']} --> ${draft.draftOrder['2']}\n`;
				}
				else if (draft.mode === 'casual') {
					matchFieldVal += `Draft Order: ${draft.draftOrder['1']} --> ${draft.draftOrder['2']} --> ${draft.draftOrder['3']} --> ${draft.draftOrder['4']}\n`;
				}
				else if (draft.mode === 'fours') {
					matchFieldVal += `Draft Order: ${draft.draftOrder['1']} --> ${draft.draftOrder['2']} --> ${draft.draftOrder['3']} --> ${draft.draftOrder['4']} --> ${draft.draftOrder['5']} --> ${draft.draftOrder['6']}\n`;
				}
				if (draft.mode === 'scrims') {
					matchFieldVal += `Captains: ${draft.captainsObject[0].username} (${draft.captainsObject[0].OSLteam}) [A] | ${draft.captainsObject[1].username} (${draft.captainsObject[1].OSLteam}) [B]\n`;
				}
				else {
					matchFieldVal += `Captains: ${draft.captainsObject[0].username} (` + draft.captainsObject[0][`${draft.mode}`+'Rating'] + `) [A] | ${draft.captainsObject[1].username} (` + draft.captainsObject[1][`${draft.mode}`+'Rating'] + `) [B]\n`;
				}
				matchFieldVal += '```';
				
				cancelModEmbed.fields.push({
					name: `Match ${draft.index}`,
					value: matchFieldVal
				});
				
				if (draft.matchInProgress) {
					if (draft.mode === 'scrims') {
						let teamAVal = '';
						teamAVal += '```';
						teamAVal += `${draft.teamA.teamName}`;
						teamAVal += '```';
						
						let teamBVal = '';
						teamBVal += '```';
						teamBVal += `${draft.teamB.teamName}`;
						teamBVal += '```';
						
						cancelModEmbed.fields.push({
							name: `Team A`,
							value: teamAVal,
							inline: true
						});
						cancelModEmbed.fields.push({
							name: `Team B`,
							value: teamBVal,
							inline: true
						});
					}
					else {
						let teamAVal = '';
						
						draft.teamA.forEach((playerObj) => {
							teamAVal += '```';
							teamAVal += `${playerObj.username} (` + playerObj[`${draft.mode}`+'Rating'] + ')';
							teamAVal += '```';
						});
						
						let teamBVal = '';
						
						draft.teamB.forEach((playerObj) => {
							teamBVal += '```';
							teamBVal += `${playerObj.username} (` + playerObj[`${draft.mode}`+'Rating'] + ')';
							teamBVal += '```';
						});
						
						cancelModEmbed.fields.push({
							name: `Team A`,
							value: teamAVal,
							inline: true
						});
						cancelModEmbed.fields.push({
							name: `Team B`,
							value: teamBVal,
							inline: true
						});
					}
					
					if (Object.keys(draft.reportedScores).length > 0) {
						let score = '';
						score += '```';
						
						if (Object.keys(draft.reportedScores)[0].toString() === Object.values(draft.reportedScores)[0]) {
							score += `${Object.keys(draft.reportedScores)[0]} - W\n`;
						}
						else {
							score += `${Object.keys(draft.reportedScores)[0]} - L\n`;
						}
						
						score += '```';
							
						cancelModEmbed.fields.push({
							name: `Score Reported:`,
							value: score,
						});
					}
				}
				else {
					if (draft.mode === 'scrims') {
						let teamAVal = '';
						teamAVal += '```';
						teamAVal += `${draft.teamA.teamName}`;
						teamAVal += '```';
						
						let teamBVal = '';
						teamBVal += '```';
						teamBVal += `${draft.teamB.teamName}`;
						teamBVal += '```';
						
						cancelModEmbed.fields.push({
							name: `Team A`,
							value: teamAVal,
							inline: true
						});
						cancelModEmbed.fields.push({
							name: `Team B`,
							value: teamBVal,
							inline: true
						});
					}
					else {
						let playerList = '';

						draft.nonCaptains.forEach((playerObj) => {
							playerList += '```';
							playerList += `${playerObj.username} (` + playerObj[`${draft.mode}`+'Rating'] + ')';
							playerList += '```';
						});
						
						cancelModEmbed.fields.push({
							name: `Other Players:`,
							value: playerList,
						});
					}
				}
				
				//const cancelModMessage = `Match ${userDraftIndex} was cancelled by Admin ${cancelObj.adminAuthor.id	} ${cancelObj.adminAuthor.username}.`;
				await cmdChannels.modCh.send({ files: embedFilesList, embeds: [cancelModEmbed]}).catch(console.error);
			}
            ongoingDrafts.splice(arrayIndex, 1);
            return true;
        }
    }
    return false;
}
 
function isCaptain(discordId) {
    let captain = false;
    for (const draft of ongoingDrafts) {
        if (
            discordId === draft.captainsObject[0].discordId ||
            discordId === draft.captainsObject[1].discordId
        ) {
            captain = true;
        }
    }
    return captain;
}
 
function isCurrentCaptain(discordId) {
    let captain = false;
    for (const draft of ongoingDrafts) {
		if (draft.mode !== 'scrims') {
			try {
				if (discordId === draft.captainsClient[draft.currentCaptain].id) {
					return true;
				}
			}
			catch(err) {
				return false;
			}
		}
    }
    return captain;
}
 
function getDraftFromDiscordId(discordId) {
    for (const draft of ongoingDrafts) {
		if (draft.mode === 'scrims') {
			for (const capt of draft.captainsObject) {
				if (discordId === capt.discordId) {
					return draft;
				}
			}
			for (const player of draft.teamACheckedIn) {
				if (discordId === player.discordID) {
					return draft
				}
			}
			for (const player of draft.teamBCheckedIn) {
				if (discordId === player.discordID) {
					return draft
				}
			}
		}
		else {
			for (const player of draft.allPlayers) {
				if (discordId === player.discordId) {
					return draft;
				}
			}
		}
    }
    return false;
}

function getDraftFromIndex(userDraftIndex) {
    for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
        if (draft.index === Number(userDraftIndex)) {
            return draft;
        }
    }
    return false;
}

function getDraftFromTeamName(teamName) {
	for (const draft of ongoingDrafts) {
		if (draft.mode === 'scrims') {
			if ((teamName === draft.captainsObject[0].OSLteam) || (teamName === draft.captainsObject[1].OSLteam)) {
				return draft;
			}
		}
	}
	
	return;
}


export {
    Draft,
	//TwosDraft,
	//FoursDraft,
	ScrimsDraft,
    getOngoingDrafts,
    isCaptain,
    isCurrentCaptain,
    getDraftFromDiscordId,
	getDraftFromIndex,
	getDraftFromTeamName,
    //formatMessageEndofMatch,
    removeDraft
};