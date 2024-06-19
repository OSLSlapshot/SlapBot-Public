import sleep from './sleep.js';

async function waitForIt(theThing, time) {
	let waited = 0;
	
	while (!theThing) {
		await sleep(500);
		waited++;
		if (waited > (2*time)) {	//waited longer than 30 seconds
			break;
		}
	}
}

export default waitForIt;
