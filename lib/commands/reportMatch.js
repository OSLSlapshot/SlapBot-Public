import {
    isCaptain,
    getDraftFromDiscordId,
	getDraftFromIndex,
    removeDraft
} from '../scripts/draftClass.js';
import updatePlayerRatings from '../scripts/updatePlayerRatings.js';
import createMatch from '../scripts/createMatch.js';
import recordMatch from '../scripts/recordMatch.js';
import { isMod } from '../utls/isMod.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import { bot, logger, cmdChannels } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
/*
async function reportMatch(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage.startsWith('!matchreport ')) || (userMessage.startsWith('!mr '))) {
        // Action
        if (enforceWordCount(userMessage, 2)) {
            if (isCaptain(msg.author.id)) {
				var currentDraft = getDraftFromDiscordId(msg.author.id);
				if (currentDraft.matchInProgress) {
					//check if DM
					if (!msg.guild) {
						return errorMsg('You cannot use that command here.');
					}
					
					const winOrLoss = getWord(userMessage, 2);
					var currentTeam;
					if (currentDraft.captainsObject[0].discordId === msg.author.id) {
						currentTeam = 'teamA';
						var currCaptain = currentDraft.captainsObject[0];
						var othCaptain = currentDraft.captainsObject[1];
					} else if (currentDraft.captainsObject[1].discordId === msg.author.id) {
						currentTeam = 'teamB';
						var currCaptain = currentDraft.captainsObject[1];
						var othCaptain = currentDraft.captainsObject[0];
					}
					else {
						// Error
						return errorMsg('Something went wrong.','Contact a developer or admin.');
					}
					
					var otherTeam = currentTeam === 'teamA' ? 'teamB' : 'teamA';

					if ((winOrLoss === 'win') || (winOrLoss === 'w')) {
						if (!currentDraft.reportedScores[currentTeam]) {
							currentDraft.reportedScores[currentTeam] = currentTeam;
							// following line is temporary for testing- remove later
							//currentDraft.reportedScores[otherTeam] = currentTeam;
						} else {
							return errorMsg('You have already reported the match.');
						}
					}
					else if ((winOrLoss === 'loss') || (winOrLoss === 'l')) {
						if (!currentDraft.reportedScores[currentTeam]) {
							currentDraft.reportedScores[currentTeam] = otherTeam;
							// following line is temporary for testing- remove later
							//currentDraft.reportedScores[otherTeam] = otherTeam;
						} else {
							return errorMsg('You have already reported the match.');
						}
					}
					else {
						// Error - not win or loss
						return errorMsg('Did NOT report match.','Make sure to type:' + '```' + '!mr < W | L >' + '```');
					}
				}
				else {
					// Error: Match is not ongoing
					return errorMsg('Did NOT report match.','Match has not started yet.');
				}
			}
			else {
				// Error - not captain
				return errorMsg('You are not a captain for any ongoing matches.','Only captains can report scores.');
			}
		}
		else {
			// Error - Syntax
			return errorMsg('Did NOT report match.','Make sure to type:' + '```' + '!mr < W | L >' + '```');
		}
				
		// Both teams have reported scores.
		if (currentDraft.reportedScores.teamA && currentDraft.reportedScores.teamB) {
			// Score is the same
			if (
				currentDraft.reportedScores.teamA === currentDraft.reportedScores.teamB
			) {
				//UpdataDatabase
				return await updateDatabaseWithMatch(currentDraft,false,false);
			}
			else {
				currentDraft.reportedScores = {}; // reset
				const errorMsgEmbed = errorMsg('Match reports from both captains conflict.','Please contact an administrator, or try reporting the match again.');
				await currentDraft.captainsClient[otherTeam].send({ files: errorMsgEmbed.embedFiles, embeds: [errorMsgEmbed.embedMessage]}).catch(console.error);
				await currentDraft.captainsClient[currentTeam].send({ files: errorMsgEmbed.embedFiles, embeds: [errorMsgEmbed.embedMessage]}).catch(console.error);
				return errorMsgEmbed;
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
			
			const SREmbed = {
						color: 0xc261fa,
						author: {
							name: `${currCaptain.username} has reported the match.`,
							icon_url: currentDraft.captainsClient[currentTeam].displayAvatarURL()
						},
						description: `Waiting for ${othCaptain.username} to also report the match...` + '\n' + '*Please type* **!mr < W | L >** *to report.*',
						fields: [
							{
								name: 'Score reported',
								value: winLoss,
							}
						]
					};
					
			if (currentDraft.mode === 'scrims') {
				SREmbed.author.name = `${currCaptain.username} (${currCaptain.OSLteam}) has reported the match.`;
				SREmbed.description = `Waiting for ${othCaptain.username} (${othCaptain.OSLteam}) to also report the match...` + '\n' + '*Please type* **!mr < W | L >** *to report.*';
			}
					
			return {
				embedMessage: SREmbed,
				//embedFiles: embedFilesList,
				sendToDm: false
			};
		}	
    }
    // Resolve promise
    return false;
}
*/
async function adminReportMatch(msg) {
	const userMessage = msg.content.toLowerCase();
    if ((userMessage.startsWith('!adminreport ')) || (userMessage.startsWith('!ar '))) {
        // Action
        if (enforceWordCount(userMessage, 3)) {
            if (isMod(msg.author.id)) {
				var currentDraft = getDraftFromIndex(Number(getWord(userMessage, 2)));
				//check draft was successfully found- must check bool value as index could be 0
				if (currentDraft === false) {
					return errorMsg('No matching index.',null,true);
				}
				
				if (!currentDraft.matchInProgress) {
					return errorMsg('Match teams have not been drafted yet.');
				}
				
				//winner
				if (getWord(userMessage, 3) === 'a') {
					currentDraft.reportedScores.teamA = 'teamA';
					currentDraft.reportedScores.teamB = 'teamA';
				}
				else if (getWord(userMessage, 3) === 'b') {
					currentDraft.reportedScores.teamA = 'teamB';
					currentDraft.reportedScores.teamB = 'teamB';
				}
				else {
					return errorMsg('Please enter a valid team (A or B).',null,true);
				}
				
				if (!msg.guild) {
					var isDM = true;
				}
				else { var isDM = false; }
				
			}
			else {
				// Error - not admin
				return errorMsg('This command is for administrators only.');
			}
		}
		
		else {
			// Error - Syntax
			return errorMsg('Did NOT report match.','Make sure to type:' + '```' + '!ar <index> <team>' + '```',true);
		}
		
		//UpdataDatabase
		return await updateDatabaseWithMatch(currentDraft,isDM,msg.author);
    }
    // Resolve promise
    return false;
}

