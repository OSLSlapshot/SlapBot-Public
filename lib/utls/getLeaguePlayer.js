import { getLeaguePlayerFromDiscordIdQuery } from '../queries';

/**
 * Helper function to check whether specified user is an administrator.
 * @param  {string}  userID - Discord ID of user.
 * @return {Boolean} - Returns true if the specified user is an administrator.
 *                     Otherwise returns false.
 */
async function getLeaguePlayer(userID) {
	return await getLeaguePlayerFromDiscordIdQuery(userID);
}

export default getLeaguePlayer;
