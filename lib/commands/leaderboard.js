import { sortBy } from "../utls/sortBy.js";
import { padStringToWidth } from 'discord-button-width';
import { queryPlayerIdMap, queryTeamIdMap, queryModeRatings, getSeasonModesQuery, getSeasonListQuery } from '../queries/index.js';
import { cmdChannels } from '../index.js';
import cfg from '../../config.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import isBanned from '../utls/isBanned.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import getSeasonEmojiFromMonth from '../utls/seasonEmojis.js';

/**
 * Command to print out the leaderboard of top players
 * Syntax: !leaderboard
 */
 
async function leaderboard(msg) {
	const userMessage = msg.content.toLowerCase().trimEnd();
	const msgAuthorId = msg.author.id;
	//const userArgs = userMessage.split(" ");
	const userArgs = userMessage.match(/\S+/g);	//from here: https://stackoverflow.com/questions/9401897/split-a-string-using-whitespace-in-javascript

	if ((userArgs) && ((userArgs[0] === '!leaderboard') || (userArgs[0] === '!lb'))) {
		if ((msg.guild) && (msg.channel.name !== cmdChannels.commandsCh.name) && (msg.channel.name !== cmdChannels.otherCh.name)) {
			return errorMsg("You cannot use that command here.");
		}
		
		//let startPos = 1;
		let lbState = {
			season: 'current',
			startPos: 1,
			mode: 'casual',
			sortBy: 'Rating',
			sortOrder: 'descending'
		};
		
		const lbButtons = generateLBComponents(lbState);
		
		let lb;
		if (userArgs.length === 1) {
			lb = await generateLB(lbState);
		}
		else if (userArgs.length === 2) {
			if (!/^\d+$/.test(userArgs[1])) {
				return errorMsg("The input must be a number.");
			}
			lbState.startPos = parseInt(userArgs[1]);
			lb = await generateLB(lbState);
		}
		else {
			return errorMsg(
				"Expected 0 or 1 inputs for this command."
			);
		}
		
		await msg.reply({files: lb.embedFiles, embeds: [lb.embedMessage], components: lbButtons, ephemeral: true, allowedMentions: { repliedUser: false}})
		.then( async (lbMsg) => {
			const lbFilter =  (i) => {
				if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
					i.reply({content: "How did you even do this?!", ephemeral: true});
					return false;
				}
				
				if (msgAuthorId !== i.user.id) {
					i.reply({content: "This message is not for you!", ephemeral: true});
					return false;
				}
				
				return true;
			}
			
			const lbCollector = lbMsg.createMessageComponentCollector({ filter: lbFilter, idle: 30000 });
			
			lbCollector.on('collect', async i => {
				const buttonPressed = i.customId;
				const cmdCalled = buttonPressed.slice(4);
				const cmdCalledArgs = cmdCalled.split(' ');
				const cmdType = cmdCalledArgs[0];
				
				i.deferUpdate();
				
				if (cmdType === 'mode') {
					lbState.mode = i.values[0];
				}
				else if (cmdType === 'season') {
					lbState.season = i.values[0];
					lbState.mode = 'casual';
				}
				else if (cmdCalled === 'top') {
					lbState.startPos = 1;
				}
				else if (cmdType === 'up') {
					const newStartPos = lbState.startPos - parseInt(cmdCalledArgs[1]);
					lbState.startPos = newStartPos < 1 ? 1 : newStartPos;
				}
				else if (cmdType === 'down') {
					lbState.startPos = lbState.startPos + parseInt(cmdCalledArgs[1]);
				}
				else if (cmdType === 'sortOrder') {
					lbState.sortOrder = lbState.sortOrder === 'descending' ? 'ascending' : 'descending';
				}
				else if (cmdType === 'sortBy') {
					lbState.sortBy = cmdCalledArgs[1];
				}
				
				const newLb = await generateLB(lbState);
				const newLbButtons = await generateLBComponents(lbState);
				
				await lbMsg.edit({files: newLb.embedFiles, embeds: [newLb.embedMessage], components: newLbButtons, ephemeral: true});
			});
			
			lbCollector.once('end', async function(collected,reason) {
				if (reason === 'idle') {
					const lbMsgComponents = lbMsg.components;
					for (const r of lbMsgComponents) {
						for (const b of r.components) {
							b.data.disabled = true;
						}
					}
					await lbMsg.edit({components: lbMsgComponents, ephemeral: true});
				}
			});
		});
		
	}

	// Resolve promise
	return false;
}

