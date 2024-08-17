import { bot, logger, cmdChannels, queueController } from '../index.js';
import { floor, random } from 'mathjs';
import { padStringToWidth } from 'discord-button-width';
import stripUsername from '../utls/stripUsername.js';
import cfg from '../../config.js';
import Discord from 'discord.js'; 
import errorMsg from './errorMessage.js';
//import { getQueues } from '../scripts/matches.js';
import { createLobby, deleteLobby } from '../queries/slapshot.js';
import { isMod } from '../utls/isMod.js';
import isStreamer from '../utls/isStreamer.js';
import waitForIt from '../utls/waitForIt.js';
import notifyDev from '../utls/notifyDev.js';
//import sleep from '../utls/sleep.js';
import { getPlayerQuery } from '../queries/index.js';

const ongoingDrafts = [];

function getDraftConfig(mode) {
	for (const m of cfg.modes) {
		if (mode === m.modeName.toLowerCase()) {
			const modeDraft = m.draft;
			if (modeDraft) {
				let firstCaptain;
				switch (modeDraft.firstCaptain) {
					case 'r':
						firstCaptain = Math.floor(Math.random() * 2) ? 'teamB' : 'teamA';
						break;
					case 'l':
						firstCaptain = 'teamB';
						break;
					case 'h':
						firstCaptain = 'teamA';
						break;
				}
				
				switch (modeDraft.order) {
					case 'snake':
						m.draft.draftOrder = snakeDraft(m.numPlayers - 2, firstCaptain);
						break;
					default:
						m.draft.draftOrder = null;
				}
			}
			return m;
		}
	}
}

function snakeDraft(numDrafts,firstCap) {
	let draftOrder = {};
	for (let i = 1; i <= numDrafts; i++) {
		if (Math.floor(i/2)%2 === 0) {
			draftOrder[i] = firstCap;
		}
		else {
			draftOrder[i] = firstCap === 'teamA' ? 'teamB' : 'teamA';
		}
	}
	if (draftOrder.length === 0) {
		return null;
	}
	else {
		return draftOrder;
	}
}

