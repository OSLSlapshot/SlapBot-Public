import { sortByRatings, sortByRatingsTwos } from '../utls/sortByRatings';
import { Draft, TwosDraft,ScrimsDraft } from '../scripts/draftClass';
import { logger } from '../';
import { getTeamFromTeamNameQuery } from '../queries';

async function queuePop(queue, mode) {
    if (mode === 'casual') {
        // Get captains and rest of players
        queue.sort(sortByRatings);
        const captains = [queue[0], queue[1]];
        logger.log('info', `Captains are: ${queue[0].username} and ${queue[1].username}`)
        const remainingPlayers = [queue[2], queue[3], queue[4], queue[5]];
        logger.log('info', `Remaining players are: ${queue[2].username}, ${queue[3].username}, ${queue[4].username}, and ${queue[5].username}`);
        new Draft(captains, remainingPlayers, mode);
    }
	else if (mode === 'twos') {
        // Get captains and rest of players
		queue.sort(sortByRatingsTwos);
        const captains = [queue[0], queue[1]];
        logger.log('info', `Captains are: ${queue[0].username} and ${queue[1].username}`)
        const remainingPlayers = [queue[2], queue[3]];
        logger.log('info', `Remaining players are: ${queue[2].username}, ${queue[3].username}`);
        new TwosDraft(captains, remainingPlayers, mode);
    }
	else if (mode === 'scrims') {
		const captains = [queue[0], queue[1]];
		logger.log('info', `Captains are: ${queue[0].username} and ${queue[1].username}`);
		const teamA = await getTeamFromTeamNameQuery(captains[0].OSLteam);
		const teamB = await getTeamFromTeamNameQuery(captains[1].OSLteam);
		new ScrimsDraft(captains,teamA,teamB);
	}
}

export default queuePop;
