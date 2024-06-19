import cfg from '../../config.js';

/**
 * Helper function to check whether specified user is a streamer.
 * @param  {string}  userID - Discord ID of user.
 * @return {Boolean} - Returns true if the specified user is a streamer.
 *                     Otherwise returns false.
 */
function isStreamer(userID) {
    for (const s of cfg.streamers) {
        if (userID === s) {
            return true;
        }
    }
	return false;
}

export default isStreamer;