/*
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
	else if (mode === 'solo') {
		return null;
	}
	else if (mode === 'scrims') {
		return null;
	}
	else if (mode === 'fullhouse') {
		if (Math.floor(Math.random() * 2)) {
			return {
				1: 'teamB',
				2: 'teamA',
				3: 'teamA',
				4: 'teamB',
				5: 'teamB',
				6: 'teamA',
				7: 'teamA',
				8: 'teamB',
				9: 'teamB',
				10: 'teamA'
			};
		} else {
			return {
				1: 'teamA',
				2: 'teamB',
				3: 'teamB',
				4: 'teamA',
				5: 'teamA',
				6: 'teamB',
				7: 'teamB',
				8: 'teamA',
				9: 'teamA',
				10: 'teamB'
			};
		}
	}
}
*/
function makepw(length) {
    let text = "";
    //var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let possible = "0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }
 
class Draft {
    constructor(options) {
		let index = 1;
		for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
			if (index === draft.index) {
				index+=1;
			}
		}
		this.index = index;
        ongoingDrafts.splice(index,0,this);
        this.mode = options.mode;
		this.matchInProgress = false;
		this.checkIn = {
			checkInState: {
				notCheckedIn: [],
				checkedIn: []
			}
		}
        this.reportedScores = {};
		this.handleGameLobbyCalled = false;
		
		this.draftConfig = getDraftConfig(this.mode);
		if (this.draftConfig.draft) {
			this.draftComplete = false;
			this.draftNumber = 1;
			this.draftOrder = this.draftConfig.draft.draftOrder;
			this.draftLength = Object.keys(this.draftOrder).length;
		}
		
		this.lobbyId = null;
		
		this.handleModeSpecificOptions(options);
		this.handleOptions(options);
		
        this.handleMatch();
    }
	
	handleModeSpecificOptions(opts) {}
	
	handleOptions(opts) {
		//for now, all matches have two captains
		this.captainsObject = opts.captains;
		
		//maybe a check for if there is drafting- not sure how exactly that's useful atm
		
		//check if teams are pre-defined and if not, define with each captain
		this.teamA = "teamA" in opts ? opts.teamA : [opts.captains[0]];	//https://stackoverflow.com/questions/1098040/checking-if-a-key-exists-in-a-javascript-object
		this.teamB = "teamB" in opts ? opts.teamB : [opts.captains[1]];
		
		if ("remainingPlayers" in opts) {
			//this.remainingPlayers = { '1': remainingPlayers[0], '2': remainingPlayers[1], '3': remainingPlayers[2], '4': remainingPlayers[3] };
			this.remainingPlayers = {};
			for (const [i,p] of opts.remainingPlayers.entries()) {
				this.remainingPlayers[`${i+1}`] = p;
			}
			this.nonCaptains = [...opts.remainingPlayers];
			
			this.allPlayers = [...this.teamA, ...this.teamB, ...opts.remainingPlayers];
		}
		else {
			//no this.nonCaptains object for now - not needed
			this.allPlayers = [...this.teamA, ...this.teamB];
		}
	}
	
	async handleMatch() {
		this.checkIn.checkInTimer = Math.floor((Date.now() + cfg.checkInTime * 60 * 1000) / 1000);
		
		const newMatchMsg = this.genNewMatchMsg();
		await this.handleCheckIn(newMatchMsg);	//calls msgTeamsReady() (once check-in, and if applicable, draft are complete)
		
		await this.pvtMsgNewMatchNoDraft(newMatchMsg);
		await this.getCaptainClients();
		
		if (this.draftOrder) {
			await this.handleDraft();	//calls msgTeamsReady() once draft+check-in are complete
		}
		/*
		else {
			await this.msgTeamsReady();	//no draft required, teams are therefore ready
		}
		*/
		/*
		let waited = 0;
		while ((!) && (await getDraftFromIndex(this.index))) {
			await sleep(500);
			waited++;
		}

		await this.handleGameLobby()
		*/
	}
	
	genNewMatchMsg() {
		// embeds: Author: Match found, alert.png, Description: Captains are drafting. Captains are:, Field inline: Team A, capt0, Field inline, Team B, capt1
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
		embedFilesList.push(embedThumb);
		
		const delim = "            ";
		const teamAstr = '```' + (`${this.captainsObject[0].username} (` + this.captainsObject[0].ratingStats[`${this.mode}`].rating + ')').padEnd(32) + '```';
		const teamBstr = '```' + (`${this.captainsObject[1].username} (` + this.captainsObject[1].ratingStats[`${this.mode}`].rating + ')').padEnd(32) + '```';
		
		const newMatchEmbed = {
			color: 0x000000,
			author: {
				name: `${this.draftConfig.modeName} Match found!`,
				icon_url: 'attachment://' + embedThumb.name
			},
			description: 'The captains are drafting.\nCaptains:',
			fields: [
				{
					name: 'Team A',
					value: teamAstr,
					inline: true
				},
				{
					name: 'Team B',
					value: teamBstr + '\u200b',
					inline: true
				},
				{
					name: ":green_square: Check in below :green_square:",
					value: `:warning: Cancelling <t:${this.checkIn.checkInTimer}:R>`	//https://hammertime.cyou/en-GB
				}
			]
		};
		
		return {
			embed: newMatchEmbed,
			files: embedFilesList
		};
	}
	
	async handleCheckIn(matchMsg) {
		const checkInComponents = this.genCheckInComponents();
		const componentCollectorSettings = this.getComponentCollectorSettings();
		
		this.checkIn.checkInMsg = await cmdChannels.updatesCh.send({ components: checkInComponents, files: matchMsg.files, embeds: [matchMsg.embed]})
		this.checkIn.checkInCollector = this.checkIn.checkInMsg.createMessageComponentCollector(componentCollectorSettings);
		this.checkIn.checkInMsgInteractionTimer = null;

		//collector.once('collect', (reaction,user) => {});
		try {
			this.checkIn.checkInCollector.on('collect', async i => {
				//await i.deferUpdate();
				//Reset check in message interaction timer
				if (this.checkIn.checkInMsgInteractionTimer) {
					clearTimeout(this.checkIn.checkInMsgInteractionTimer);
					this.checkIn.checkInMsgInteractionTimer = null;
				}

				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
					components: this.refreshCheckInComponents()
				});
				
				this.checkIn.checkInMsgInteractionTimer = setTimeout(async () => {
					this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
						components: this.refreshCheckInComponents(),
						embeds: [this.refreshCheckInMsg()]
					});
					this.checkIn.checkInMsg = await this.checkIn.checkInMsg.removeAttachments();	//needed because: https://github.com/Rapptz/discord.py/issues/5139
				}, 5000);
			});
		}
		catch (err) {
			console.log('Error in check-in collection listener');
			console.log(err);
		}
		
		this.checkIn.checkInCollector.once('end', async (collected,reason) => {
			//Clear interaction timer if it exists
			if (this.checkIn.checkInMsgInteractionTimer) {
				clearTimeout(this.checkIn.checkInMsgInteractionTimer);
			}
			
			const checkInMsgComponents = this.refreshCheckInComponents();
			const checkInMsgEmbed = this.refreshCheckInMsg();
			if (reason === 'time') {	//limit, time, userLimit
				checkInMsgEmbed.fields[checkInMsgEmbed.fields.length - 1] = {
					name: ":x: Check-in expired",
					value: "\u200b"
				};
				
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
					components: checkInMsgComponents,
					embeds: [checkInMsgEmbed]
				});
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.removeAttachments();	//needed because: https://github.com/Rapptz/discord.py/issues/5139
				
				const autoCancelEmbed = this.genCheckInCancelMsg();

				await cmdChannels.modCh.send({embeds: [autoCancelEmbed]}).catch(console.error);
				await removeDraft(this.index,{
					cancelCalled: true,
					adminAuthor: bot.user
				});
			}
			else if ((reason === 'userLimit') || (reason === 'limit')) {
				checkInMsgEmbed.fields[checkInMsgEmbed.fields.length - 1] = {
					//name: ":white_check_mark: Check-in complete",
					//value: "\u200b",
					name: "\u200b",
					value: ":white_check_mark: **Check-in complete**"
				};
				
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
					components: checkInMsgComponents,
					embeds: [checkInMsgEmbed]
				});
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.removeAttachments();	//needed because: https://github.com/Rapptz/discord.py/issues/5139
				
				if (getDraftFromIndex(this.index)) {
					if (this.draftOrder) {
						if ((this.draftComplete) && (!this.handleGameLobbyCalled)) {
							await this.handleGameLobby();
						}
					}
					else {
						await this.msgTeamsReady();
						await this.handleGameLobby();
					}
				}
			}
		});
	}
	
	genCheckInComponents() {
		//create buttons for each player
		let buttonRows = [];
		let buttonIds = [];
		let allPlayersAdded = false;
		for (let r = 0; r < 5; r++) {
			let row = new Discord.ActionRowBuilder();
			for (let c = 0; c < 5; c++) {
				const playerNum = 5*r+c;
				const currPlayerId = `${this.allPlayers[playerNum].playerId}`;
				const currPlayerDiscordId = `${this.allPlayers[playerNum].discordId}`;
				const baseButtonId = `${currPlayerId} ${currPlayerDiscordId}`;
				
				if (buttonIds.includes(baseButtonId)) {	//button Ids must be unique- need this for when testing and multiple of the same players can join a match
					const repeatedButtonId = `${baseButtonId} ${r},${c}`;
					this.checkIn.checkInState.notCheckedIn.push(repeatedButtonId);
					row.addComponents(
						new Discord.ButtonBuilder()
							//.setCustomId(`${playerUsernames[0]}`)
							.setCustomId(repeatedButtonId)
							.setLabel(`${this.allPlayers[playerNum].username}`)
							.setStyle(Discord.ButtonStyle.Success)
					)
					//buttonIds.push(repeatedButtonId); //don't need to push this- it should always be unique because of r and c
				}
				else {
					this.checkIn.checkInState.notCheckedIn.push(baseButtonId);
					row.addComponents(
						new Discord.ButtonBuilder()
							.setCustomId(`${currPlayerId} ${currPlayerDiscordId}`)
							.setLabel(`${this.allPlayers[playerNum].username}`)
							.setStyle(Discord.ButtonStyle.Success)
					)
					buttonIds.push(baseButtonId);
				}

				if (5*r+c+1 === this.draftConfig.numPlayers) {
					allPlayersAdded = true;
					break;
				}
			}
			buttonRows.push(row);
			
			if (allPlayersAdded) {
				break;
			}
		}
		
		return buttonRows;
	}
	
	getComponentCollectorSettings() {
		//const filter =  (reaction, user) => reaction.emoji.name === '✅' && poppedQueue.includes(user.id);
		const checkInFilter =  async (interaction) => {
			await interaction.deferReply({ephemeral: true});
			if (!(interaction.isButton())) {
				await interaction.followUp({content: "How did you even do this?!", ephemeral: true});
				return false;
			}

			const buttonCustomId = interaction.customId.split(" ");
			
			if (buttonCustomId[1] === interaction.user.id) {
				await interaction.followUp({content: "You have checked in!", ephemeral: true});
				
				const checkInPlayerIdx = this.checkIn.checkInState.notCheckedIn.findIndex(c => c.split(" ")[1] === interaction.user.id);
				this.checkIn.checkInState.notCheckedIn.splice(checkInPlayerIdx, 1);
				this.checkIn.checkInState.checkedIn.push(interaction.customId);
				//poppedQueue = poppedQueue.filter(id => id !== i.user.id);	//this fails for testing where the same person can join multiple times
				return true;
			}
			else {
				await interaction.followUp({content: "This button is not for you!", ephemeral: true});
				return false;
			}
		}
		
		if (queueController.isInQueueCheckEnabled()) {
			return {
				filter: checkInFilter,
				maxUsers: this.draftConfig.numPlayers,
				time: cfg.checkInTime * 60 * 1000
			}
		}
		else {
			return {
				filter: checkInFilter,
				//maxUsers: this.draftConfig.numPlayers,
				max: this.draftConfig.numPlayers,
				time: cfg.checkInTime * 60 * 1000
			}
		}
	}
	
	refreshCheckInMsg() {
		const checkInMsgEmbed = this.checkIn.checkInMsg.embeds[0];
		
		if (this.checkIn.checkInState.checkedIn.length > 0) {
			const checkedInEmbedObj = {
				name: 'Checked in:',
				value: this.checkIn.checkInState.checkedIn.map(d => `<@${d.split(' ')[1]}>`).join(',')
			};
			if (checkInMsgEmbed.fields[2].name !== 'Checked in:') {	//too much hard-coding here.. could possibly improve in future
				checkInMsgEmbed.fields.splice(2, 0, checkedInEmbedObj);
			}
			else {
				checkInMsgEmbed.fields[2] = checkedInEmbedObj;
			}
		}
		
		/*
		this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
			embeds: [checkInMsgEmbed]
		});
		*/
		return checkInMsgEmbed;
	}
	
	refreshCheckInComponents() {
		const checkInMsgComponents = this.checkIn.checkInMsg.components;
		for (const r of checkInMsgComponents) {
			for (const b of r.components) {
				//const playerDiscordId = b.data.custom_id.split(' ')[1];
				if (!this.checkIn.checkInState.notCheckedIn.includes(b.data.custom_id)) {	//only checking players who haven't checked in- safer than checking checked in list
					b.data.disabled = true;
				}
			}
		}
		
		/*
		this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
			components: this.checkIn.checkInMsg.components
		});
		*/
		
		return checkInMsgComponents;
	}
	
	genCheckInCancelMsg() {
		let playerList = '';
		for (const p of this.allPlayers) {
			if (this.checkIn.checkInState.notCheckedIn.map(c => c.split(' ')[1]).includes(p.discordId)) {
				playerList += `\n`+ '`' + `» ${p.playerId} ${p.username} ` + '`' + `(<@${p.discordId}>)`;
			}
		}
		
		return {
			color: 0xd7fc03,
			fields: [
				{
					name: 'The match below was automatically cancelled.',
					value: 'The following players did not check in:' + playerList
				}
			]
		};
	}
	
	async pvtMsgNewMatchNoDraft(matchMsg) {
		
		matchMsg.embed.fields[2] = {
			name: `:green_square: Remember to check in for the match!`,
			value: `${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkIn.checkInTimer}:R>*`	//https://hammertime.cyou/en-GB
		};
		
        // Initial DM to other players
		if (this.draftOrder) {
			for (const player of this.nonCaptains) {
				try {
					const playerClient = await bot.users.fetch(player.discordId);
					await playerClient.send({ files: matchMsg.files, embeds: [matchMsg.embed]});
				}
				catch (e) {
					if (e.code === 50007) {
						const errObj = errorMsg('Unable to message the following user:',`<@${player.discordId}>/${player.username}`,null,false);
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else {
						throw e;
					}
				}
			}
		}
		else {
			for (const player of this.allPlayers) {
				try {
					const playerClient = await bot.users.fetch(player.discordId);
					await playerClient.send({ files: matchMsg.files, embeds: [matchMsg.embed]});
				}
				catch (e) {
					if (e.code === 50007) {
						const errObj = errorMsg('Unable to message the following user:',`<@${player.discordId}>/${player.username}`,null,false);
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
					}
					else {
						throw e;
					}
				}
			}	
		}
	}

	async getCaptainClients() {
        const captainA = await bot.users.fetch(this.captainsObject[0].discordId);
        const captainB = await bot.users.fetch(this.captainsObject[1].discordId);
        this.captainsClient = {
            teamA: captainA,
            teamB: captainB
        };
	}

	//drafting functions
	async handleDraft() {
        await this.nextDraft();
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
		this.currentCaptain = this.draftOrder[this.draftNumber];
		this.otherCaptain = this.currentCaptain === 'teamA' ? 'teamB' : 'teamA';
		const currentCaptainClient = this.captainsClient[this.currentCaptain];
		const otherCaptainClient = this.captainsClient[this.otherCaptain];
		
		
		if (this.checkIfSameCaptForRemainingDrafts()) {
			this.autoDrafting = true;
			await this.autoDraft();
			return;
		}
		
		//switch (this.draftNumber) {
		if (this.draftNumber === 1) {
			//case 1:
			let embedFilesList = [];
			const embedAuthThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
			embedFilesList.push(embedAuthThumb);

			let embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftTrue.png', {name: 'turnToDraftTrue.png'}); //from: created on MS Word
			embedFilesList.push(embedThumb);
			
			let init1Cdesc = 'The other captain is:'
			init1Cdesc += '```' + this[this.otherCaptain][0].username + ' (' + this[this.otherCaptain][0].ratingStats[`${this.mode}`].rating + ')' + '```' + '\n\u200b';
			init1Cdesc += `*Draft order:* ${this.formatDraftOrderStr(this.currentCaptain)}`;
			/*
			let init1CUDplayer = '';
				
			for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
				init1CUDplayer += '```';
				init1CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
				init1CUDplayer += '```';
			}
			*/
			//create buttons for each draft player
			const rdButton = new Discord.ActionRowBuilder()
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!randomdraft`)
						.setLabel('Random Draft')
						.setStyle(Discord.ButtonStyle.Secondary)
				)
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!refreshdraft`)
						.setLabel('Refresh Draft')
						.setStyle(Discord.ButtonStyle.Secondary)
				);
			const rdButton_disabled = new Discord.ActionRowBuilder()
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!randomdraft`)
						.setLabel('Random Draft')
						.setStyle(Discord.ButtonStyle.Secondary)
						.setDisabled(true)
				)
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!refreshdraft`)
						.setLabel('Refresh Draft')
						.setStyle(Discord.ButtonStyle.Secondary)
						//.setDisabled(true)
				);
			let buttonRows = [ rdButton ];
			let disabled_buttons = [ rdButton_disabled ];
			let playerNum = 1;
			
			for (let r = 0; r < 5; r++) {
				let row = new Discord.ActionRowBuilder();
				let row_disabled = new Discord.ActionRowBuilder();
				for (let c = 0; c < 4; c++) {
					const currPlayer = this.remainingPlayers[`${playerNum.toString()}`];
					row.addComponents(
						new Discord.ButtonBuilder()
							.setCustomId(`${playerNum} ${currPlayer.playerId} ${currPlayer.discordId}`)
							.setLabel(`${playerNum}. ${currPlayer.username} (` + currPlayer.ratingStats[`${this.mode}`].rating + ')')
							.setStyle(Discord.ButtonStyle.Success)
					);
					row_disabled.addComponents(
						new Discord.ButtonBuilder()
							.setCustomId(`${playerNum} ${currPlayer.playerId} ${currPlayer.discordId}`)
							.setLabel(`${playerNum}. ${currPlayer.username} (` + currPlayer.ratingStats[`${this.mode}`].rating + ')')
							.setStyle(Discord.ButtonStyle.Success)
							.setDisabled(true)
					);
					playerNum += 1;
					if (playerNum > this.draftLength) {
						break;
					}
				}
				buttonRows.push(row);
				disabled_buttons.push(row_disabled)
				
				if (playerNum > this.draftLength) {
					break;
				}
			}
			/*
			for (const r of disabled_buttons) {
				if (r === 0) {
					continue;
				}
				for (const b of r.components) {
					//b.setStyle(Discord.ButtonStyle.Danger);
					b.data.disabled = true;
				}
			}
			*/
			let init1CEmbed = {
				color: 0x6ef55f,
				author: {
					name: `${this.draftConfig.modeName} Match found!`,
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
						value: '```' + '(C) ' + `${this.captainsObject[0].username} (` + this.captainsObject[0].ratingStats[`${this.mode}`].rating + ')' + '```',
						inline: true
					},
					{
						name: 'Team B',
						value: '```' + '(C) ' + `${this.captainsObject[1].username} (` + this.captainsObject[1].ratingStats[`${this.mode}`].rating + ')' + '```',
						inline: true
					},
					/*
					{
						name: 'Undrafted Players',
						value: init1CUDplayer
					},
					*/
					{
						name: `:green_square: Remember to check in for the match!`,
						value: `${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkIn.checkInTimer}:R>*\n\u200b`
					},
					{
						name: 'You start the draft.',
						//value: 'Please type **!d  <number>** to draft the corresponding player to your team or type **!rd** to draft a randomly-selected player to your team.'
						value: ':green_square: Use the buttons below, or type:\n**!d  <number>** - draft the corresponding player\n**!rd** - draft a random player'
					}
				]
			};
			
			let currDraftMsg;
			try {
				currDraftMsg = await currentCaptainClient.send({ components: buttonRows, files: embedFilesList, embeds: [init1CEmbed]});
			}
			catch (e) {
				if (e.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${currentCaptainClient.id}>/${currentCaptainClient.username}`,null,false);
					await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
				}
				else {
					throw e;
				}
			}
			
			embedFilesList = [];
			embedFilesList.push(embedAuthThumb);
			
			embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftFalse.png', {name: 'turnToDraftFalse.png'}); //from: created on MS Word
			embedFilesList.push(embedThumb);
			
			let init2Cdesc = 'The other captain is:'
			init2Cdesc += '```' + this[this.currentCaptain][0].username + ' (' + this[this.currentCaptain][0].ratingStats[`${this.mode}`].rating + ')' + '```' + '\n\u200b';
			//init2Cdesc += '*The drafting order will be 1-2-1. After the other captain drafts, you will draft twice.*\n\u200b' ;
			init2Cdesc += `*Draft order:* ${this.formatDraftOrderStr(this.otherCaptain)}`;
			
			/*
			let init2CUDplayer = '';
			for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
				init2CUDplayer += '```';
				init2CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
				init2CUDplayer += '```';
			}
			*/
			
			let init2CEmbed = {
				color: 0xed0505,
				author: {
					name: `${this.draftConfig.modeName} Match found!`,
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
						value: '```' + '(C) ' + `${this.captainsObject[0].username} (` + this.captainsObject[0].ratingStats[`${this.mode}`].rating + ')' + '```',
						inline: true
					},
					{
						name: 'Team B',
						value: '```' + '(C) ' + `${this.captainsObject[1].username} (` + this.captainsObject[1].ratingStats[`${this.mode}`].rating + ')' + '```',
						inline: true
					},
					/*
					{
						name: 'Undrafted Players',
						value: init2CUDplayer
					},
					*/
					{
						name: `:green_square: Remember to check in for the match!`,
						value: `${cmdChannels.updatesCh}` + `\n*Latest check-in time: <t:${this.checkIn.checkInTimer}:R>*\n`
					},
					{
						name: '\u200b',
						value: '*Waiting for the other captain to draft...*'
					}
				]
			};
			
			let otherDraftMsg;
			try {
				otherDraftMsg = await otherCaptainClient.send({ components: disabled_buttons, files: embedFilesList, embeds: [init2CEmbed]})
			}
			catch (e) {
				if (e.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${otherCaptainClient.id}>/${otherCaptainClient.username}`,null,false);
					await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
				}
				else {
					throw e;
				}
			}
			//break;
			
			const currCollector = currDraftMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button });
			const otherCollector = otherDraftMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button });
			//this.checkinCollector = collector;
			
			this.captainDraftMsgs = {
				embeds: {
					[`${this.currentCaptain}`]: currDraftMsg,
					[`${this.otherCaptain}`]: otherDraftMsg
				},
				buttons: {
					'progress_buttons': buttonRows,
					'disabled_buttons': disabled_buttons
				},
				collectors: {
					[`${this.currentCaptain}`]: currCollector,
					[`${this.otherCaptain}`]: otherCollector
				}
			};
			
			try {
				currCollector.on('collect', async i => {
					const buttonPressed = i.customId;
					
					if (buttonPressed === '!refreshdraft') {
						if (this.draftRefreshCooldownCurr) {
							await i.deferReply({ephemeral: true});
							await i.editReply({content: 'Draft refresh cooldown - please wait!', ephemeral: true});
							return;
						}
						this.draftRefreshCooldownCurr = true;
						setTimeout(() => {
							this.draftRefreshCooldownCurr = false;
						}, 4000);
						
						await i.deferUpdate();
						
						const firstCurrCap = this.draftOrder['1'];
						const draftProg = this.captainDraftMsgs.embeds[`${firstCurrCap}`];
						
						let refresh_buttons;
						if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
							refresh_buttons = this.captainDraftMsgs.buttons.disabled_buttons;
						}
						else {
							refresh_buttons = this.captainDraftMsgs.buttons.progress_buttons;
						}
						
						await i.message.edit({components: refresh_buttons, files: draftProg.attachments, embeds: draftProg.embeds});
						return;
					}
					
					//this should never happen, but just in case
					if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
						await i.deferReply({ephemeral: true});
						await i.editReply({content: "It is not your turn to draft!", ephemeral: true});
						return;
					}
					
					if (this.draftCooldown) {
						await i.deferReply({ephemeral: true});
						await i.editReply({content: "Draft cooldown - please wait!", ephemeral: true});
						return;
					}
					
					await i.deferUpdate();
					/*
					await i.message.edit({
						components: this.captainDraftMsgs.buttons.disabled_buttons
					});
					*/
					
					let playerNum;
					if (buttonPressed === '!randomdraft') {
						playerNum = Object.keys(this.remainingPlayers)[Math.floor(Math.random()*(Object.entries(this.remainingPlayers).length))];
					}
					else {
						playerNum = buttonPressed.split(" ")[0];
					}
					
					await this.draftPlayer(playerNum);
				});
			}
			catch (err) {
				console.log('Error in current captain drafting collection listener');
				console.log(err);
			}
			
			try {
				otherCollector.on('collect', async i => {
					const buttonPressed = i.customId;

					if (buttonPressed === '!refreshdraft') {
						if (this.draftRefreshCooldownOther) {
							await i.deferReply({ephemeral: true});
							await i.editReply({content: 'Draft refresh cooldown - please wait!', ephemeral: true});
							return;
						}
						this.draftRefreshCooldownOther = true;
						setTimeout(() => {
							this.draftRefreshCooldownOther = false;
						}, 4000);
						
						await i.deferUpdate();

						const firstOtherCap = this.draftOrder['1'] === 'teamA' ? 'teamB' : 'teamA';
						const draftProg = this.captainDraftMsgs.embeds[`${firstOtherCap}`];
						
						let refresh_buttons;
						if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
							refresh_buttons = this.captainDraftMsgs.buttons.disabled_buttons;
						}
						else {
							refresh_buttons = this.captainDraftMsgs.buttons.progress_buttons;
						}
						
						await i.message.edit({components: refresh_buttons, files: draftProg.attachments, embeds: draftProg.embeds});
						return;
					}
					
					//this should never happen, but just in case
					if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
						await i.deferReply({ephemeral: true});
						await i.editReply({content: "It is not your turn to draft!", ephemeral: true});
						return;
					}
					
					if (this.draftCooldown) {
						await i.deferReply({ephemeral: true});
						await i.editReply({content: "Draft cooldown - please wait!", ephemeral: true});
						return;
					}
					
					await i.deferUpdate();
					/*
					await i.message.edit({
						components: this.captainDraftMsgs.buttons.disabled_buttons
					});
					*/
					
					let playerNum;
					if (buttonPressed === '!randomdraft') {
						playerNum = Object.keys(this.remainingPlayers)[Math.floor(Math.random()*(Object.entries(this.remainingPlayers).length))];
					}
					else {
						playerNum = buttonPressed.split(" ")[0];
					}
					
					await this.draftPlayer(playerNum);
				});
			}
			catch (err) {
				console.log('Error in other captain drafting collection listener');
				console.log(err);
			}
			
			
			
			/*
			let runCaptainDraftCollector = async (coll,cap) => {
				coll.on('collect', async i => {
					const buttonPressed = i.customId;

					if (buttonPressed === '!refreshdraft') {
						await i.deferUpdate();
						
						let draftCap;
						if (cap === 1) {
							draftCap = this.draftOrder['1']
						}
						else if (cap === 2) {
							draftCap = this.draftOrder['1'] === 'teamA' ? 'teamB' : 'teamA';
						}
						
						const draftProg = this.captainDraftMsgs.embeds[`${draftCap}`];

						/*
						const firstOtherCap = this.draftOrder['1'] === 'teamA' ? 'teamB' : 'teamA';
						const draftProg = this.captainDraftMsgs.embeds[`${firstOtherCap}`];
						*/
						/*
						let refresh_buttons;
						if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
							refresh_buttons = this.captainDraftMsgs.buttons.disabled_buttons;
						}
						else {
							refresh_buttons = this.captainDraftMsgs.buttons.progress_buttons;
						}
						
						await i.message.edit({components: refresh_buttons, files: draftProg.attachments, embeds: draftProg.embeds});
						return;
					}
					
					//this should never happen, but just in case
					if (i.message.id === this.captainDraftMsgs.embeds[`${this.otherCaptain}`].id) {
						await i.deferReply({ephemeral: true});
						i.editReply({content: "It is not your turn to draft!", ephemeral: true});
						return;
					}
					
					if (this.draftCooldown) {
						await i.deferReply({ephemeral: true});
						i.editReply({content: "Draft cooldown - please wait!", ephemeral: true});
						return;
					}
					
					i.deferUpdate();
					*/
					/*
					await i.message.edit({
						components: this.captainDraftMsgs.buttons.disabled_buttons
					});
					*/
					/*
					let playerNum;
					if (buttonPressed === '!randomdraft') {
						playerNum = Object.keys(this.remainingPlayers)[Math.floor(Math.random()*(Object.entries(this.remainingPlayers).length))];
					}
					else {
						playerNum = buttonPressed.split(" ")[0];
					}
					
					await this.draftPlayer(playerNum);
				});
			}
			
			await runCaptainDraftCollector(currCollector,1);
			await runCaptainDraftCollector(otherCollector,2);
			*/
		}
		else if ((this.draftNumber !== 1) && (this.draftNumber < this.draftLength)) {
			//case 2:
			let embedFilesList = [];
			let embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftTrue.png', {name: 'turnToDraftTrue.png'}); //from: created on MS Word
			embedFilesList.push(embedThumb);

			let teamAVal = '';
			
			this.teamA.forEach((playerObj) => {
				teamAVal += '```';
				teamAVal += `${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
				teamAVal += '```';
			});
			
			let teamBVal = '';
			
			this.teamB.forEach((playerObj) => {
				teamBVal += '```';
				teamBVal += `${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
				teamBVal += '```';
			});

			/*
			let init1CUDplayer = '';
			
			for (const [playerNum,playerObj] of Object.entries(this.remainingPlayers)) {
				init1CUDplayer += '```';
				init1CUDplayer += `${playerNum}. ${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
				init1CUDplayer += '```';
			}
			*/
			
			let draft2Embed = {
				color: 0x6ef55f,
				author: {
					name: `${this[this.otherCaptain][0].username} has drafted ${draftedPlayer.username}.`,
					icon_url: otherCaptainClient.displayAvatarURL()
				},
				description: '```' + `Mode: ${this.draftConfig.modeName}` + '```' + '\n\u200b' + `*Draft order:* ${this.formatDraftOrderStr(this.currentCaptain)}`,
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
					/*
					{
						name: 'Undrafted Players',
						value: init1CUDplayer + '\u200b'
					},
					*/
					{
						name: 'Your turn to draft.',
						//value: 'Please type **!d  <number>** to draft the corresponding player to your team or type **!rd** to draft a randomly-selected player to your team.'
						value: ':green_square: Use the buttons below, or type:\n**!d  <number>** - draft the corresponding player\n**!rd** - draft a random player'
					}
				]
			};
			
			//await currentCaptainClient.send({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
			this.captainDraftMsgs.embeds[this.currentCaptain] = await this.captainDraftMsgs.embeds[this.currentCaptain].edit({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
			
			embedFilesList = [];
			embedThumb = new Discord.AttachmentBuilder('./thumbnails/turnToDraftFalse.png', {name: 'turnToDraftFalse.png'}); //from: created on MS Word
			embedFilesList.push(embedThumb);
			
			draft2Embed.color = 0xed0505;
			draft2Embed.thumbnail = {
				url: 'attachment://' + embedThumb.name
			};
			draft2Embed.description = '```' + `Mode: ${this.draftConfig.modeName}` + '```' + '\n\u200b' + `*Draft order:* ${this.formatDraftOrderStr(this.otherCaptain)}`;
			draft2Embed.fields.pop();
			//draft2Embed.fields[2].value = init1CUDplayer;
			draft2Embed.fields.push({
					name: '\u200b',
					value: '*Waiting for the other captain to draft...*'
			});
			
			//await otherCaptainClient.send({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
			this.captainDraftMsgs.embeds[this.otherCaptain] = await this.captainDraftMsgs.embeds[this.otherCaptain].edit({ files: embedFilesList, embeds: [draft2Embed]}).catch(console.error);
			//break;
		}
    }
	
	checkIfSameCaptForRemainingDrafts() {
		/*
		const nextDraftNumber = this.draftNumber + 1;
		const nextCaptain = this.draftOrder[nextDraftNumber]
		for (let i = nextDraftNumber; i <= this.draftLength; i++) {
			//console.log(i);
			//console.log(this.draftOrder);
			//console.log(this.draftOrder[i]);
			if (this.draftOrder[i] !== nextCaptain) {
				return false;
			}
		}
		*/
		for (let i = this.draftNumber+1; i <= this.draftLength; i++) {
			//console.log(i);
			//console.log(this.draftOrder);
			//console.log(this.draftOrder[i]);
			if (this.draftOrder[i] !== this.draftOrder[this.draftNumber]) {
				return false;
			}
		}
		return true;
	}
	
	async autoDraft() {
		this.draftCooldown = false;
		await this.draftPlayer(Object.keys(this.remainingPlayers)[0]);
	}
	
	async draftPlayer(num) {
        for (const [currentIndex, player] of Object.entries(this.remainingPlayers)) {
            if (currentIndex === num) {
				if (this.draftCooldown) {
					let errObj = errorMsg('Draft cooldown',`Please wait to draft another player.`,null,false);
					errObj.msgEphemeral = true;
					return errObj;
				}
				this.draftCooldown = true;
				setTimeout(() => {
					this.draftCooldown = false;
				}, 4000);
				
				const currentCaptDraftMsg = this.captainDraftMsgs.embeds[this.currentCaptain];
				if (currentCaptDraftMsg.components !== this.captainDraftMsgs.buttons.disabled_buttons) {
					this.captainDraftMsgs.embeds[this.currentCaptain] = await this.captainDraftMsgs.embeds[this.currentCaptain].edit({
						components: this.captainDraftMsgs.buttons.disabled_buttons
					});
				}
				
				/*
				for (let m of Object.values(this.captainDraftMsgs.embeds)) {
					m =  await m.edit({
						components: this.captainDraftMsgs.buttons.disabled_buttons
					});
				}
				*/

				delete this.remainingPlayers[currentIndex];
                this[this.currentCaptain].push(player);
				this.draftNumber += 1;
                //const otherCaptainClient = this.captainsClient[this.otherCaptain];
                //await otherCaptainClient.send(`The other team has drafted: **${player.username}**`);
                logger.log('info', `${this[this.currentCaptain][0].username} has drafted ${player.username}`);
				
				if (this.autoDrafting)  {
					if ((this.draftNumber - 1) !== this.draftLength) {
						await this.nextDraft(player);
						return true;
					}
					
					this.draftComplete = true;
					await this.msgTeamsReady();
					
					if ((this.checkIn.checkInCollector.ended) && (getDraftFromIndex(this.index)) && (!this.handleGameLobbyCalled)) {
						await this.handleGameLobby();
					}
					
					for (const c of Object.values(this.captainDraftMsgs.collectors)) {
						await stopCollector(c);
					}
					
					return true;
				}
				
				let progButtons = this.captainDraftMsgs.buttons.progress_buttons;
				for (const r of progButtons) {
					for (const b of r.components) {
						if (b.data.custom_id.split(" ")[0] === num) {
							b.data.disabled = true;
						}
					}
				}
				
				//if (this.draftNumber < this.draftLength) {
				const nextDraftCaptain =  this.draftOrder[this.draftNumber];
				const nextNotDraftCaptain = nextDraftCaptain === 'teamA' ? 'teamB' : 'teamA';
				
				let nextDraftCaptainMsg = this.captainDraftMsgs.embeds[nextDraftCaptain];
				let nextNotDraftCaptainMsg = this.captainDraftMsgs.embeds[nextNotDraftCaptain];
				
				if (!(this.checkIfSameCaptForRemainingDrafts())) {
					nextDraftCaptainMsg = await nextDraftCaptainMsg.edit({
						components: progButtons
					});
				}
				nextNotDraftCaptainMsg = await nextNotDraftCaptainMsg.edit({
					components:  this.captainDraftMsgs.buttons.disabled_buttons
				});
				
				await this.nextDraft(player);
				//}
				/*
				else {
					for (let m of Object.values(this.captainDraftMsgs.embeds)) {
						m =  await m.edit({
							components: this.captainDraftMsgs.buttons.disabled_buttons
						});
					}
					
					
				}
				*/
				
                return true;
            }
        }
		return false;
    }

	//match teams ready functions
	async msgTeamsReady() {
		this.gamepass = makepw(3);
		this.matchInProgress = true;
		const teamsReadyMsgEmbed = this.genTeamsReadyMsg();
		
		if (this.draftOrder) {
			//await this.captainsClient.teamA.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
		   // await this.captainsClient.teamB.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
			try {
				this.captainDraftMsgs.embeds[this.currentCaptain] = await this.captainDraftMsgs.embeds[this.currentCaptain].edit({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
				this.captainDraftMsgs.embeds[this.otherCaptain] = await this.captainDraftMsgs.embeds[this.otherCaptain].edit({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
			}
			catch (e) {
				this.captainDraftMsgs = {
					embeds: {
						[`${this.currentCaptain}`]: await this.captainsClient.teamA.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}),
						[`${this.otherCaptain}`]: await this.captainsClient.teamB.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]})
					},
				};
				//this.captainDraftMsgs.embeds[this.currentCaptain] = await this.captainsClient.teamA.send({ files: embedFilesList, embeds: [DCEmbed]}).catch(console.error);
			}
			/*
			for (const player of this.nonCaptains) {
				const playerClient = await bot.users.fetch(player.discordId);
				await playerClient.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
			}
			*/
		}
		/*
		else {
			for (const player of this.allPlayers) {
				const playerClient = await bot.users.fetch(player.discordId);
				await playerClient.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
			}
		}
		*/
		
		const pingList = this.allPlayers.map(p => `<@${p.discordId}>`).join(' ');
		
		const teamsReadyMsgEmbedFields = teamsReadyMsgEmbed.embed.fields;
		//teamsReadyMsgEmbed.embed.fields.pop();
		teamsReadyMsgEmbedFields[1] = {
			name: '\u200b',
			value: '\u200b',
			inline: true
		};
		teamsReadyMsgEmbedFields[teamsReadyMsgEmbedFields.length - 1] = {
			name: '\u200b\n:green_square: Remember to check in above!',
			value: '*Game Lobby instructions will be given once all players have checked in.*',
		};
		
		const draftCompleteButtons = this.genTeamsReadyComponents();
		this.teamsReadyMsg = await cmdChannels.updatesCh.send({content: pingList, components: [draftCompleteButtons], files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]});
		await this.handleTeamsReadyMsgInteractions();
		
		
	}

	genTeamsReadyMsg() {
		logger.log('info', `Draft complete! Use password **${this.gamepass}**. Teams A: ${this.teamA.join(', ')} | Team B: ${this.teamB.join(', ')}.`);
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/draftComplete.png', {name: 'draftComplete.png'}); //from: 
		embedFilesList.push(embedThumb);
		
		const embedThumb2 = new Discord.AttachmentBuilder('./thumbnails/casualArena.jpg', {name: 'casualArena.jpg'}); //from: 
		embedFilesList.push(embedThumb2);
		
		let teamAVal = '';
				
		this.teamA.forEach((playerObj) => {
			teamAVal += '```';
			teamAVal += `${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
			teamAVal += '```';
		});
		
		let teamBVal = '';
		
		this.teamB.forEach((playerObj) => {
			teamBVal += '```';
			teamBVal += `${playerObj.username} (` + playerObj.ratingStats[`${this.mode}`].rating + ')';
			teamBVal += '```';
		});
		
		return {
			files: embedFilesList,
			embed: {
				color: 0xf9fc47,
				author: {
					name: 'Drafting complete!                                                                              \u200b',	//spaces to ensure the embed is as wide as possible to keep a consistent width
					icon_url: 'attachment://' + embedThumb.name
				},
				thumbnail: {
					url: 'attachment://' + embedThumb2.name
				},
				fields: [
					{
						name: 'Mode',
						value: `${this.draftConfig.modeName}`,
						inline: true
					},
					{
						name: 'Game Password',
						value: `${this.gamepass}`,
						inline: true
					},
					{
						name: 'Arena',
						value: this.replaceAllUnderscoreWithSpace(this.draftConfig.lobbySettings.arenaName),
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
						name: '\u200b\n:green_square: Check-in',
						value: `${cmdChannels.updatesCh}\n\u200b\nPlease see the updates channel for further instructions on creating the lobby.\nWhen the match is finished, please report the match result in ${cmdChannels.queueCh} using the :regional_indicator_w: / :regional_indicator_l: buttons.`,
					}
				]
			}
		};
	}

	genTeamsReadyComponents() {
		return new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId('gamepass')
				.setLabel('Game Password')
				.setStyle(Discord.ButtonStyle.Secondary)
		);
	}
	
	handleTeamsReadyMsgInteractions() {
		const teamsReadyMsgFilter = async (interaction) => {
			await interaction.deferReply({ephemeral: true});
			
			if (!(interaction.isButton())) {
				await interaction.followUp({content: "How did you even do this?!", ephemeral: true});
				return false;
			}
			
			const playerDiscordIds = this.allPlayers.map(p => p.discordId);
			
			if ((playerDiscordIds.includes(interaction.user.id)) || (isMod(interaction.user.id)) || (isStreamer(interaction.user.id))) {
				await interaction.followUp({content: `${this.gamepass}`, ephemeral: true});
				return true;
			}
			else {
				await interaction.followUp({content: "This button is not for you!", ephemeral: true});
				return false;
			}
		}
		this.teamsReadyMsgCollector = this.teamsReadyMsg.createMessageComponentCollector({ filter: teamsReadyMsgFilter });

		try {
			this.teamsReadyMsgCollector.on('collect', async i => {});
		}
		catch (err) {
			console.log('Error in teams ready collection listener');
			console.log(err);
		}
		
		this.teamsReadyMsgCollector.once('end', async (c,r) => {
			this.teamsReadyMsg.components[0].components[0].data.disabled = true;
			await this.teamsReadyMsg.edit({
				components: this.teamsReadyMsg.components
			});
		});
	}

	async handleGameLobby() {
		/*
		if (waited === 300*2) {
			let waitEmbed = {
				color: 0xffcd01,
				fields: [
					{
						name: 'The captains took too long to draft teams.',
						value: 'Please create the lobby manually with the provided password and arena.'
					}
				]
			};
			await cmdChannels.updatesCh.send({ embeds: [waitEmbed] });
		}
		*/
		this.handleGameLobbyCalled = true;
		let resultEmbed;
		if (cfg.createGameLobby) {
			let periodsSetting = true;	//on by default
			if ("periodsOn" in this.draftConfig.lobbySettings) {
				periodsSetting = this.draftConfig.lobbySettings.periodsOn;
			}
			let matchLength = 300;
			if (this.draftConfig.lobbySettings.matchLength) {
				matchLength = this.draftConfig.lobbySettings.matchLength;
			}
			let gamemode = 'hockey';
			if (this.draftConfig.lobbySettings.gamemode) {
				gamemode = this.draftConfig.lobbySettings.gamemode;
			}
			
			const lobbySettings = {
				"region": "oce-east",
				"name": `[OSL] RPUGs - ${this.captainsObject[0].username} vs ${this.captainsObject[1].username}`,
				"password": `${this.gamepass}`,
				"creator_name": "https://slapshot.gg/OSL",
				"game_mode": gamemode,
				"is_periods": periodsSetting,
				"arena": this.draftConfig.lobbySettings.arenaName,
				"match_length": matchLength,
				
			};
			
			const response = await createLobby(lobbySettings);
			//console.log(response);
			let result;
			
			try {
				result = JSON.parse(response.body);
			}
			catch (err) {
				result = {
					success: false,
					"error": response.body || response
				};
			}

			if (result.success) {
				this.lobbyId = result.lobby_id;
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
								value: 'Please create the lobby manually with the provided password and arena.'
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
								value: 'Please create the lobby manually with the provided lobby settings.'
							}
						]
					};
				}
			}
		}
		else {
			resultEmbed = {
				color: 0x0147ab,
				fields: [
					{
						name: 'Automatic lobby creation is disabled.',
						value: 'Please create the lobby manually with the provided lobby settings.'
					}
				]
			};
		}

		
		await cmdChannels.updatesCh.send({ embeds: [resultEmbed] });
	}

	getCancelMatchEmbedFields() {
		let fields = [];
		
		let matchFieldVal = '';
		matchFieldVal += '```';
		matchFieldVal += `Mode: ${this.draftConfig.modeName}\n`;
		if (this.gamepass) {
			matchFieldVal += `Gamepass: ${this.gamepass}\n`;
		}
		matchFieldVal += `In Progress: ${this.matchInProgress}\n`;
		if (this.draftOrder) {
			matchFieldVal += `Draft Order: ${Object.values(this.draftOrder).join(' --> ')}\n`
		}
		matchFieldVal += `Captains: ${this.captainsObject[0].username} (` + this.captainsObject[0].ratingStats[`${this.mode}`].rating + `) [A] | ${this.captainsObject[1].username} (` + this.captainsObject[1].ratingStats[`${this.mode}`].rating + `) [B]\n`;
		matchFieldVal += '```';
		
		fields.push({
			name: `Match ${this.index}`,
			value: matchFieldVal
		});
		
		const checkedInList = this.checkIn.checkInState.checkedIn.map(c => `<@${c.split(' ')[1]}>`).join(', ');
		const notCheckedInList = this.checkIn.checkInState.notCheckedIn.map(c => `<@${c.split(' ')[1]}>`).join(', ');
		fields.push({
			name: `Check-in Status:`,
			value: `Checked in: ${checkedInList}\nNot checked in: ${notCheckedInList}`
		});
		
		if (this.draftComplete) {
			const teamAVal = this.teamA.map(p => '```' + `${p.username} (${p.ratingStats[this.mode].rating})` + '```').join('');
			const teamBVal = this.teamB.map(p => '```' + `${p.username} (${p.ratingStats[this.mode].rating})` + '```').join('');
			
			/*
			this.teamA.forEach((playerObj) => {
				teamAVal += '```';
				teamAVal += `${playerObj.username} (` + playerObj.ratingStats[`${draft.mode}`].rating + ')';
				teamAVal += '```';
			});
			
			let teamBVal = '';
			
			draft.teamB.forEach((playerObj) => {
				teamBVal += '```';
				teamBVal += `${playerObj.username} (` + playerObj.ratingStats[`${draft.mode}`].rating + ')';
				teamBVal += '```';
			});
			*/
			fields.push({
				name: `Team A`,
				value: teamAVal,
				inline: true
			});
			fields.push({
				name: `Team B`,
				value: teamBVal,
				inline: true
			});
			
			if (Object.keys(this.reportedScores).length > 0) {
				let score = '';
				score += '```';
				
				if (Object.keys(this.reportedScores)[0].toString() === Object.values(this.reportedScores)[0]) {
					score += `${Object.keys(this.reportedScores)[0]} - W\n`;
				}
				else {
					score += `${Object.keys(this.reportedScores)[0]} - L\n`;
				}
				
				score += '```';
					
				fields.push({
					name: `Score Reported:`,
					value: score,
				});
			}
		}
		else {
			const allPlayers1 = this.allPlayers.slice(0,this.draftConfig.numPlayers/2);
			const allPlayers2 = this.allPlayers.slice(this.draftConfig.numPlayers/2);
			const playerList1 = allPlayers1.map(p => '```' + `${p.username} (${p.ratingStats[this.mode].rating})` + '```').join('');
			const playerList2 = allPlayers2.map(p => '```' + `${p.username} (${p.ratingStats[this.mode].rating})` + '```').join('');
			/*
			draft.nonCaptains.forEach((playerObj) => {
				playerList += '```';
				playerList += `${playerObj.username} (` + playerObj.ratingStats[`${draft.mode}`].rating + ')';
				playerList += '```';
			});
			*/
			fields.push({
				name: `All Players:`,
				value: playerList1,
				inline: true
			});
			fields.push({
				name: `\u200b`,
				value: playerList2,
				inline: true
			});
		}
		return fields;
	}

	//util functions
	/*
	stripIdDesignator(str) {
		//strip the first character from str and return as int
		return parseInt(str.slice(1));
	}
	*/
	replaceAllUnderscoreWithSpace(str) {
		return str.replace(/_/g,' ');
	}
}