/*
async function leaderboard(msg) {
	const userMessage = msg.content.toLowerCase();
	if (userMessage === "!leaderboard" || userMessage === "!lb") {
		//check if DM
		if (!msg.guild) {
			return errorMsg("You cannot use that command here.");
		}

		//if casual channel, fetch casual data from 1 - 20
		if (msg.channel.name === cmdChannels.casualCh.name) {
			return await displayLB("casual", 1);
		}
		//if twos channel, fetch twos data from 1 - 20
		else if (msg.channel.name === cmdChannels.twosCh.name) {
			return await displayLB("twos", 1);
		} else if (msg.channel.name === cmdChannels.scrimsCh.name) {
			return await displayLB("scrims", 1);
		} else if (msg.channel.name === cmdChannels.foursCh.name) {
			return await displayLB("fours", 1);
		}
		//else error- can't use here
		else {
			return errorMsg("You cannot use that command here.");
		}
	} else if (
		userMessage === "!leaderboardcasual" ||
		userMessage === "!lbc" ||
		userMessage === "!leaderboardtwos" ||
		userMessage === "!lbt" ||
		userMessage === "!leaderboardfours" ||
		userMessage === "!lbf" ||
		userMessage === "!leaderboardscrims" ||
		userMessage === "!lbs"
	) {
		if (userMessage === "!leaderboardcasual" || userMessage === "!lbc") {
			// fetch casual data from 1 - 20
			return await displayLB("casual", 1);
		} else if (userMessage === "!leaderboardtwos" || userMessage === "!lbt") {
			//fetch twos data from 1 - 20
			return await displayLB("twos", 1);
		} else if (userMessage === "!leaderboardfours" || userMessage === "!lbf") {
			//fetch fours data from 1 - 20
			return await displayLB("fours", 1);
		} else {
			return await displayLB("scrims", 1);
		}
	} else if (
		userMessage.startsWith("!leaderboard") ||
		userMessage.startsWith("!lb")
	) {
		if (enforceWordCount(userMessage, 2)) {
			//check second arg is int
			if (!/^\d+$/.test(getWord(userMessage, 2))) {
				return errorMsg("The input must be a number.");
			}

			const calledCmd = getWord(userMessage, 1);

			if (calledCmd === "!leaderboard" || calledCmd === "!lb") {
				//check if DM
				if (!msg.guild) {
					return errorMsg("You cannot use that command here.");
				}

				//if casual channel, fetch casual data from second argument onwards for 20 positions
				if (msg.channel.name === cmdChannels.casualCh.name) {
					return await displayLB("casual", parseInt(getWord(userMessage, 2)));
				}
				//if twos channel, fetch twos data from second argument onwards for 20 positions
				else if (msg.channel.name === cmdChannels.twosCh.name) {
					return await displayLB("twos", parseInt(getWord(userMessage, 2)));
				}
				//if fours channel, fetch fours data from second argument onwards for 20 positions
				else if (msg.channel.name === cmdChannels.foursCh.name) {
					return await displayLB("fours", parseInt(getWord(userMessage, 2)));
				} else if (msg.channel.name === cmdChannels.scrimsCh.name) {
					return await displayLB("scrims", parseInt(getWord(userMessage, 2)));
				}
				//else error- can't use here
				else {
					return errorMsg("You cannot use that command here.");
				}
			} else if (calledCmd === "!leaderboardcasual" || calledCmd === "!lbc") {
				//fetch casual data from second argument onwards for 20 positions
				return await displayLB("casual", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardtwos" || calledCmd === "!lbt") {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB("twos", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardfours" || calledCmd === "!lbf") {
				//fetch fours data from second argument onwards for 20 positions
				return await displayLB("fours", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardscrims" || calledCmd === "!lbs") {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB("scrims", parseInt(getWord(userMessage, 2)));
			} else {
				return errorMsg("Please make sure to type the right command.");
			}
		} else {
			//error- expected 0 or 1 inputs
			return errorMsg(
				"Either this command does not exist, or expected 0 or 1 inputs for this command."
			);
		}
	}

	// Resolve promise
	return false;
}
*/
/*
async function leaderboard(msg) {
	const userMessage = msg.content.toLowerCase();
	if (
		userMessage === "!leaderboardcasual" ||
		userMessage === "!lbc" ||
		userMessage === "!leaderboardtwos" ||
		userMessage === "!lbt" ||
		userMessage === "!leaderboardfours" ||
		userMessage === "!lbf" ||
		userMessage === "!leaderboardscrims" ||
		userMessage === "!lbs"
	) {
		if (userMessage === "!leaderboardcasual" || userMessage === "!lbc") {
			// fetch casual data from 1 - 20
			return await displayLB("casual", 1);
		} else if (userMessage === "!leaderboardtwos" || userMessage === "!lbt") {
			//fetch twos data from 1 - 20
			return await displayLB("twos", 1);
		} else if (userMessage === "!leaderboardfours" || userMessage === "!lbf") {
			//fetch fours data from 1 - 20
			return await displayLB("fours", 1);
		} else {
			return await displayLB("scrims", 1);
		}
	} else if (
		userMessage.startsWith("!leaderboard") ||
		userMessage.startsWith("!lb")
	) {
		if (enforceWordCount(userMessage, 2)) {
			//check second arg is int
			if (!/^\d+$/.test(getWord(userMessage, 2))) {
				return errorMsg("The input must be a number.");
			}

			const calledCmd = getWord(userMessage, 1);

			if (calledCmd === "!leaderboardcasual" || calledCmd === "!lbc") {
				//fetch casual data from second argument onwards for 20 positions
				return await displayLB("casual", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardtwos" || calledCmd === "!lbt") {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB("twos", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardfours" || calledCmd === "!lbf") {
				//fetch fours data from second argument onwards for 20 positions
				return await displayLB("fours", parseInt(getWord(userMessage, 2)));
			} else if (calledCmd === "!leaderboardscrims" || calledCmd === "!lbs") {
				//fetch twos data from second argument onwards for 20 positions
				return await displayLB("scrims", parseInt(getWord(userMessage, 2)));
			} else {
				return errorMsg("Please make sure to type the right command.");
			}
		} else {
			//error- expected 0 or 1 inputs
			return errorMsg(
				"Either this command does not exist, or expected 0 or 1 inputs for this command."
			);
		}
	}

	// Resolve promise
	return false;
}
*/

