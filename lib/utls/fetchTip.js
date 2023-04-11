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
		data = data.map(line => line.split('\t'));
	}
	catch (e) {
		console.log(e);
	}
	
	const allTips = {
		1: data.filter(row => row[0] === '1'),
		2: data.filter(row => row[0] === '2'),
		3: data.filter(row => row[0] === '3')
	};
	
	let selTip;
	while (!selTip) {
		const tipRoll = Math.random();
		const tipGroup = (tipRoll < 0.15) ? 3 : (tipRoll < 0.5) ? 2 : 1;

		const selTipGroup = allTips[tipGroup];
		if (selTipGroup.length !== 0) {
			selTip = selTipGroup[Math.floor(Math.random()*selTipGroup.length)][1];
		}
	}
	
	return selTip;
}

export default fetchTip;