class ScrimsDraft extends Draft {
	handleModeSpecificOptions(opts) {
		opts.teamA = opts.teams.teamA.players.map((p) => getPlayerQuery(p, null)).filter((p) => p !== null);
		opts.teamB = opts.teams.teamB.players.map((p) => getPlayerQuery(p, null)).filter((p) => p !== null);
		
		this.checkIn.checkInState.scrims = {
			teamA: {
				playersNotCheckedIn: [...opts.teamA],
				playersCheckedIn: []
			},
			teamB: {
				playersNotCheckedIn: [...opts.teamB],
				playersCheckedIn: []
			}
		}

		this.scrims = {
			teams: opts.teams
		};
	}
		
	genNewMatchMsg() {
		// embeds: Author: Match found, alert.png, Description: Captains are drafting. Captains are:, Field inline: Team A, capt0, Field inline, Team B, capt1
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/alert.png', {name: 'alert.png'}); //from: created on MS Word
		embedFilesList.push(embedThumb);
		
		const delim = "            ";
		
		const newMatchEmbed = {
			color: 0x000000,
			author: {
				name: `${this.draftConfig.modeName} Match found!`,
				icon_url: 'attachment://' + embedThumb.name
			},
			description: 'Captains:',
			fields: [
				{
					name: 'Team A',
					value: '```' + `${this.captainsObject[0].username}`.padEnd(32) + '```' + '```' + `(${this.replaceAllUnderscoreWithSpace(this.captainsObject[0].scrims.teamName)})`.padEnd(32) + '```',
					inline: true
				},
				{
					name: 'Team B',
					value: '```' + `${this.captainsObject[1].username}`.padEnd(32) + '```' + '```' + `(${this.replaceAllUnderscoreWithSpace(this.captainsObject[1].scrims.teamName)})`.padEnd(32) + '```' + '\u200b',
					inline: true
				},
				{
					name: ":blue_square: Check in below :red_square:",
					value: `*Three players from each team are required to check in*\n` + `:warning: Cancelling <t:${this.checkIn.checkInTimer}:R>`
				}
			]
		};
		
		return {
			embed: newMatchEmbed,
			files: embedFilesList
		};
	}
	
