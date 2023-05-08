import {
    isCaptain,
    getDraftFromDiscordId,
	getDraftFromIndex,
    formatMessageEndofMatch,
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
	
	if (!response) {
		return {
			responseMessage:
				`Error: An error occured while recording match. Please contact an administrator.`,
			sendToDm: false
		};
	}
	
	if (matchDraft.mode === 'scrims') {
		matchDraft.teamA.newRating = ratingsChange[matchDraft.teamA.teamName].newRating;
		matchDraft.teamA.ratingChange = ratingsChange[matchDraft.teamA.teamName].newRating - ratingsChange[matchDraft.teamA.teamName].previousRating;
		matchDraft.teamB.newRating = ratingsChange[matchDraft.teamB.teamName].newRating;
		matchDraft.teamB.ratingChange = ratingsChange[matchDraft.teamB.teamName].newRating - ratingsChange[matchDraft.teamB.teamName].previousRating;
	}
	else {
		matchDraft.allPlayers.map(p => {
			p.newRating = ratingsChange[p.discordId].newRating;
			p.ratingChange = ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating;
		});
	}

	//matchDraft.allPlayers.casualRating
	//Draft
	//- index, mode, captainsObject, allPlayers, teamA, teamB, nonCaptains, reportedScores
	//ratingsChange has previousRating, and newRating
	
	logger.log('info', `Match reported! Winner is ${matchDraft.reportedScores.teamA}!`);

	removeDraft(matchDraft.index,0);
	
	let teamAval = '';
	let teamBval = '';
	
	if (matchDraft.mode === 'scrims') {
		teamAval += '```';
		teamAval += `${matchDraft.teamA.teamName} (${matchDraft.teamA.newRating}) (${(matchDraft.teamA.ratingChange<=0?"":"+")}${matchDraft.teamA.ratingChange})`;
		teamAval += '```';
		
		teamBval += '```';
		teamBval += `${matchDraft.teamB.teamName} (${matchDraft.teamB.newRating}) (${(matchDraft.teamB.ratingChange<=0?"":"+")}${matchDraft.teamB.ratingChange})`;
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
		for (const player of matchDraft.teamACheckedIn) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
		}
		for (const player of matchDraft.teamBCheckedIn) {
			const playerClient = await bot.users.fetch(player.discordID);
			await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
		}
	}
	else {
		for (const player of matchDraft.allPlayers) {
			const playerClient = await bot.users.fetch(player.discordId);
			await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
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
	
	await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [mrEmbed]}).catch(console.error);
	
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
	
	return;
}

export { reportMatch, adminReportMatch };
