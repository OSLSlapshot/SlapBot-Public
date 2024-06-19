import { getPlayerQuery, getPlayerRatingStatsQuery, getPlayerRatingChangeStatsQuery, getSeasonModesQuery, getSeasonListQuery, getPiesQuery } from '../queries/index.js';
import cfg from '../../config.js';
import { padStringToWidth } from 'discord-button-width';
import { round } from 'mathjs';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import { bot } from '../index.js';
import errorMsg from '../scripts/errorMessage.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import getSeasonEmojiFromMonth from '../utls/seasonEmojis.js';
import notifyDev from '../utls/notifyDev.js';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
 
async function profile(msg) {
	const commandCalls = ['!profile','!p'];
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	//const userMessageLower = userMessage.toLowerCase().match(/\S+/g);
	//const userArgs = userMessage.match(/\S+/g);	//from here: https://stackoverflow.com/questions/9401897/split-a-string-using-whitespace-in-javascript
    let profileCalled = false;
	try {
		profileCalled = ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase())));
	}
	catch (e) {
		await notifyDev(e, 'There was an error in the profile command. Check console.');
	}
    if (profileCalled) {
		let profileClass;
		if (userMessage.length === 1) {
			profileClass = new Profile(msg, msg.author.id, null);
		}
		else if (userMessage.length === 2) {
			profileClass = new Profile(msg, null, userMessage[1]);
		}
		else {
			return errorMsg('Expected 0 or 1 inputs for this command.');
		}
		
		return await profileClass.generateProfile();
	}
	return;
}
 
class Profile {
	constructor(inputCmd = null, discordId = null, username = null) {
		this.inputCmd = inputCmd;
		this.discordId = discordId;
		this.inputUsername = username;
		
		this.playerStats = {
			current: {}
		};
	}
	
	getDefaultProfileState() {
		return {
			season: 'current',
			mode: 'casual',
			stat: 'statistics'
		};
	}
	
	getPlayer() {
		this.profileState = this.getDefaultProfileState();
		if (this.discordId) {
			return getPlayerQuery(this.discordId,  null);
		}
		else {	//inputUsername alternatively available
			return getPlayerQuery(null, this.inputUsername);
		}
	}
	
	getPlayerRatingStats(pid,season,mode) {
		return getPlayerRatingStatsQuery(pid,season,mode);
	}
	
	async getPlayerRatingChangeStats(pid,season,mode) {
		return await getPlayerRatingChangeStatsQuery(pid,season,mode);
	}
	
	getSeasonModes(season) {
		return getSeasonModesQuery(season);
	}
	
	getCurrentSeason() {
		const seasonList = getSeasonListQuery();
		const searchStr = "(current)";
		return seasonList.filter(s => s.includes(searchStr))[0];
	}
	
	getPastSeasonsList() {
		const seasonList = getSeasonListQuery();
		const searchStr = "(current)";
		return seasonList.filter(s => !(s.includes(searchStr))).reverse();
	}
	