	genCheckInComponents() {
		let count = 1;
		let row = new Discord.ActionRowBuilder();
		for (const [k,t] of Object.entries(this.scrims.teams)) {
			const buttonId = `${t.teamId}`;
			row.addComponents(
				new Discord.ButtonBuilder()
				.setCustomId(buttonId)
				.setLabel(`\u200b${padStringToWidth(this.replaceAllUnderscoreWithSpace(t.teamName.substring(0,80)),220,"center")}\u200b`)
				//.setLabel(`\u200b${padStringToWidth	('Refresh',utilityButtonWidth,"center")}\u200b`)
				.setStyle(count === 1 ? Discord.ButtonStyle.Primary : Discord.ButtonStyle.Danger)
			);
			this.checkIn.checkInState.notCheckedIn.push(buttonId);
			this.checkIn.checkInState.scrims[k].playersNotCheckedIn = [...this[k]];
			count += 1;
		}
		return [row];
	}
	
	getTeamDesignatorFromTeamId(id) {
		for (const [k,t] of Object.entries(this.scrims.teams)) {
			if (t.teamId === id) {
				return k;
			}
		}
	}
	
	getComponentCollectorSettings() {
		const checkInFilter =  async (interaction) => {
			await interaction.deferReply({ephemeral: true});
			if (!(interaction.isButton())) {
				await interaction.followUp({content: "How did you even do this?!", ephemeral: true});
				return false;
			}
			//banned players can check in- don't see any reason to add a check for this at this stage
			
			const buttonCustomId = interaction.customId;
			const teamDesig = this.getTeamDesignatorFromTeamId(buttonCustomId);
			if (!(this[teamDesig].map(x => x.discordId).includes(interaction.user.id))) {
				await interaction.followUp({content: "This button is not for you!", ephemeral: true});
				return false;
			}
			
			//By this point, the user can only interact with their own team button
			//const allPlayersCheckedIn = [...this.checkIn.checkInState.scrims.teamA.playersCheckedIn, ...this.checkIn.checkInState.scrims.teamB.playersCheckedIn];
			if (this.checkIn.checkInState.scrims[teamDesig].playersCheckedIn.map(x => x.discordId).includes(interaction.user.id)) {
				await interaction.followUp({content: "You have already checked in!", ephemeral: true});
				return false;
			}
			
			if (getDraftFromDiscordId(interaction.user.id) && (!(this.captainsObject.map(x => x.discordId).includes(interaction.user.id)))) {
				await interaction.followUp({content: "You cannot check in as you are in an unreported match. Please finish the match and wait for both captains to report the result.", ephemeral: true});
				return false;
			}
			
			if (queueController.isInQueue(interaction.user.id)) {
				await interaction.followUp({content: "You cannot check in as you are in another queue. Please leave the queue/s to check in.", ephemeral: true});
				return false;
			}
			
			await interaction.followUp({content: "You have checked in!", ephemeral: true});
			
			if (this.checkIn.checkInMsgInteractionTimer) {
				clearTimeout(this.checkIn.checkInMsgInteractionTimer);
				this.checkIn.checkInMsgInteractionTimer = null;
			}
			
			const checkInPlayerIdx = this.checkIn.checkInState.scrims[teamDesig].playersNotCheckedIn.findIndex(c => c.discordId === interaction.user.id);
			const checkInPlayer = this.checkIn.checkInState.scrims[teamDesig].playersNotCheckedIn.splice(checkInPlayerIdx, 1)[0];
			this.checkIn.checkInState.scrims[teamDesig].playersCheckedIn.push(checkInPlayer);
			
			if (this.checkIn.checkInState.scrims[teamDesig].playersCheckedIn.length >= 3) {
				const checkInTeamIdx = this.checkIn.checkInState.notCheckedIn.findIndex(c => c === buttonCustomId);
				if (checkInTeamIdx !== -1) {
					this.checkIn.checkInState.notCheckedIn.splice(checkInTeamIdx, 1);
					this.checkIn.checkInState.checkedIn.push(buttonCustomId);
				}
			}
			
			this.checkIn.checkInMsgInteractionTimer = setTimeout(async () => {
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.edit({
					components: this.refreshCheckInComponents(),
					embeds: [this.refreshCheckInMsg()]
				});
				this.checkIn.checkInMsg = await this.checkIn.checkInMsg.removeAttachments();	//needed because: https://github.com/Rapptz/discord.py/issues/5139
			}, 2500);
			return (this.checkIn.checkInState.notCheckedIn.length === 0);
		}
		
		return {
			filter: checkInFilter,
			maxUsers: 1,
			time: cfg.checkInTime * 60 * 1000
		}
	}

