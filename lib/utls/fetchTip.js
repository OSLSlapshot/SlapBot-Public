import fs from 'fs';
import { random } from 'mathjs';

/**
 * Helper function to check whether specified user is an administrator.
 * @param  {string}  userID - Discord ID of user.
 * @return {Boolean} - Returns true if the specified user is an administrator.
 *                     Otherwise returns false.
 */
function fetchTip() {
    
	try {
		var data = fs.readFileSync('./Database/serverTips.txt', 'utf8');
		data = data.split('\n');
	}
	catch (e) {
		console.log(e);
	}
	
	const selTip = data[Math.floor(Math.random()*data.length)]

	return selTip;
}

export default fetchTip;
