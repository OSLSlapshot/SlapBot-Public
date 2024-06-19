import { isMod } from '../utls/isMod.js';
import { getOngoingDrafts } from '../scripts/draftClass.js';
import { cmdChannels } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';

/**
 * Command to print out the current version of the bot
 *	Syntax: !listDrafts
 */
function listDrafts(msg) {
    const userMessage = msg.content.toLowerCase();
    if ((userMessage === '!listdraft') || (userMessage === '!ld')) {
        if (!isMod(msg.author.id)) {
			// Error - not admin
			return errorMsg("This command is for administrators only.");
		}
		if ((getOngoingDrafts()).length === 0) {
			let activeEmbed = {
				color: 0xf9fc47,
				author: {
					name: `There are currently no active matches.`,
				},
				//description: `Join the queue to start one!`,
			};

			if (msg.channel.name === cmdChannels.modCh.name) {
				return {
					embedMessage: activeEmbed,
					embedFiles: [],
					deleteSenderMessage: false,
				};
			}
			else {
				return {
					embedMessage: activeEmbed,
					embedFiles: [],
					deleteSenderMessage: false,
					sendToDm: true,
				};
			}
		}
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/active.png', {name: 'active.png'}); //from: https://library.kissclipart.com/20181126/ow/kissclipart-clipboard-list-clipart-computer-icons-73bc86e5e04d0fa3.png
		embedFilesList.push(embedThumb);
		
		let activeEmbed = {
			color: 0xf9fc47,
			title: 'List of Active Drafts',
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			fields: []
		};
			
		for (const draft of getOngoingDrafts()) {
			let matchFieldVal = '';
			matchFieldVal += '```';
			matchFieldVal += `Mode: ${capitaliseFirstLetter(draft.mode)}\n`;
			if (draft.gamepass) {matchFieldVal += `Gamepass: ${draft.gamepass}\n`;}
			matchFieldVal += `In Progress: ${draft.matchInProgress}\n`;
			if (draft.draftOrder) {
				matchFieldVal += `Draft Order: ${Object.values(draft.draftOrder).join(' --> ')}\n`
			}
			if (draft.mode === 'scrims') {
				matchFieldVal += `Captains: ${draft.captainsObject[0].username} (${draft.captainsObject[0].scrims.teamName}) [A] | ${draft.captainsObject[1].username} (${draft.captainsObject[1].scrims.teamName}) [B]\n`;
			}
			else {
				matchFieldVal += `Captains: ${draft.captainsObject[0].username} (` + draft.captainsObject[0].ratingStats[`${draft.mode}`].rating + `) [A] | ${draft.captainsObject[1].username} (` + draft.captainsObject[1].ratingStats[`${draft.mode}`].rating + `) [B]\n`;
			}
			matchFieldVal += "```";

			if (draft.index != 1) {
				activeEmbed.fields.push({
					name: `\u200b\nMatch ${draft.index}`,
					value: matchFieldVal,
				});
			} else {
				activeEmbed.fields.push({
					name: `Match ${draft.index}`,
					value: matchFieldVal,
				});
			}

			if (draft.matchInProgress) {
				if (draft.mode === 'scrims') {
					let teamAVal = '';
					teamAVal += '```';
					teamAVal += `${draft.scrims.teams.teamA.teamName}`;
					teamAVal += '```';
					
					let teamBVal = '';
					teamBVal += '```';
					teamBVal += `${draft.scrims.teams.teamB.teamName}`;
					teamBVal += '```';
					
					activeEmbed.fields.push({
						name: `Team A`,
						value: teamAVal,
						inline: true
					});
					activeEmbed.fields.push({
						name: `Team B`,
						value: teamBVal,
						inline: true
					});
				}
				else {
					let teamAVal = '';
					
					draft.teamA.forEach((playerObj) => {
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
					
					activeEmbed.fields.push({
						name: `Team A`,
						value: teamAVal,
						inline: true
					});
					activeEmbed.fields.push({
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
						
					activeEmbed.fields.push({
						name: `Score Reported:`,
						value: score,
					});
				}
			}
			else {
				if (draft.mode === 'scrims') {
					let teamAVal = '';
					teamAVal += '```';
					teamAVal += `${draft.scrims.teams.teamA.teamName}`;
					teamAVal += '```';
					
					let teamBVal = '';
					teamBVal += '```';
					teamBVal += `${draft.scrims.teams.teamB.teamName}`;
					teamBVal += '```';
					
					activeEmbed.fields.push({
						name: `Team A`,
						value: teamAVal,
						inline: true
					});
					activeEmbed.fields.push({
						name: `Team B`,
						value: teamBVal,
						inline: true
					});
				}
				else {
					let playerList = '';

					draft.nonCaptains.forEach((playerObj) => {
						playerList += '```';
						playerList += `${playerObj.username} (` + playerObj.ratingStats[`${draft.mode}`].rating + ')';
						playerList += '```';
					});
					
					activeEmbed.fields.push({
						name: `Other Players:`,
						value: playerList,
					});
				}
			}
		}

		if (msg.channel.name === cmdChannels.modCh.name) {
			return {
				embedMessage: activeEmbed,
				embedFiles: embedFilesList,
				deleteSenderMessage: false,
			};
		}
		else {
			return {
				embedMessage: activeEmbed,
				embedFiles: embedFilesList,
				deleteSenderMessage: false,
				sendToDm: true,
			};
		}
	}
}

export default listDrafts;