	refreshCheckInMsg() {
		const checkInMsgEmbed = this.checkIn.checkInMsg.embeds[0];
		
		if ((this.checkIn.checkInState.scrims.teamA.playersCheckedIn.length > 0) || (this.checkIn.checkInState.scrims.teamB.playersCheckedIn.length > 0)) {
			const teamAUsersStr = this.checkIn.checkInState.scrims.teamA.playersCheckedIn.map(d => `<@${d.discordId}>`).join(',');
			const teamBUsersStr = this.checkIn.checkInState.scrims.teamB.playersCheckedIn.map(d => `<@${d.discordId}>`).join(',');
			const checkedInUsersStr = `Team A: ${teamAUsersStr}\nTeam B: ${teamBUsersStr}`;
			const checkedInEmbedObj = {
				name: 'Checked in:',
				value: checkedInUsersStr
			};
			
			if (checkInMsgEmbed.fields[2].name !== 'Checked in:') {
				checkInMsgEmbed.fields.splice(2, 0, checkedInEmbedObj);
			}
			else {
				checkInMsgEmbed.fields[2] = checkedInEmbedObj;
			}
		}
		
		return checkInMsgEmbed;
	}
	
	refreshCheckInComponents() {
		const checkInMsgComponents = this.checkIn.checkInMsg.components;
		
		let buttonsToDisable = [];
		for (const [k,t] of Object.entries(this.checkIn.checkInState.scrims)) {
			if (t.playersNotCheckedIn.length === 0) {
				buttonsToDisable.push(`${this.scrims.teams[k].teamId}`);
			}
		}
		
		for (const r of checkInMsgComponents) {
			for (const b of r.components) {
				//const playerDiscordId = b.data.custom_id.split(' ')[1];
				if (buttonsToDisable.includes(b.data.custom_id)) {	//only checking players who haven't checked in- safer than checking checked in list
					b.data.disabled = true;
				}
			}
		}

		return checkInMsgComponents;
	}

