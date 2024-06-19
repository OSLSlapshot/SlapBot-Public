import { cmdChannels, logger, bot } from '../index.js';
import { isMod } from '../utls/isMod.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import stripUsername from '../utls/stripUsername.js';
import { getModeInfo, getPlayerQuery, getPlayerRatingStatsQuery, genNewPlayerRatingStatsQuery } from '../queries/index.js';
import createMatch from '../scripts/createMatch.js';
import updatePlayerRatings from '../scripts/updatePlayerRatings.js';
import recordMatch from '../scripts/recordMatch.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to print out the current version of the bot
 *  Syntax: !removeDraft
 */
 
class SimulationDraft {
    constructor(captains, winTeam, lossTeam, mode, matchTime) {
        this.mode = mode;
        this.captainsObject = captains;
        this.allPlayers = [...winTeam, ...lossTeam];
        this.teamA = winTeam;
        this.teamB = lossTeam;
        this.nonCaptains = [...winTeam.slice(1), ...lossTeam.slice(1)];
        this.matchInProgress = true;
        this.reportedScores = {};
		this.matchTime = matchTime;
	}
}
 
async function simulate(msg) {
	const commandCalls = ['!simulate'];
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		//if (!isCommissioner(msg.author.id)) {
		if (!isMod(msg.author.id)) {
			 // Error - not commissioner
			return errorMsg('This command is for admins only.',null,true);
		}
		
		if (userMessage.length !== 4) {
			return errorMsg('Expected 3 inputs for this command.', 'The syntax is:\n`!simulate <mode> <winCaptain,winner2,...> <lossCaptain,loser2,...>`',null,false);
		}
		
		const mode = userMessage[1].toLowerCase();
		const modeInfo = getModeInfo(mode);
		if (!modeInfo) {
			return errorMsg('Invalid mode.',null,true);
		}
		else if (modeInfo.retired) {
			return errorMsg('Invalid mode.',null,true);
		}
		
		const winUsernames = userMessage[2].split(',').map(u => u.trim());
		const lossUsernames = userMessage[3].split(',').map(u => u.trim());
		
		let matchTime = new Date(); //UTC
		matchTime.setHours(matchTime.getHours() + 10); //AEST
		matchTime = matchTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ
		
		const matchWinner = 'teamA';

		let captains = [];
		let winners = [];
		let losers = [];
		
		for (let i = 0; i < winUsernames.length; i++) {
			const player = await getPlayerQuery(null,winUsernames[i]);
			if (!player) {
				return errorMsg(`Could not find player ${winUsernames[i]} in the database.`,null,true);
			}
			let ratingStats = await getPlayerRatingStatsQuery(player.playerId, 'current', mode);
			if (!ratingStats) {
				ratingStats = await genNewPlayerRatingStatsQuery(player.playerId, mode);
			}
			player.ratingStats = {
				[mode]: ratingStats
			}
			if (i === 0) {
				captains.push(player);
			}
			winners.push(player);
		}
		for (let i = 0; i < lossUsernames.length; i++) {
			const player = await getPlayerQuery(null,lossUsernames[i]);
			if (!player) {
				return errorMsg(`Could not find player ${lossUsernames[i]} in the database.`,null,true);
			}
			let ratingStats = await getPlayerRatingStatsQuery(player.playerId, 'current', mode);
			if (!ratingStats) {
				ratingStats = await genNewPlayerRatingStatsQuery(player.playerId, 'twos');
			}
			player.ratingStats = {
				[mode]: ratingStats
			}
			if (i === 0) {
				captains.push(player);
			}
			losers.push(player);
		}
		
		const matchDraft = new SimulationDraft(captains, winners, losers, mode, matchTime);
		
		matchDraft.reportedScores.teamA = matchWinner;
		matchDraft.reportedScores.teamB = matchWinner;

		await updateDatabaseWithMatch(matchDraft);
		
		logger.log('info', `Match simulated by Commissioner ${msg.author.id} ${msg.author.username}. Winner is ${matchDraft.reportedScores.teamA}!`);
		
		let teamAval = '';
		let teamBval = '';
		/*
		if (matchDraft.mode === 'scrims') {
			teamAval += '```';
			teamAval += `${matchDraft.teamA.teamName} (${matchDraft.teamA.newRating}) (${(matchDraft.teamA.ratingChange<=0?"":"+")}${matchDraft.teamA.ratingChange})`;
			teamAval += '```';
			
			teamBval += '```';
			teamBval += `${matchDraft.teamB.teamName} (${matchDraft.teamB.newRating}) (${(matchDraft.teamB.ratingChange<=0?"":"+")}${matchDraft.teamB.ratingChange})`;
			teamBval += '```';
		}
		else {
		*/
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
		//}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/reportMatch.png', {name: 'reportMatch.png'}); //from: https://images.emojiterra.com/twitter/512px/1f3c6.png
		embedFilesList.push(embedThumb);

		let mrEmbed = {
			color: 0x9ddb8f,
			author: {
				name: 'Match simulated',
				icon_url: 'attachment://' + embedThumb.name
			},
			title: `The winner is Team A!`,
			description: '```Mode: ' + `${capitaliseFirstLetter(mode)}` + '```*The ratings shown below are the new ratings.*',
			fields: [
				{
					name: 'Team A',
					value: teamAval
				},
				{
					name: 'Team B',
					value: teamBval
				}
			],
			footer: {
				text: `Match was simulated by Admin ${msg.author.id} ${msg.author.username}.`,
				icon_url: msg.author.displayAvatarURL(),
			}
		};
		/*
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
		*/
		for (const player of matchDraft.allPlayers) {
			const playerClient = await bot.users.fetch(player.discordId);
			await playerClient.send({ files: embedFilesList, embeds: [mrEmbed]});
		}
		//}
		
		await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [mrEmbed]});
		await cmdChannels.modCh.send({ files: embedFilesList, embeds: [mrEmbed]});
		
		return;       
    }
}

async function updateDatabaseWithMatch(matchDraft) {
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
		console.log('Error in updateDatabaseWithMatch()');
	}
	
	/*
	if (matchDraft.mode === 'scrims') {
		matchDraft.teamA.newRating = ratingsChange[matchDraft.teamA.teamName].newRating;
		matchDraft.teamA.ratingChange = ratingsChange[matchDraft.teamA.teamName].newRating - ratingsChange[matchDraft.teamA.teamName].previousRating;
		matchDraft.teamB.newRating = ratingsChange[matchDraft.teamB.teamName].newRating;
		matchDraft.teamB.ratingChange = ratingsChange[matchDraft.teamB.teamName].newRating - ratingsChange[matchDraft.teamB.teamName].previousRating;
	}
	else {
	*/
	matchDraft.allPlayers.map(p => {
		p.newRating = ratingsChange[p.playerId].newRating;
		p.ratingChange = ratingsChange[p.playerId].newRating - ratingsChange[p.playerId].previousRating;
	});
	//}
	
	return;
}

export default simulate;