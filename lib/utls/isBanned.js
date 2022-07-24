import fs from 'fs';

/**
 * Helper function to check whether specified user is an administrator.
 * @param  {string}  userID - Discord ID of user.
 * @return {Boolean} - Returns true if the specified user is an administrator.
 *                     Otherwise returns false.
 */
function isBanned(userID) {
    
	try {
		var data = fs.readFileSync('./Database/banned.txt', 'utf8');
		data = data.split('\n');
	}
	catch (e) {
		console.log(e);
	}
	for (const id of data) {
        if (userID === id) {
            return true;
        }
    }
	return false;
}

export default isBanned;
