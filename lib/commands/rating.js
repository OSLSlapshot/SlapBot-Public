import { getPlayerFromDiscordIdQuery, getPlayerFromUsernameQuery } from '../queries';
import enforceWordCount from '../utls/enforceWordCount';
import getWord from '../utls/getWord';
import { round } from 'mathjs';
import padSides from '../utls/padSides';
import Discord from 'discord.js';
import { bot } from '../';
import errorMsg from '../scripts/errorMessage';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
async function rating(msg) {
    const userMessage = msg.content;
	const userMessageLower = userMessage.toLowerCase();
    if ((userMessageLower === '!rating') || (userMessageLower === '!r') || (userMessageLower === '!stats')) {
		var player = await getPlayerFromDiscordIdQuery(msg.author.id);
		
		if (player == null) {
			return errorMsg('Could not find you in the database.');
		}
	}
	
	else if ((userMessageLower.startsWith('!rating ')) || (userMessageLower.startsWith('!r ')) || (userMessageLower.startsWith('!stats '))) {
		if (enforceWordCount(userMessage,2)) {
			var player = await getPlayerFromUsernameQuery(getWord(userMessage,2));
			
			if (player == null) {
				return errorMsg(`Could not find ${getWord(userMessage,2)} in the database.`);
			}
		}
		else {
			// Error Syntax
			return errorMsg('Expected 0 or 1 inputs for this command.');
		}
	}
	// Success
	if (player) {
		const totalOM = player.casualWins + player.casualLosses;
		const totalPM = player.twosWins + player.twosLosses;
		const totalW = player.casualWins + player.twosWins;
		const totalL = player.casualLosses + player.twosLosses;
		
		let tWpercent = Math.round(100*totalW/(totalOM + totalPM));
		if (isNaN(tWpercent)) {
			tWpercent = '-';
		}
		else {
			tWpercent = tWpercent.toString() + '%';
		}
		
		const OLP = new Date(player.casualLastPlayed);
		if (!isNaN(OLP)) {
			OLP.setHours(OLP.getHours() - 10); //AEST
			var OLPformat = `${OLP.getDate()}/${OLP.getMonth() + 1}/${OLP.getFullYear()}`;
		}
		else {
			var OLPformat = '-'; 
		}
		
		let oWpercent = Math.round(100*player.casualWins/totalOM);
		if (isNaN(oWpercent)) {
			oWpercent = '-';
		}
		else {
			oWpercent = oWpercent.toString() + '%';
		}
		
		//embed fields and formatting
		const delim = "    ";
		
		let careerMsgVal = '';
		careerMsgVal += '```\n';
		careerMsgVal += ` M   W   L ` + delim + `Win %`;
		careerMsgVal += `\n` + `${padSides(totalOM + totalPM,3)} ${padSides(totalW,3)} ${padSides(totalL,3)}` + delim + `${padSides(tWpercent,5)}` ;
		careerMsgVal += '\n```';
		
		let casualMsgVal = '```\n';
		casualMsgVal += `Rating: ${player.casualRating}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\n   M   W   L ` + delim + `Win %  `;
		casualMsgVal += `\n  ` + `${padSides(totalOM,3)} ${padSides(player.casualWins,3)} ${padSides(player.casualLosses,3)}` + delim + `${padSides(oWpercent,5)}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\nLast Played: ${OLPformat} `;
		casualMsgVal += '\n```';
		
		let embedFilesList = [];
		const embedThumb = new Discord.MessageAttachment('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		embedFilesList.push(embedThumb);
		
		const userAvatarURL = (await bot.users.fetch(player.discordId).catch(console.error)).displayAvatarURL();
		
		let statsEmbed = {
			color: 0x34eb4c,
			author: {
				name: `${player.playerID}  ${player.username}`,
				icon_url: `${userAvatarURL}`
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			fields: [
				{
					name: 'RPUGs Career',
					value: careerMsgVal
				},
				{
					name: `Casual RPUGs`,
					value: casualMsgVal,
					inline: true
				},
			],
		};
		
		//if (totalPM > 0) {
		const PLP = new Date(player.twosLastPlayed);
		PLP.setHours(PLP.getHours() - 10); //AEST
		const PLPformat = `${PLP.getDate()}/${PLP.getMonth() + 1}/${PLP.getFullYear()}`;
		
		let twosMsgVal = '```\n';
		twosMsgVal += `Rating: ${player.twosRating}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\n   M   W   L ` + delim + `Win %  `;
		twosMsgVal += `\n  ${padSides(totalPM,3)} ${padSides(player.twosWins,3)} ${padSides(player.twosLosses,3)}${delim}${padSides(Math.round(100*player.twosWins/totalPM),5)}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\nLast Played: ${PLPformat}`;
		twosMsgVal += '\n```';

		statsEmbed.fields.push({
				name: 'Twos RPUGs',
				value: twosMsgVal,
				inline: true,
			});
		//}
		
		return {
			embedMessage: statsEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
}

export default rating;
