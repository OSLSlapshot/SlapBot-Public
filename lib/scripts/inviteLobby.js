import cfg from '../../config.js';
import { createLobby, deleteLobby } from '../queries/slapshot.js';
import notifyDev from '../utls/notifyDev.js';

class InviteLobby {
	constructor() {
		this.lobbyId = null;
	}
	
	async handleLobby() {
		if (this.lobbyId) {
			await this.deleteInviteLobbyCall(this.lobbyId);
			this.lobbyId = null;
		}
		if (!(this.lobbyId)) {
			let lobbyCreateAttempts = 0;
			let response;
			while (lobbyCreateAttempts < 5) {
				response = await this.createInviteLobbyCall();
				if (response.success) {
					break;
				}
				lobbyCreateAttempts += 1;
			}
			if (lobbyCreateAttempts === 5) {
				notifyDev(response, 'Failed to create invite lobby');
			}
		}
		
		setTimeout(async () => {
			await this.handleLobby();
		}, 15*60*1000);	//every 15 minutes
	}
	
	async createInviteLobbyCall() {
		//OCE Slapshot Community Discord: (URL)
		const response = await createLobby({
			"region": "oce-east",
			"name": `OCE Slapshot Community Discord: `,
			"password": `!queue john`,
			"creator_name": "https://slapshot.gg/OSL",
		});
		
		let result;
		try {
			result = JSON.parse(response.body);
		}
		catch (err) {
			result = {
				success: false,
				"error": response.body
			};
		}
		
		if (result.success) {
			this.lobbyId = result.lobby_id;
		}
		
		return result;
	}
	
	async deleteInviteLobbyCall() {
		try {
			const response = await deleteLobby(this.lobbyId);
		}
		catch (err) {
			console.log('Error deleting lobby');
			console.log(err);
		}
	}
}

export default InviteLobby;