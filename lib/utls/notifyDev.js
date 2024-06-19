import { cmdChannels } from '../index.js';
import cfg from '../../config.js';

async function notifyDev(error,msg = null) {
	const notifMessage = msg ? msg : 'There was an error. Check console.';
	await cmdChannels.modCh.send({content: `<@&${cfg.developerRoleId}> ${notifMessage}`});
	console.log(error);
}

export default notifyDev;