function generateSeasonComponentRow(season) {
	const seasonList = getSeasonListQuery().reverse();
	
	let row = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.StringSelectMenuBuilder()
				.setCustomId('!lb season')
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
					.setEmoji(getSeasonEmojiFromMonth(s.slice(4,6)))
					.setDefault(true)
			);
			continue;
		}
		row.components[0].addOptions(
			new Discord.StringSelectMenuOptionBuilder()
				.setLabel(`Season: ${seasonLabel}`)	//using RPUGs username since the discord username will have to be fetched- fix this
				.setValue(seasonLabel.toLowerCase())	//this will crash the bot if this.inQueueCheckEnable is false because menu options can't have the same values
				.setEmoji(getSeasonEmojiFromMonth(s.slice(4,6)))
				.setDefault(false)
		);
	}
	
	return row;
}

function generateModeComponentRow(season,mode) {
	let modeEmojis = {};
	const seasonModes = getSeasonModesQuery(season);
	
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
				.setCustomId('!lb mode')
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

function generateLBComponents(params) {
	const sortOrderEmojis = {
		ascending: '⤴️',
		descending: '⤵️'
	};
	//#sortOptions = ['Rating', 'Matches', 'Wins', 'Losses'];
	const sortOptions = {
		Rating: '🇷',
		Matches: '🇲',
		Wins: '🇼',
		Losses: '🇱'
	};
	
	//create buttons for each player
	let buttonRows = [];
	/*
	let modeNames = [];
	let modeEmojis = [];
	for (const m of cfg.modes) {
		modeNames.push(m.modeName);
		modeEmojis.push(m.emoji);
	}
	*/
	const row0 = generateSeasonComponentRow(params.season);
	buttonRows.push(row0);
	
	const row1 = generateModeComponentRow(params.season, params.mode);
	buttonRows.push(row1);
	
	
	const positionButtonWidth = 73;
	
	let row2 = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!lb top`)
				//.setLabel(`\u200b${padStringToWidth('Top',secButtonWidth+4,"center")}\u200b`)
				.setLabel(`\u200b${padStringToWidth('Top',positionButtonWidth,"center")}\u200b`)
				//.setLabel('Top')
				.setEmoji('⏫')
				.setStyle(Discord.ButtonStyle.Secondary)
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!lb up 15`)
				//.setLabel(`\u200b${padStringToWidth('15',secButtonWidth+2,"center")}\u200b`)
				.setLabel(`\u200b${padStringToWidth('15',positionButtonWidth,"center")}\u200b`)
				//.setLabel('15')
				.setEmoji('🔼')
				.setStyle(Discord.ButtonStyle.Secondary)
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!lb down 15`)
				//.setLabel(`\u200b${padStringToWidth('15',secButtonWidth+13,"center")}\u200b`)
				.setLabel(`\u200b${padStringToWidth('15',positionButtonWidth,"center")}\u200b`)
				//.setLabel('15')
				.setEmoji('🔽')
				.setStyle(Discord.ButtonStyle.Secondary)
		);
		
	buttonRows.push(row2);
	
	const sortButtonWidth = 40;
	let row3 = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!lb sortOrder`)
				.setLabel(`\u200b${padStringToWidth('Sort',sortButtonWidth-2,"center")}\u200b`)
				//.setLabel('Sort')
				.setEmoji(sortOrderEmojis[params.sortOrder])
				.setStyle(Discord.ButtonStyle.Secondary)
		)
	for (const [s,e] of Object.entries(sortOptions)) {
		if (s === params.sortBy) {
			row3.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!lb sortBy ${s}`)
					.setLabel(`\u200b${padStringToWidth(`${s}`,sortButtonWidth,"center")}\u200b`)
					//.setLabel(`${s}`)
					.setEmoji(e)
					.setStyle(Discord.ButtonStyle.Secondary)
					.setDisabled(true)
			);
		}
		else {
			row3.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!lb sortBy ${s}`)
					.setLabel(`\u200b${padStringToWidth(`${s}`,sortButtonWidth,"center")}\u200b`)
					//.setLabel(`${s}`)
					.setEmoji(e)
					.setStyle(Discord.ButtonStyle.Secondary)
					.setDisabled(false)
			);
		}
	}
	
	buttonRows.push(row3);
	
	/*
	for (let r = 2; r < 5; r++) {
		let row = new Discord.ActionRowBuilder();
		for (let c = 0; c < 5; c++) {
			const currMode = modeNames[0];
			const currModeLowerCase = currMode.toLowerCase();
			
			if (currModeLowerCase === params.mode) {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!lb ${params.mode}`)
						.setLabel(`\u200b${padStringToWidth(`${currMode}`,secButtonWidth,"center")}\u200b`)
						//.setLabel(`${currMode}`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setEmoji(modeEmojis[0])
						.setDisabled(true)
				)
			}
			else {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!lb ${currModeLowerCase}`)
						.setLabel(`\u200b${padStringToWidth(`${currMode}`,secButtonWidth,"center")}\u200b`)
						//.setLabel(`${currMode}`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setEmoji(modeEmojis[0])
						.setDisabled(false)
				)
			}
			
			modeNames.shift();
			modeEmojis.shift();
			
			if (modeNames.length === 0) {
				break;
			}
		}
		buttonRows.push(row);
		
		if (modeNames.length === 0) {
			break;
		}
	}
	*/
	return buttonRows;
}

