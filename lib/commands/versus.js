import { getPlayerQuery, getSeasonModesQuery, getSeasonListQuery, getVersusStatsQuery } from '../queries/index.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
//import { round } from 'mathjs';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import { bot, cmdChannels } from '../index.js';
import cfg from '../../config.js';
import errorMsg from '../scripts/errorMessage.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import getSeasonEmojiFromMonth from '../utls/seasonEmojis.js';

/**
 * Command to check versus stats with and against another player
 * Syntax: !vs <username>
 */

async function versus(msg) {
	const commandCalls = ['!versus','!vs'];
	const msgAuthorId = msg.author.id;
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		if ((msg.guild) && (msg.channel.name !== cmdChannels.commandsCh.name) && (msg.channel.name !== cmdChannels.otherCh.name)) {
			return errorMsg("You cannot use that command here.");
		}
		
		let vsState = {
			season: 'current',
			mode: 'casual',
			user1:  msgAuthorId,
			user2: null,
		};
		
		let vsEmbed;
		if (userMessage.length === 1) {
			vsEmbed = await generateVsEmbed(vsState);
		}
		else if (userMessage.length === 2) {
			const searchPlayer = getPlayerQuery(null, userMessage[1]);
			vsState.user2 = searchPlayer ? searchPlayer.discordId : null;
			vsEmbed = await generateVsEmbed(vsState);
		}
		else if (userMessage.length === 3) {
			const searchPlayer1 = getPlayerQuery(null, userMessage[1]);
			vsState.user1 = searchPlayer1 ? searchPlayer1.discordId : null;
			
			const searchPlayer2 = getPlayerQuery(null, userMessage[2]);
			vsState.user2 = searchPlayer2 ? searchPlayer2.discordId : null;
			
			vsEmbed = await generateVsEmbed(vsState);
		}
		else {
			return errorMsg(
				"Expected between 0 and 2 inputs for this command."
			);
		}
		
		const vsComponents = generateVsComponents(vsState);
		
		await msg.reply({files: vsEmbed.embedFiles, embeds: [vsEmbed.embedMessage], components: vsComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
		.then( async (vsMsg) => {
			const vsFilter =  (i) => {
				if ((!(i.isStringSelectMenu())) && (!(i.isUserSelectMenu()))) {
					i.reply({content: "How did you even do this?!", ephemeral: true});
					return false;
				}
				
				if (msgAuthorId !== i.user.id) {
					i.reply({content: "This message is not for you!", ephemeral: true});
					return false;
				}
				
				return true;
			}
			
			const vsCollector = vsMsg.createMessageComponentCollector({ filter: vsFilter, idle: 45000 });
			
			vsCollector.on('collect', async i => {
				const buttonPressed = i.customId;
				const cmdCalled = buttonPressed.slice(4);
				const cmdCalledArgs = cmdCalled.split(' ');
				const cmdType = cmdCalledArgs[0];

				i.deferUpdate();
				
				if (cmdType === 'mode') {
					vsState.mode = i.values[0];
				}
				else if (cmdType === 'season') {
					vsState.season = i.values[0];
					vsState.mode = 'casual';
				}
				else if (cmdType === 'userselect') {
					vsState[`user${cmdCalledArgs[1]}`] = i.values[0];
				}
				
				const newVsEmbed = await generateVsEmbed(vsState);
				const newVsComponents = generateVsComponents(vsState);
				
				await vsMsg.edit({files: newVsEmbed.embedFiles, embeds: [newVsEmbed.embedMessage], components: newVsComponents, ephemeral: true});
			});
			
			vsCollector.once('end', async function(collected,reason) {
				if (reason === 'idle') {
					const vsMsgComponents = vsMsg.components;
					for (const r of vsMsgComponents) {
						for (const b of r.components) {
							b.data.disabled = true;
						}
					}
					await vsMsg.edit({components: vsMsgComponents, ephemeral: true});
				}
			});
		});
		
	// Resolve promise
	return false;
	}
}

function generateVsComponents(params) {
	let actionRows = [];
	
	const row0 = generateSeasonComponentRow(params.season);
	actionRows.push(row0);
	
	const row1 = generateModeComponentRow(params.season, params.mode);
	actionRows.push(row1);
	
	const row2 = generateUserSelectMenuRow(1,params.user1);
	actionRows.push(row2);
	
	const row3 = generateUserSelectMenuRow(2,params.user2);
	actionRows.push(row3);
	
	return actionRows;
}

function generateSeasonComponentRow(season) {
	const seasonList = getSeasonListQuery().reverse();
	seasonList.splice(1,0,'Career');
	
	let row = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.StringSelectMenuBuilder()
				.setCustomId('!vs season')
				//.setPlaceholder('Select queue')
				.setMinValues(1)
				.setMaxValues(1)
		);
		
	for (const s of seasonList) {
		const seasonLabel = s.includes('current') ? 'Current' : s;
		if (seasonLabel.toLowerCase() === season) {
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`Season: ${seasonLabel}`)	//using RPUGs username since the discord username will have to be fetched- fix this
					.setValue(seasonLabel.toLowerCase())	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
					.setEmoji(getSeasonEmoji(s))
					.setDefault(true)
			);
			continue;
		}
		row.components[0].addOptions(
			new Discord.StringSelectMenuOptionBuilder()
				.setLabel(`Season: ${seasonLabel}`)	//using RPUGs username since the discord username will have to be fetched- fix this
				.setValue(seasonLabel.toLowerCase())	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
				.setEmoji(getSeasonEmoji(s))
				.setDefault(false)
		);
	}
	
	return row;
}

