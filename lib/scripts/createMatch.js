import { createMatchQuery } from '../queries/index.js';
import { logger } from '../index.js';

async function createMatch(mode) {
    logger.log('info', 'Creating match...');
	
    const response = await createMatchQuery(mode);
    //const matchID = response.matchId;

    // Resolve promise
    return response;
}

export default createMatch;