async function generateLB(params) {
	const selMode = params.mode;
	// Fetches info for all players from the database
	if (selMode !== 'scrims') {
		const players = queryPlayerIdMap(params.season);
		const ratingData = await queryModeRatings(params.season,selMode);
		
		let ratingDataPlayers = [];
		if (ratingData.length > 0) {
			for (const r of ratingData) {
				const newLen = ratingDataPlayers.push(players[r.playerId]);
				ratingDataPlayers[newLen - 1].ratingStats = {
					[selMode]: r
				}
			}
		}
		
		ratingDataPlayers.sort(sortBy(params));
		
		// Format message
		let count = 0;
		let countLB = 0;
		
		const delim = "  ";
		
		let message = '*Minimum 5 matches played*\n';
		message += '```';
		message += `\u200b${padSides('#',3)} ${'Name'.padEnd(18)}${delim}${padSides('R',4)}${delim} M    W    L \u200b`;
		message += '```';
		message += '```';

		for (const [index, player] of ratingDataPlayers.entries()) {
			const playerStats = player.ratingStats[selMode];
			if (((playerStats.wins + playerStats.losses) >= 5) && (countLB < 15) && (!(isBanned(player.discordId)))) {	//add condition for checking last played- maybe
				count += 1;
				if (count >= params.startPos) {
					//const LP = new Date(player.casualLastPlayed);
					//const LPformat = `${LP.getUTCDate()}/${LP.getUTCMonth() + 1}/${LP.getUTCFullYear()}`;
					
					// Limit to top 15 players to avoid chat overflow
					//message += `${count}.`.padStart(3) + ' ' + player.username.padEnd(20) + delim + `${player.casualRating}`.padEnd(4) + delim + padSides(`${player.casualWins+player.casualLosses}-${player.casualWins}-${player.casualLosses}`,11) + delim + `${LPformat}`.padEnd(10) + `\n`;
					message += '\u200b' + `${count}.`.padStart(3) + ' ' + player.username.padEnd(18) + delim + `${playerStats.rating}`.padEnd(4) + delim + `${padSides(playerStats.wins + playerStats.losses,3)}  ${padSides(playerStats.wins,3)}  ${padSides(playerStats.losses,3)}\u200b\n`;
					countLB += 1;
				}
			}
		}
		message += '```';

		if (message.slice(-6) === "``````") {
			message = message.slice(0, -6);
			message += "\n*Nothing to see here*\n\u200b";
		}

		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/lb.png', {name: 'lb.png'}); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
		embedFilesList.push(embedThumb);

		let lbEmbed = {
			color: 0xd4af37,
			title: padStringToWidth(`RPUGs Leaderboard (#${params.startPos} - #${params.startPos + 14})`,336,"start")+'\u200b',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			description: message,
			footer: {
				text: `${capitaliseFirstLetter(params.season)} Season  •  ${capitaliseFirstLetter(params.mode)}  •  ${capitaliseFirstLetter(params.sortOrder)}  •  By ${params.sortBy}`
			}
		};
		
		// Returns the message to print
		return {
			embedMessage: lbEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	else {
		const players = queryTeamIdMap(params.season);
		const ratingData = await queryModeRatings(params.season,selMode);
		
		let ratingDataPlayers = [];
		if (ratingData.length > 0) {
			for (const r of ratingData) {
				const newLen = ratingDataPlayers.push(players[r.playerId]);
				ratingDataPlayers[newLen - 1].ratingStats = {
					[selMode]: r
				}
			}
		}
		
		ratingDataPlayers.sort(sortBy(params));
		
		// Format message
		let count = 0;
		let countLB = 0;
		
		const delim = "   ";
		
		let message = '*Minimum 1 match played*'.padEnd(60)+'\n';
		message += '```\n';
		message += `${padSides('#',3)} ${'Name'.padEnd(20)}${delim}${padSides('R',4)}${delim} M    W    L \n`;
		message += '```';
		message += '```';

		for (const [index, player] of ratingDataPlayers.entries()) {
			const playerStats = player.ratingStats[selMode];
			if (((playerStats.wins + playerStats.losses) >= 1) && (countLB < 15)) {	//add condition for checking last played- maybe
				count += 1;
				if (count >= params.startPos) {
					message += `${count}.`.padStart(3) + ' ' + player.teamName.replace(/_/g,' ').padEnd(20) + delim + `${playerStats.rating}`.padEnd(4) + delim + `${padSides(playerStats.wins + playerStats.losses,3)}  ${padSides(playerStats.wins,3)}  ${padSides(playerStats.losses,3)}\n`;
					countLB += 1;
				}
			}
		}
		message += '```';

		if (message.slice(-6) === "``````") {
			message = message.slice(0, -6);
			message += "\n*Nothing to see here*\n\u200b";
		}

		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/OSLLogo.jpg', {name: 'OSLLogo.jpg'}); //from:
		embedFilesList.push(embedThumb);

		let lbEmbed = {
			color: 0xd4af37,
			title: padStringToWidth(`Scrims RPUGs Leaderboard (#${params.startPos} - #${params.startPos + 14})`,340,"start")+'\u200b',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			description: message,
			footer: {
				text: `${capitaliseFirstLetter(params.sortOrder)}  •  By ${params.sortBy}  •  ${capitaliseFirstLetter(params.mode)}`
			}
		};
		
		// Returns the message to print
		return {
			embedMessage: lbEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	//Resolve promise
	return false;
}

export default leaderboard;