	async generateProfile() {
		this.player = this.getPlayer();
		
		if (this.player === null) {
			return errorMsg('Could not find player in the database.');
		}
		
		//generate components
		//generate embed info + embed
		//can't return this stuff or else the collector would have to be outside...
		
		const currComponents = this.generateComponents();
		const currEmbed = await this.generateEmbed();
		
		this.profileMsg = await this.inputCmd.reply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
			.then( async (pfMsg) => {
				const pfFilter =  (i) => {
					if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
						i.reply({content: "How did you even do this?!", ephemeral: true});
						return false;
					}
					
					if (this.inputCmd.author.id !== i.user.id) {
						i.reply({content: "This message is not for you!", ephemeral: true});
						return false;
					}
					
					return true;
				}
				
				this.pfCollector = pfMsg.createMessageComponentCollector({ filter: pfFilter, idle: 30000 });
				
				this.pfCollector.on('collect', async i => {
					const buttonPressed = i.customId;
					const cmdCalled = buttonPressed.slice(3);
					const cmdCalledArgs = cmdCalled.split(' ');
					const cmdType = cmdCalledArgs[0];
					//const iUserId = i.user.id;
					
					const lowerCaseModeNames = cfg.modes.map(m => m.modeName.toLowerCase());
					
					await i.deferUpdate();
					
					let currPfSelectState = i.message.components;
					
					if ((cmdType === 'season') || (cmdType === 'mode')) {
						this.profileState[cmdType] = i.values[0];
						
						const currPfSelectOptionsState = currPfSelectState[this.cmdIdx[cmdType]].components[0].data.options;
						for (const opt of currPfSelectOptionsState) {
							if (opt.value === this.profileState[cmdType]) {
								opt.default = true;
							}
							else if (opt.default) {
								opt.default = false;
							}
						}
						if (cmdType === 'season') {
							this.profileState.mode = 'casual';	//default to 'casual' mode if season is changed since this is consistently present in every season
							
							const modeComponentRow = this.generateModeComponentRow();
							currPfSelectState[this.cmdIdx.mode] = modeComponentRow;

							/*
							const currPfModeComponentsState = currPfSelectState[this.cmdIdx.mode].components[0].data.options;
							for (const opt of currPfModeComponentsState) {
								if (opt.value === this.profileState.mode) {
									opt.default = true;
								}
								else if (opt.default) {
									opt.default = false;
								}
							}
							*/
						}
					}
					else if (cmdType === 'stat') {
						this.profileState.stat = cmdCalledArgs[1];
							
						const statButtons = currPfSelectState[this.cmdIdx[cmdType]].components;
						for (const b of statButtons) {
							if (b.data.custom_id === i.customId) {
								b.data.disabled = true;
							}
							else {
								b.data.disabled = false;
							}
						}
					}
					
					/*
					switch (cmdType) {
						case 'season':
							this.profileState.season = i.values[0];
							this.profileState.mode = 'casual';	//default to 'casual' mode if season is changed since this is consistently present in every season
						case 'mode':
							if (cmdType !== 'mode') {
								this.profileState[cmdType] = i.values[0];
							}
							
							const currPfSelectOptionsState = currPfSelectState[this.cmdIdx[cmdType]].components[0].data.options;
							for (const opt of currPfSelectOptionsState) {
								if (opt.value === this.profileState[cmdType]) {
									opt.default = true;
								}
								else if (opt.default) {
									opt.default = false;
								}
							}
							break;
						case 'stat':
							this.profileState.stat = cmdCalledArgs[1];
							
							const statButtons = currPfSelectState[this.cmdIdx[cmdType]].components;
							for (const b of statButtons) {
								if (b.data.custom_id === i.customId) {
									b.data.disabled = true;
								}
								else {
									b.data.disabled = false;
								}
							}
							//const currPfSelectOptionsState = currPfSelectState[this.cmdIdx[cmdType]].components[0].data.options;
							break;
					}
					*/
					const newPf = await this.generateEmbed();
					
					await pfMsg.edit({files: newPf.embedFiles, embeds: [newPf.embedMessage], components: currPfSelectState, ephemeral: true});
				});
				
				this.pfCollector.once('end', async function(collected,reason) {
					if (reason === 'idle') {
						const pfMsgComponents = pfMsg.components;
						for (const r of pfMsgComponents) {
							for (const b of r.components) {
								b.data.disabled = true;
							}
						}
						await pfMsg.edit({components: pfMsgComponents, ephemeral: true});
					}
				});
			});
		
	}
	
	generateComponents() {
		let componentRows = [];
		const pastSeasons = this.getPastSeasonsList();
		
		const seasonButtonWidth = 50;
		/*
		let row1 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p season current`)
					.setLabel(`\u200b${padStringToWidth('Season',seasonButtonWidth+4,"center")}\u200b`)
					//.setLabel('Top')
					.setEmoji('🇸')
					.setStyle(Discord.ButtonStyle.Secondary)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p season career`)
					.setLabel(`\u200b${padStringToWidth('Career',seasonButtonWidth+2,"center")}\u200b`)
					//.setLabel('15')
					.setEmoji('🇨')
					.setStyle(Discord.ButtonStyle.Secondary)
			);
		*/
		let row1 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!p season')
					//.setPlaceholder('Select queue')
					.setMinValues(1)
					.setMaxValues(1)
					.setOptions(
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel(`Season: Current`)	//using RPUGs username since the discord username will have to be fetched- fix this
							.setValue(`current`)	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
							.setEmoji(getSeasonEmojiFromMonth(this.getCurrentSeason().slice(4,6)))
							.setDefault(true),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel(`Career`)	//using RPUGs username since the discord username will have to be fetched- fix this
							.setValue(`career`)	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
							.setEmoji('🗂️')
							.setDefault(false)
					)
			);
			
		for (const s of pastSeasons) {
			row1.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`Season: ${s}`)	//using RPUGs username since the discord username will have to be fetched- fix this
					.setValue(s)	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
					.setEmoji(getSeasonEmojiFromMonth(s.slice(4,6)))
					.setDefault(false)
			);
		}
		
		//console.log(row1[0]);
		componentRows.push(row1);
		/*
		let row2 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p mode casual`)
					.setLabel(`\u200b${padStringToWidth('Casual',seasonButtonWidth+4,"center")}\u200b`)
					//.setLabel('Top')
					.setEmoji(modeEmojis.casual)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p mode twos`)
					.setLabel(`\u200b${padStringToWidth('Twos',seasonButtonWidth+4,"center")}\u200b`)
					//.setLabel('Top')
					.setEmoji(modeEmojis.twos)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p mode fours`)
					.setLabel(`\u200b${padStringToWidth('Fours',seasonButtonWidth+2,"center")}\u200b`)
					//.setLabel('15')
					.setEmoji(modeEmojis.fours)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			);
		*/	
		const row2 = this.generateModeComponentRow();
		
		componentRows.push(row2);
		
		//could potentially combine all plots into a Plots button, and then bring up either buttons or a menu for selecting type/s of plots
		let row3 = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p stat statistics`)
					.setLabel(`\u200b${padStringToWidth('Statistics',seasonButtonWidth,"center")}\u200b`)
					//.setLabel('Top')
					//.setEmoji(modeEmojis.casual)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(true)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p stat worm`)
					.setLabel(`\u200b${padStringToWidth('Rating Worm',seasonButtonWidth,"center")}\u200b`)
					//.setLabel('Top')
					//.setEmoji(modeEmojis.twos)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p stat streakstepline`)
					.setLabel(`\u200b${padStringToWidth('Streak Step Line',seasonButtonWidth,"center")}\u200b`)
					//.setLabel('Top')
					//.setEmoji(modeEmojis.twos)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			)
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p stat pies`)
					.setLabel(`\u200b${padStringToWidth('Top Versus',seasonButtonWidth,"center")}\u200b`)
					//.setLabel('15')
					//.setEmoji(modeEmojis.fours)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			);
			/*
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!p stat matchdist`)
					.setLabel(`\u200b${padStringToWidth('Match Distribution',seasonButtonWidth,"center")}\u200b`)
					//.setLabel('15')
					.setEmoji(modeEmojis.fours)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(false)
			);
			*/
			
		componentRows.push(row3);
		
		this.cmdIdx = {
			'season': 0,
			'mode': 1,
			'stat': 2
		};
		
		return componentRows;
	}
	
	generateModeComponentRow() {
		let modeEmojis = {};
		const seasonModes = this.getSeasonModes(this.profileState.season).filter(m => m !== 'Scrims');
		
		for (const m of [...cfg.modes,...cfg.retiredModes]) {
			const currModeName = m.modeName;
			if (seasonModes.includes(currModeName)) {
				modeEmojis[currModeName.toLowerCase()] = m.emoji;
			}
		}
		
		const modeEmojisDefined = Object.keys(modeEmojis);
		for (const m of seasonModes) {
			if (!(modeEmojisDefined.includes(m.toLowerCase()))) {
				modeEmojis[m.toLowerCase()] = '🟦';	//default emoji: blue square
			}
		}
		
		const modeComponentRow = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!p mode')
					.setMinValues(1)
					.setMaxValues(1)
					.setOptions(
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel(`Mode: Casual`)
							.setValue(`casual`)
							.setEmoji(modeEmojis.casual)
							.setDefault(true)
					)
			);
		
		for (const m of seasonModes) {
			if (m === 'Casual') { continue; }
			modeComponentRow.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`Mode: ${m}`)
					.setValue(`${m.toLowerCase()}`)
					.setEmoji(modeEmojis[m.toLowerCase()])
					.setDefault(false),
			);
		}
		
		return modeComponentRow;
	}
	
	async generateEmbed() {
		/*
		if (this.profileState.stat === 'statistics') {
			return 
		}
		*/
		const userAvatarURL = (await bot.users.fetch(this.player.discordId).catch(console.error)).displayAvatarURL();
		const seasonDisplayStr = this.profileState.season === 'career' ? 'Career': `${capitaliseFirstLetter(this.profileState.season)} Season`
		
		const statEmbed = {
			color: 0x34eb4c,
			author: {
				name: `${this.player.playerId}  •  ${this.player.username}`,
				icon_url: `${userAvatarURL}`,
			},
			description: `**User:** <@${this.player.discordId}>`,
			footer: {
				text: `${seasonDisplayStr}  •  ${capitaliseFirstLetter(this.profileState.mode)}  •  ${capitaliseFirstLetter(this.profileState.stat)}`
			}
		};
		
		
		switch (this.profileState.stat) {
			case 'statistics':
				return await this.getStatisticsEmbed(statEmbed);
			case 'worm':
				return await this.getRatingWormEmbed(statEmbed);
			case 'streakstepline':
				return await this.getStreakStepLineEmbed(statEmbed);
			case 'pies':
				return await this.getPiesEmbed(statEmbed);
		}
	}
	
	async getStatisticsEmbed(baseEmbed) {
		const currSeason = this.profileState.season;
		const currMode = this.profileState.mode;
		const CurrMode = capitaliseFirstLetter(currMode);
		
		this.initialiseModeObjForStats();
		const currPlayerStats = this.playerStats[currSeason][currMode];
		
		if (!('playerRatingStats' in currPlayerStats)) {	//since playerRatingStats could be null, we must use "key" in obj here to check for the key's existence
			currPlayerStats.playerRatingStats = this.getPlayerRatingStats(this.player.playerId, currSeason, currMode);
		}
		
		let statsVal = '';
		if (currPlayerStats.playerRatingStats) {
			currPlayerStats.playerRatingChangeStats = await this.getPlayerRatingChangeStats(this.player.playerId, currSeason, currMode);
			currPlayerStats.plots.worm = currPlayerStats.playerRatingChangeStats.worm;
			currPlayerStats.plots.streakstepline = currPlayerStats.playerRatingChangeStats.streakstepline;
			
			//this.playerMoreInfo = await this.getPlayerMoreInfo();
			
			
			const totalMatches = currPlayerStats.playerRatingStats.wins + currPlayerStats.playerRatingStats.losses;
			
			let winPercent = Math.round((100 * currPlayerStats.playerRatingStats.wins) / totalMatches);
			if (isNaN(winPercent)) {
				winPercent = "-";
			}
			else {
				winPercent = winPercent.toString() + "%";
			}
			
			const delim = "    ";
			if (currSeason === 'career') {
				statsVal = '```';
				statsVal += `\u200b ${currPlayerStats.playerRatingChangeStats.numSeasons} season(s) played`;
				statsVal += '```'
				statsVal += '```';
				statsVal += `\u200b      ${delim} Rating ${delim} Streak ${delim}`;	//34 length
				statsVal += `\n\u200b Min |${delim} ${padSides(currPlayerStats.playerRatingChangeStats.rating.min,6)} ${delim} ${padSides(currPlayerStats.playerRatingChangeStats.streak.min,6)}`;
				statsVal += `\n\u200b Max |${delim} ${padSides(currPlayerStats.playerRatingChangeStats.rating.max,6)} ${delim} ${padSides(currPlayerStats.playerRatingChangeStats.streak.max,6)}`;
				statsVal += `\n\u200b Avg |${delim} ${padSides(currPlayerStats.playerRatingChangeStats.rating.avg,6)}`;
				statsVal += '```';
				statsVal += '```';
				//statsVal += `\u200b Matches  Wins  Losses  Win %`;
				//statsVal += `\n\u200b ` + `${padSides(totalMatches,7)}  ${padSides(currPlayerStats.playerRatingStats.wins,4)}  ${padSides(currPlayerStats.playerRatingStats.losses,6)}  ${padSides(winPercent,5)}`;
				statsVal += `\u200b    M     W     L   ${delim}Win %     `;
				statsVal += `\n\u200b  ` + `${padSides(totalMatches,5)} ${padSides(currPlayerStats.playerRatingStats.wins,5)} ${padSides(currPlayerStats.playerRatingStats.losses,5)} ${delim}${padSides(winPercent,5)}`;
				statsVal += '```';
			}
			else {
				const lastPlayed = new Date(currPlayerStats.playerRatingStats.lastPlayed);
				let lastPlayedFormatting;
				if (!isNaN(lastPlayed)) {
					//lastPlayed.setHours(lastPlayed.getHours() - 10); //AEST
					lastPlayedFormatting = `${lastPlayed.getDate()}/${lastPlayed.getMonth() + 1}/${lastPlayed.getFullYear()}`;
				}
				else {
					lastPlayedFormatting = '-';
				}
				
				statsVal = '```';
				statsVal += `\u200b      ${delim} Rating ${delim} Streak ${delim}`;	//34 length
				statsVal += `\n\u200b Min |${delim} ${padSides(currPlayerStats.playerRatingChangeStats.rating.min,6)} ${delim} ${padSides(currPlayerStats.playerRatingChangeStats.streak.min,6)}`;
				statsVal += `\n\u200b Max |${delim} ${padSides(currPlayerStats.playerRatingChangeStats.rating.max,6)} ${delim} ${padSides(currPlayerStats.playerRatingChangeStats.streak.max,6)}`;
				statsVal += `\nCurr |${delim} ${padSides(currPlayerStats.playerRatingStats.rating,6)} ${delim} ${padSides(currPlayerStats.playerRatingChangeStats.streak.curr,6)}`;
				statsVal += '```';
				statsVal += '```';
				//statsVal += `\u200b Matches  Wins  Losses  Win %`;
				//statsVal += `\n\u200b ` + `${padSides(totalMatches,7)}  ${padSides(currPlayerStats.playerRatingStats.wins,4)}  ${padSides(currPlayerStats.playerRatingStats.losses,6)}  ${padSides(winPercent,5)}`;
				statsVal += `\u200b    M     W     L   ${delim}Win %     `;
				statsVal += `\n\u200b  ` + `${padSides(totalMatches,5)} ${padSides(currPlayerStats.playerRatingStats.wins,5)} ${padSides(currPlayerStats.playerRatingStats.losses,5)} ${delim}${padSides(winPercent,5)}`;
				statsVal += '```';
				statsVal += '```';
				statsVal += `Last Played: ${lastPlayedFormatting} `;
				statsVal += '```';
			}
		}
		else {
			statsVal = '```';
			statsVal += `\u200b${padSides('No data found',34)}\u200b`;
			statsVal += '```';
		}
			
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rating.png', {name: 'rating.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		baseEmbed.thumbnail = { url: 'attachment://' + embedThumb.name };
		baseEmbed.description += `\n${statsVal}`
		
		return {
			embedMessage: baseEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};	
	}
	
	async getRatingWormEmbed(baseEmbed) {
		const currSeason = this.profileState.season;
		const currMode = this.profileState.mode;
		this.initialiseModeObjForStats();
		const currPlayerStats = this.playerStats[currSeason][currMode];
		
		if (!('playerRatingChangeStats' in currPlayerStats)) {	//since playerRatingStats could be null, we must use "key" in obj here to check for the key's existence
			currPlayerStats.playerRatingChangeStats = await this.getPlayerRatingChangeStats(this.player.playerId, currSeason, currMode);
			currPlayerStats.plots.worm = currPlayerStats.playerRatingChangeStats.worm;
			currPlayerStats.plots.streakstepline = currPlayerStats.playerRatingChangeStats.streakstepline;
		}

		let embedFilesList = [];
		const graphEmbed = new Discord.AttachmentBuilder(currPlayerStats.plots.worm, {name: 'ratingWorm.png'});
		embedFilesList.push(graphEmbed);
		
		baseEmbed.image = { url: "attachment://" + graphEmbed.name }
		
		return {
			embedMessage: baseEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};
	}
	
	async getStreakStepLineEmbed(baseEmbed) {
		const currSeason = this.profileState.season;
		const currMode = this.profileState.mode;
		this.initialiseModeObjForStats();
		const currPlayerStats = this.playerStats[currSeason][currMode];
		
		if (!('playerRatingChangeStats' in currPlayerStats)) {	//since playerRatingStats could be null, we must use "key" in obj here to check for the key's existence
			currPlayerStats.playerRatingChangeStats = await this.getPlayerRatingChangeStats(this.player.playerId, currSeason, currMode);
			currPlayerStats.plots.worm = currPlayerStats.playerRatingChangeStats.worm;
			currPlayerStats.plots.streakstepline = currPlayerStats.playerRatingChangeStats.streakstepline;
		}

		let embedFilesList = [];
		const graphEmbed = new Discord.AttachmentBuilder(currPlayerStats.plots.streakstepline, {name: 'streakstepline.png'});
		embedFilesList.push(graphEmbed);
		
		baseEmbed.image = { url: "attachment://" + graphEmbed.name }
		
		return {
			embedMessage: baseEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};
	}
	
	async getPiesEmbed(baseEmbed) {
		const currSeason = this.profileState.season;
		const currMode = this.profileState.mode;
		this.initialiseModeObjForStats();
		const currPlayerStats = this.playerStats[currSeason][currMode];
		
		//if (!('pies' in currPlayerStats.plots)) {	//since playerRatingStats could be null, we must use "key" in obj here to check for the key's existence
		if (!('pieStats' in currPlayerStats)) {
			//currPlayerStats.playerRatingChangeStats = await this.getPlayerRatingChangeStats(this.player.playerId, currSeason, currMode);
			//currPlayerStats.plots.pies = getPiesQuery(this.player.playerId, currSeason, currMode);
			currPlayerStats.pieStats = await getPiesQuery(this.player.playerId, currSeason, currMode);
		}
		
		if (currPlayerStats.pieStats) {
			//let embedFilesList = [];
			//const piesEmbed = new Discord.AttachmentBuilder(currPlayerStats.plots.pies, {name: 'pies.png'});
			//embedFilesList.push(piesEmbed);
			
			//baseEmbed.image = { url: "attachment://" + graphEmbed.name }
			baseEmbed.fields = [
				{
					name: 'Wins With',
					inline: true
				},
				{
					name: '\u200b',
					value: '\u200b',
					inline: true
				},
				{
					name: 'Wins Against',
					inline: true
				},
				{
					name: 'Losses With',
					inline: true
				},
				{
					name: '\u200b',
					value: '\u200b',
					inline: true
				},
				{
					name: 'Losses Against',
					inline: true
				},
			];
			
			for (const t of Object.keys(currPlayerStats.pieStats)) {
				let fieldName;
				for (const [s,sList] of Object.entries(currPlayerStats.pieStats[t])) {
					fieldName = `${capitaliseFirstLetter(s)} ${t}`;
					let fieldVal = '';
					for (const p of sList) {
						fieldVal += `\n\u200b${p.stats[t][s].toString().padStart(3,' ')} - ${p.player.username} - <@${p.player.discordId}>`;
					}
					for (const f of baseEmbed.fields) {
						if (f.name === fieldName) {
							f.value = fieldVal;
						}
					}
				}
			}
		}
		else {
			let noDataStr = '```';
			noDataStr += `\u200b${padSides('No data found',34)}\u200b`;
			noDataStr += '```';
			
			baseEmbed.description += noDataStr;
		}
		
		let embedFilesList = [];
		
		return {
			embedMessage: baseEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};
	}
	
	initialiseModeObjForStats() {
		const currSeason = this.profileState.season;
		if (!this.playerStats[currSeason]) {
			this.playerStats[currSeason] = {};
		}
		
		const currMode = this.profileState.mode;
		if (!this.playerStats[currSeason][currMode]) {
			this.playerStats[currSeason][currMode] = {plots: {}};
		}
	}
}

export default profile;