	genCheckInCancelMsg() {
		let teamList = '';
		for (const id of this.checkIn.checkInState.notCheckedIn) {
			const teamDesig = this.getTeamDesignatorFromTeamId(id);
			teamList += '```';
			teamList += `» ${this.scrims.teams[teamDesig].teamId} ${this.scrims.teams[teamDesig].teamName} - ${this.scrims.teams[teamDesig].league}`;
			teamList += '```';
		}
		
		return {
			color: 0xd7fc03,
			fields: [
				{
					name: 'The match below was automatically cancelled.',
					value: 'The following teams did not check in:' + teamList
				}
			]
		};
	}

	async msgTeamsReady() {
		this.gamepass = makepw(3);
		this.matchInProgress = true;
		const teamsReadyMsgEmbed = this.genTeamsReadyMsg();
		/*
		for (const player of this.checkIn.checkInState.scrims.teamA.playersCheckedIn) {
			const playerClient = await bot.users.fetch(player.discordId);
			await playerClient.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
		}
		for (const player of this.checkIn.checkInState.scrims.teamB.playersCheckedIn) {
			const playerClient = await bot.users.fetch(player.discordId);
			await playerClient.send({ files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]}).catch(console.error);
		}
		*/
		const pingList = [...this.checkIn.checkInState.scrims.teamA.playersCheckedIn, ...this.checkIn.checkInState.scrims.teamB.playersCheckedIn].map(p => `<@${p.discordId}>`).join(' ');
		
		teamsReadyMsgEmbed.embed.fields[1] = {
			name: '\u200b',
			value: '\u200b',
			inline: true
		};
		
		const draftCompleteButtons = this.genTeamsReadyComponents();
		this.teamsReadyMsg = await cmdChannels.updatesCh.send({content: pingList, components: [draftCompleteButtons], files: teamsReadyMsgEmbed.files, embeds: [teamsReadyMsgEmbed.embed]});
		await this.handleTeamsReadyMsgInteractions();	
	}

