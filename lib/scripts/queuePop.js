import { sortBy } from "../utls/sortBy.js";
import { Draft, ScrimsDraft } from "../scripts/draftClass.js";
import { logger } from "../";
import { getPlayerRatingStatsQuery, genNewPlayerRatingStatsQuery, getTeamFromTeamNameQuery } from "../queries/index.js";

async function queuePop(queue, mode) {
	if (mode !== "scrims") {
		// Get captains and rest of players
		for (let p of queue) {
			let ratingStats = await getPlayerRatingStatsQuery(p.playerId, 'current', mode);
			if (!ratingStats) {
				ratingStats = await genNewPlayerRatingStatsQuery(p.playerId, mode);
			}
			p.ratingStats = {
				[mode]: ratingStats
			}
		}
		
		const sortParams = {
			'mode': mode,
			sortBy: 'Rating',
			sortOrder: 'descending'
		};
		queue.sort(sortBy(sortParams));
		const captains = [queue[0], queue[1]];
		logger.log("info", `Captains are: ${queue[0].username} and ${queue[1].username}`);
		let remainingPlayers = [];
		//let remainingStr = "";
		for (let i = 2; i < queue.length; i++) {
			remainingPlayers.push(queue[i]);
		}
		const remainingStr = remainingPlayers.map(p => p.username).join(", ");
		logger.log("info", `Remaining players are: ${remainingStr}`);
		new Draft({
			mode: mode,
			captains: captains,
			remainingPlayers: remainingPlayers
		});
	}
	else if (mode === "scrims") {
		const captains = [queue[0], queue[1]];
		logger.log("info", `Captains are: ${queue[0].username} and ${queue[1].username}`);
		for (let p of captains) {
			let ratingStats = await getPlayerRatingStatsQuery(p.scrims.teamId, 'current', 'scrims');
			if (!ratingStats) {
				ratingStats = await genNewPlayerRatingStatsQuery(p.scrims.teamId, 'scrims');
			}
			p.scrims.ratingStats = ratingStats;
		}
		
		const teamA = captains[0].scrims;
		const teamB = captains[1].scrims;
		
		
		new ScrimsDraft({
			mode: mode,
			captains: captains,
			teams: {
				teamA: teamA,
				teamB: teamB
			}
		});
	}
}

export default queuePop;
