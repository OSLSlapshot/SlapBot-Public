import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import { createPlayer, getPlayerQuery } from '../queries/index.js';
import cfg from '../../config.js';
import { cmdChannels, logger } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';

function Player(discordId, username) {
    this.discordId = discordId;
    this.username = username;
}

/**
 * Removes certain query-dangerous characters from usernames
 * @param {*} username
 */
function sanitize(username) {
    return username
        .split(' ').join('')
        .split('"').join('')
        .split("'").join('')
        .split('\\').join('');
}

/**
 * Command to register a new player to the database
 * Syntax: !register <username>
 */
async function register(msg) {
    const userMessage = msg.content;
    if (userMessage.toLowerCase().startsWith('!register ')) {
        if (enforceWordCount(userMessage, 2)) {
            const username = sanitize(getWord(userMessage, 2));
			
			const letterNumber = /^[\w-.]+$/;
			if(!(username.match(letterNumber))) {
				return errorMsg('Invalid username.','Please only use word characters (letters, numbers, underscores) and/or hyphens/periods, and no other characters, when registering a username.');
			}
			
            // Error - username too long
            if (username.length > 16) {
				return errorMsg(`${username} is too long.`,'Keep under 16 characters.');
            }
            const userId = msg.author.id;
            const newPlayer = new Player(
				userId,
				username
			);
			try {
				//console.log(newPlayer);
				await createPlayer(newPlayer);
			}
			catch (err) {
				const errStr = err.message.toString();
				if (errStr.includes("Field name = discordId")) {
					return errorMsg(`User ID ${userId} has already been registered.`);
				}
				if (errStr.includes("Field name = username")) {
					return errorMsg(
						`Username ${username} has already been registered as ${err.registered_name}.`
					);
				}
				else {
					console.log(`The following error was raised when trying to create new player in player database for username: ${newPlayer.username}, userID: ${newPlayer.userID}.`);
					console.log(err);
					return errorMsg("An error occurred when registering user.", "Please contact developer.");
				}
			}

			// Successful
			logger.log("info", `${userId} has registered as ${username}.`);

			var player = await getPlayerQuery(userId, null);

			let regEmbed = {
				color: 0xc034eb,
				title: "Successfully Registered",
				thumbnail: {
					url: `${msg.author.displayAvatarURL()}`,
				},
				fields: [
					{
						name: "Player ID",
						value: player.playerId,
						inline: true,
					},
					{
						name: `Username`,
						value: player.username,
						inline: true,
					},
					{
						name: 'User',
						value: `${msg.author}`,
						inline: true,
					},
					{
						name: '\u200b',
						value: `*You can now join RPUGs queues in ${cmdChannels.queueCh}!*`
					}
				],
			};

			return {
				embedMessage: regEmbed,
				embedFiles: [],
				deleteSenderMessage: false,
			};
		}

		// Error - Syntax
		return errorMsg('Did NOT register player','Make sure to type:' + '```' + '!register <YourUsername>' + '```' + 'You may use letters, numbers, underscores, hypens and/or periods without spaces.');
    }

	// Resolve promise
	return false;
}

export default register;