	genTeamsReadyMsg() {
		logger.log('info', `Draft complete! Use password **${this.gamepass}**. Teams A: ${this.checkIn.checkInState.scrims.teamA.playersCheckedIn.join(', ')} | Team B: ${this.checkIn.checkInState.scrims.teamB.playersCheckedIn.join(', ')}.`);
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/draftComplete.png', {name: 'draftComplete.png'}); //from: 
		embedFilesList.push(embedThumb);
		
		const embedThumb2 = new Discord.AttachmentBuilder('./thumbnails/casualArena.jpg', {name: 'casualArena.jpg'}); //from: 
		embedFilesList.push(embedThumb2);
		
		let teamAVal = '';
		teamAVal += '```';
		teamAVal += `${this.scrims.teams.teamA.teamName}`;
		teamAVal += '```';
		
		let teamBVal = '';
		teamBVal += '```';
		teamBVal += `${this.scrims.teams.teamB.teamName}`;
		teamBVal += '```';
		
		return {
			files: embedFilesList,
			embed: {
				color: 0xf9fc47,
				author: {
					name: 'Check-in Complete!                                                                            \u200b',	//spaces to ensure the embed is as wide as possible to keep a consistent width
					icon_url: 'attachment://' + embedThumb.name
				},
				thumbnail: {
					url: 'attachment://' + embedThumb2.name
				},
				fields: [
					{
						name: 'Mode',
						value: `${this.draftConfig.modeName}`,
						inline: true
					},
					{
						name: 'Game Password',
						value: `${this.gamepass}`,
						inline: true
					},
					{
						name: 'Arena',
						value: this.replaceAllUnderscoreWithSpace(this.draftConfig.lobbySettings.arenaName),
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
				]
			}
		};
	}

	getCancelMatchEmbedFields() {
		let fields = [];
		
		let matchFieldVal = '';
		matchFieldVal += '```';
		matchFieldVal += `Mode: ${this.draftConfig.modeName}\n`;
		if (this.gamepass) {
			matchFieldVal += `Gamepass: ${this.gamepass}\n`;
		}
		matchFieldVal += `In Progress: ${this.matchInProgress}\n`;
		if (this.draftOrder) {
			matchFieldVal += `Draft Order: ${Object.values(this.draftOrder).join(' --> ')}\n`
		}
		matchFieldVal += `Captains: ${this.captainsObject[0].username} (${this.scrims.teams.teamA.teamName}) [A] | ${this.captainsObject[1].username} (${this.scrims.teams.teamB.teamName}) [B]\n`;
		matchFieldVal += '```';
		
		fields.push({
			name: `Match ${this.index}`,
			value: matchFieldVal
		});
		
		const teamACheckedInList = this.checkIn.checkInState.scrims.teamA.playersCheckedIn.map(d => `<@${d.discordId}>`).join('\n');
		const teamBCheckedInList = this.checkIn.checkInState.scrims.teamB.playersCheckedIn.map(d => `<@${d.discordId}>`).join('\n');
		fields.push({
			name: `\u200b`,
			value: `**Check-in/Team Status:**`
		});
		fields.push({
			name: `Team A`,
			value: teamACheckedInList,
			inline: true
		});
		fields.push({
			name: `Team B`,
			value: teamBCheckedInList,
			inline: true
		});
		
		if (Object.keys(this.reportedScores).length > 0) {
			let score = '';
			score += '```';
			
			if (Object.keys(this.reportedScores)[0].toString() === Object.values(this.reportedScores)[0]) {
				score += `${Object.keys(this.reportedScores)[0]} - W\n`;
			}
			else {
				score += `${Object.keys(this.reportedScores)[0]} - L\n`;
			}
			
			score += '```';
				
			fields.push({
				name: `Score Reported:`,
				value: score,
			});
		}
		return fields;
	}
}

function getOngoingDrafts() {
    return ongoingDrafts;
}
 
async function removeDraft(userDraftIndex,cancelObj) {
    for (const [arrayIndex, draft] of ongoingDrafts.entries()) {
        if (draft.index === Number(userDraftIndex)) {
			//The following is probably poor coding practice, but it works- need to wait for the messages to send before trying to stop their collectors.
			//Otherwise, the following code is run with no collectors there *yet* but the collectors are then on after the message is sent in Discord- this situation would be worse

			await waitForIt(draft.checkIn.checkInCollector,30);
			await stopCollector(draft.checkIn.checkInCollector);
			
			if (draft.draftConfig.draft) {
				if (draft.draftComplete) {
					if (draft.matchInProgress) {
						await waitForIt(draft.teamsReadyMsgCollector,30);
						await stopCollector(draft.teamsReadyMsgCollector);
					}
				}
	
				await waitForIt(draft.captainDraftMsgs,30);
				for (const c of Object.values(draft.captainDraftMsgs.collectors)) {
					await stopCollector(c);
				}
			}
			else {
				if (draft.matchInProgress) {
					await waitForIt(draft.teamsReadyMsgCollector,30);
					await stopCollector(draft.teamsReadyMsgCollector);
				}
			}
			
			if (draft.lobbyId) {
				try {
					const result = await deleteLobby(draft.lobbyId);
				}
				catch (err) {
					console.log('Failed to delete lobby. Error below.');
					console.log(err);
				}
			}

			if (cancelObj.cancelCalled) {
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
				for (const player of draft.allPlayers) {
					try {
						const playerClient = await bot.users.fetch(player.discordId);
						await playerClient.send({ files: embedFilesList, embeds: [cancelDMEmbed]});
					}
					catch (e) {
						if (e.code === 50007) {
							const errObj = errorMsg('Unable to message the following user:',`<@${player.discordId}>/${player.username}`,null,false);
							await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
						}
						else {
							throw e;
						}
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
					fields: draft.getCancelMatchEmbedFields(),
					footer: {
						text: `Cancelled by Admin ${cancelObj.adminAuthor.id} ${cancelObj.adminAuthor.username}.`,
						icon_url: cancelObj.adminAuthor.displayAvatarURL(),
					}
				};
				
				//const cancelModMessage = `Match ${userDraftIndex} was cancelled by Admin ${cancelObj.adminAuthor.id	} ${cancelObj.adminAuthor.username}.`;
				await cmdChannels.modCh.send({ files: embedFilesList, embeds: [cancelModEmbed]}).catch(console.error);
			}
            ongoingDrafts.splice(arrayIndex, 1);
            return true;
        }
    }
    return false;
}

async function stopCollector(c) {
	try {
		c.stop();
	}
	catch (e) {
		await notifyDev(e, 'There was an error stopping a collector when a match was cancelled/completed. Check console.');
	}
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
			for (const t of Object.values(draft.checkIn.checkInState.scrims)) {
				for (const player of t.playersCheckedIn) {
					if (discordId === player.discordId) {
						return draft;
					}
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

function getDraftFromTeamId(teamId) {
	for (const draft of ongoingDrafts) {
		if (draft.mode === 'scrims') {
			if ((teamId === draft.scrims.teams.teamA.teamId) || (teamId === draft.scrims.teams.teamB.teamId)) {
				return draft;
			}
		}
	}
	
	return false;
}


export {
    Draft,
	ScrimsDraft,
    getOngoingDrafts,
    isCaptain,
    isCurrentCaptain,
    getDraftFromDiscordId,
	getDraftFromIndex,
	getDraftFromTeamId,
    removeDraft
};