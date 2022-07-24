import cfg from '../../config';

/**
 * Helper function to check whether specified user is an administrator.
 * @param  {string}  userID - Discord ID of user.
 * @return {Boolean} - Returns true if the specified user is an administrator.
 *                     Otherwise returns false.
 */
function isMod(userID) {
    for (const admin of cfg.moderators.admins) {
        if (userID === admin) {
            return true;
        }
    }
	return isCommissioner(userID);
}

function isCommissioner(userID) {
	for (const comm of cfg.moderators.commissioners) {
        if (userID === comm) {
            return true;
        }
    }
    return false;
}

export { isMod, isCommissioner };
