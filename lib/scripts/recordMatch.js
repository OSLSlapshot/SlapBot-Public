import { recordMatchQuery } from '../queries';
import { logger } from '../';

async function recordMatch(match, teamA, teamB, winner, ratingsChange, mode) {
    logger.log('info', 'Recording match...');

    if (winner === 'teamA') {
        var response = await recordMatchQuery(match, teamA, teamB, ratingsChange, mode);
    } else {
        var response = await recordMatchQuery(match, teamB, teamA, ratingsChange, mode);
    }
	
	if (!response) {
		return false;
	}

    // Resolve promise
    return true;
}

export default recordMatch;