function getSeasonEmoji(season) {
	if (season === 'Career') {
		return '🗂️';
	}
	else {
		return getSeasonEmojiFromMonth(season.slice(4,6));
	}
}

function generateModeComponentRow(season,mode) {
	let modeEmojis = {};
	const seasonModes = getSeasonModesQuery(season).filter(m => m !== 'Scrims');
	
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
				.setCustomId('!vs mode')
				.setMinValues(1)
				.setMaxValues(1)
				/*
				.setOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(`Mode: Casual`)
						.setValue(`casual`)
						.setEmoji(modeEmojis.casual)
						.setDefault(true)
				)
				*/
		);
	
	for (const m of seasonModes) {
		const mLowerCase = m.toLowerCase();
		if (mLowerCase === mode) {
			modeComponentRow.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`Mode: ${m}`)
					.setValue(`${mLowerCase}`)
					.setEmoji(modeEmojis[mLowerCase])
					.setDefault(true),
			);
			continue;
		}
		modeComponentRow.components[0].addOptions(
			new Discord.StringSelectMenuOptionBuilder()
				.setLabel(`Mode: ${m}`)
				.setValue(`${mLowerCase}`)
				.setEmoji(modeEmojis[mLowerCase])
				.setDefault(false),
		);
	}
	
	return modeComponentRow;
}

function generateUserSelectMenuRow(num,user = null) {
	let player;
	if (user) {
		player = getPlayerQuery(user,null);
	}
	
	let row = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.UserSelectMenuBuilder()
				.setCustomId(`!vs userselect ${num}`)
				.setPlaceholder(`${player ? player.playerId + '  ' + player.username : 'Select User'}`)
				.setMinValues(1)
				.setMaxValues(1)
		);
		
	return row;
}

async function generateVsEmbed(params) {
	const seasonDisplayStr = params.season === 'career' ? 'Career': `${capitaliseFirstLetter(params.season)} Season`;
	
	if ((!params.user1) || (!params.user2)) {
		return {
			embedFiles: [],
			embedMessage: {
				color: 0xff0000,
				description: '```' + `\u200b${padSides('Please select both users',34)}\u200b` + '```',
				footer: {
					text: `${seasonDisplayStr}  •  ${capitaliseFirstLetter(params.mode)}`
				}
			}
		};
	}
	
	const vsStats = getVersusStatsQuery(params.user1, params.user2, params.season, params.mode);
	
	if (!vsStats) {
		return {
			embedFiles: [],
			embedMessage: {
				color: 0xff0000,
				description: '```' + `\u200b${padSides('Player/s not found in database',34)}\u200b` + '```',
				footer: {
					text: `${seasonDisplayStr}  •  ${capitaliseFirstLetter(params.mode)}`
				}
			}
		};
	}
	
	const withTotalMatches = vsStats.stats.With.wins + vsStats.stats.With.losses;	
	let withWinPercent = Math.round((100 * vsStats.stats.With.wins) / withTotalMatches);
	withWinPercent = isNaN(withWinPercent) ? '-' : withWinPercent.toString() + "%";
	
	const againstTotalMatches = vsStats.stats.Against.wins + vsStats.stats.Against.losses;	
	let againstWinPercent = Math.round((100 * vsStats.stats.Against.wins) / againstTotalMatches);
	againstWinPercent = isNaN(againstWinPercent) ? '-' : againstWinPercent.toString() + "%";
	
	const delim = "    ";

    let withVal = '```';
	//withVal += `${padSides('With',34)}`
	withVal += `\u200b    M     W     L   ${delim}Win %     `;
	withVal += `\n\u200b  ` + `${padSides(withTotalMatches,5)} ${padSides(vsStats.stats.With.wins,5)} ${padSides(vsStats.stats.With.losses,5)} ${delim}${padSides(withWinPercent,5)}`;
	withVal += '```';
	
	let againstVal = '```';
	//againstVal += `${padSides('Against',34)}`
	againstVal += `\u200b    M     W     L   ${delim}Win %     `;
	againstVal += `\n\u200b  ` + `${padSides(againstTotalMatches,5)} ${padSides(vsStats.stats.Against.wins,5)} ${padSides(vsStats.stats.Against.losses,5)} ${delim}${padSides(againstWinPercent,5)}`;
	againstVal += '```';
	
	const user1AvatarURL = (await bot.users.fetch(vsStats.players.player1.discordId).catch(console.error)).displayAvatarURL();
	const user2AvatarURL = (await bot.users.fetch(vsStats.players.player2.discordId).catch(console.error)).displayAvatarURL();
	
	let vsStatsEmbed = {
		color: 0xff0000,
		author: {
			name: `${vsStats.players.player1.playerId}  ${vsStats.players.player1.username} vs. ${vsStats.players.player2.playerId}  ${vsStats.players.player2.username}`,
			icon_url: `${user1AvatarURL}`
		},
		description: `User 1: <@${vsStats.players.player1.discordId}>\nUser 2: <@${vsStats.players.player2.discordId}>`,
		thumbnail: {
			url: `${user2AvatarURL}`,
		},
		fields: [
			{
				name: `With`,
				value: withVal,
				inline: false,
			},
			{
				name: `Against`,
				value: againstVal,
				inline: false,
			},
		],
		footer: {
			text: `${seasonDisplayStr}  •  ${capitaliseFirstLetter(params.mode)}`
		}
	};
	
	return {
		embedFiles: [],
		embedMessage: vsStatsEmbed
	};
}

export default versus;