async function updateDatabaseWithMatch(matchDraft,isDM,adminAuthor) {
	// Update database
	const currentMatch = await createMatch(matchDraft.mode);
	/*
	const ratingsChange = await updatePlayerRatings(
		currentMatch,
		matchDraft.teamA,
		matchDraft.teamB,
		matchDraft.reportedScores.teamA,
		matchDraft.mode
	);

	const response = await recordMatch(
		currentMatch,
		matchDraft.teamA,
		matchDraft.teamB,
		matchDraft.reportedScores.teamA,
		ratingsChange,
		matchDraft.mode
	);
	*/
	let ratingsChange;
	let response;
	if (matchDraft.mode === 'scrims') {
		ratingsChange = await updatePlayerRatings(
			currentMatch,
			matchDraft.scrims.teams.teamA,
			matchDraft.scrims.teams.teamB,
			matchDraft.reportedScores.teamA,
			matchDraft.mode
		);
		
		response = await recordMatch(
			currentMatch,
			[matchDraft.scrims.teams.teamA],
			[matchDraft.scrims.teams.teamB],
			matchDraft.reportedScores.teamA,
			ratingsChange,
			matchDraft.mode
		);
	}
	else {
		ratingsChange = await updatePlayerRatings(
			currentMatch,
			matchDraft.teamA,
			matchDraft.teamB,
			matchDraft.reportedScores.teamA,
			matchDraft.mode
		);
		
		response = await recordMatch(
		currentMatch,
			matchDraft.teamA,
			matchDraft.teamB,
			matchDraft.reportedScores.teamA,
			ratingsChange,
			matchDraft.mode
		);
	}
	
	if (!response) {
		return {
			responseMessage:
				`Error: An error occured while recording match. Please contact an administrator.`,
			sendToDm: false
		};
	}
	
	if (matchDraft.mode === 'scrims') {
		matchDraft.scrims.teams.teamA.ratingStats.newRating = ratingsChange[matchDraft.scrims.teams.teamA.teamId].newRating;
		matchDraft.scrims.teams.teamA.ratingStats.ratingChange = ratingsChange[matchDraft.scrims.teams.teamA.teamId].newRating - ratingsChange[matchDraft.scrims.teams.teamA.teamId].previousRating;
		matchDraft.scrims.teams.teamB.ratingStats.newRating = ratingsChange[matchDraft.scrims.teams.teamB.teamId].newRating;
		matchDraft.scrims.teams.teamB.ratingStats.ratingChange = ratingsChange[matchDraft.scrims.teams.teamB.teamId].newRating - ratingsChange[matchDraft.scrims.teams.teamB.teamId].previousRating;
	}
	else {
		matchDraft.allPlayers.map(p => {
			p.newRating = ratingsChange[p.playerId].newRating;
			p.ratingChange = ratingsChange[p.playerId].newRating - ratingsChange[p.playerId].previousRating;
		});
	}

	//matchDraft.allPlayers.casualRating
	//Draft
	//- index, mode, captainsObject, allPlayers, teamA, teamB, nonCaptains, reportedScores
	//ratingsChange has previousRating, and newRating
	
	logger.log('info', `Match reported! Winner is ${matchDraft.reportedScores.teamA}!`);

	const reportMsg = matchDraft.singleReportMsg;
	await removeDraft(matchDraft.index,0);
	
	let teamAval = '';
	let teamBval = '';
	
	if (matchDraft.mode === 'scrims') {
		teamAval += '```';
		teamAval += `${matchDraft.scrims.teams.teamA.teamName} (${matchDraft.scrims.teams.teamA.ratingStats.newRating}) (${(matchDraft.scrims.teams.teamA.ratingStats.ratingChange<=0?"":"+")}${matchDraft.scrims.teams.teamA.ratingStats.ratingChange})`;
		teamAval += '```';
		
		teamBval += '```';
		teamBval += `${matchDraft.scrims.teams.teamB.teamName} (${matchDraft.scrims.teams.teamB.ratingStats.newRating}) (${(matchDraft.scrims.teams.teamB.ratingStats.ratingChange<=0?"":"+")}${matchDraft.scrims.teams.teamB.ratingStats.ratingChange})`;
		teamBval += '```';
	}
	else {
		matchDraft.teamA.forEach((player) => {
			teamAval += '```';
			teamAval += `${player.username} (${player.newRating}) (${(player.ratingChange<=0?"":"+")}${player.ratingChange})`;
			teamAval += '```';
		});
		
		matchDraft.teamB.forEach((player) => {
			teamBval += '```';
			teamBval += `${player.username} (${player.newRating}) (${(player.ratingChange<=0?"":"+")}${player.ratingChange})`;
			teamBval += '```';
		});
	}
	
	let embedFilesList = [];
	const embedThumb = new Discord.AttachmentBuilder('./thumbnails/reportMatch.png', {name: 'reportMatch.png'}); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
	embedFilesList.push(embedThumb);

	let mrEmbed = {
		//color: 0x0ee64b,
		color: 0x9ddb8f,
		author: {
			name: 'Match reported',
			icon_url: 'attachment://' + embedThumb.name
		},
		title: `The winner is Team ${matchDraft.reportedScores.teamA.substring(4)}!`,
		//add thumbnail for team winner (A or B)
		//thumbnail: {
		//	url: 'attachment://' + embedThumb.name
		//},
		description: '```Mode: ' + `${matchDraft.mode.charAt(0).toUpperCase()+matchDraft.mode.slice(1)}` + '```*The ratings shown below are the new ratings.*',
		fields: [
			{
				name: 'Team A',
				value: teamAval
			},
			{
				name: 'Team B',
				value: teamBval
			}
		]
	};
	
	if (matchDraft.mode === 'scrims') {
		for (const player of matchDraft.checkIn.checkInState.scrims.teamA.playersCheckedIn) {
			try {
				const playerClient = await bot.users.fetch(player.discordId);
				await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
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
		for (const player of matchDraft.checkIn.checkInState.scrims.teamB.playersCheckedIn) {
			try {
				const playerClient = await bot.users.fetch(player.discordId);
				await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
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
		for (const player of matchDraft.allPlayers) {
			try {
				const playerClient = await bot.users.fetch(player.discordId);
				await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
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
	
	/*
	if (isDM) {
		if (matchDraft.mode === 'casual') {
			await cmdChannels.casualCh.send({ files: embedFilesList, embeds: mrEmbed}).catch(console.error);
		}
		else if (matchDraft.mode === 'league') {
			await cmdChannels.leagueCh.send({ files: embedFilesList, embeds: mrEmbed}).catch(console.error);
		}
	}
	*/
	if (reportMsg) {
		await reportMsg.edit({ files: embedFilesList, embeds: [mrEmbed]});
	}
	else {
		await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [mrEmbed]});
	}
	
	//match was admin-reported
	if (adminAuthor) {
		mrEmbed.footer = {
			text: `Match was reported by Admin ${adminAuthor.id	} ${adminAuthor.username}.`,
			icon_url: adminAuthor.displayAvatarURL(),
		}
		await cmdChannels.modCh.send({ files: embedFilesList, embeds: [mrEmbed]}).catch(console.error);
		delete mrEmbed.footer;
	}
	
	if (isDM) {
		return {
			embedMessage: mrEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	/*
	return {
		embedMessage: mrEmbed,
		embedFiles: embedFilesList,
		deleteSenderMessage: false
	};
	*/
	//return;
}

export { updateDatabaseWithMatch, adminReportMatch };
