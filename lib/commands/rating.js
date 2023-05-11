import { getPlayerFromDiscordIdQuery, getPlayerFromDiscordIdQueryMoreInfo, getPlayerCareerFromDiscordIdQuery, getPlayerFromUsernameQuery, getPlayerFromUsernameQueryMoreInfo, getPlayerCareerFromUsernameQuery } from '../queries/index.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
import { round } from 'mathjs';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import { bot } from '../index.js';
import errorMsg from '../scripts/errorMessage.js';

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
		
		var playerStreak = await getPlayerFromDiscordIdQueryMoreInfo(msg.author.id);
		//var playerCareer = await getPlayerCareerFromDiscordIdQuery(msg.author.id);
	}
	
	else if ((userMessageLower.startsWith('!rating ')) || (userMessageLower.startsWith('!r ')) || (userMessageLower.startsWith('!stats '))) {
		if (enforceWordCount(userMessage,2)) {
			var player = await getPlayerFromUsernameQuery(getWord(userMessage,2));
			
			if (player == null) {
				return errorMsg(`Could not find ${getWord(userMessage,2)} in the database.`);
			}
			
			var playerStreak = await getPlayerFromUsernameQueryMoreInfo(getWord(userMessage,2));
			//var playerCareer = await getPlayerCareerFromUsernameQuery(getWord(userMessage,2));
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
		const totalFM = player.foursWins + player.foursLosses;
		const totalW = player.casualWins + player.twosWins + player.foursWins;
		const totalL = player.casualLosses + player.twosLosses + player.foursLosses;

		let tWpercent = Math.round((100 * totalW) / (totalOM + totalPM + totalFM));
		if (isNaN(tWpercent)) {
			tWpercent = "-";
		} else {
			tWpercent = tWpercent.toString() + "%";
		}

		const OLP = new Date(player.casualLastPlayed);
		if (!isNaN(OLP)) {
			OLP.setHours(OLP.getHours() - 10); //AEST
			var OLPformat = `${OLP.getDate()}/${OLP.getMonth() + 1}/${OLP.getFullYear()}`;
		}
		else {
			var OLPformat = "-";
		}

		let oWpercent = Math.round((100 * player.casualWins) / totalOM);
		if (isNaN(oWpercent)) {
			oWpercent = "-";
		}
		else {
			oWpercent = oWpercent.toString() + "%";
		}

		//if (totalPM > 0) {
		const PLP = new Date(player.twosLastPlayed);
		if (!isNaN(PLP)) {
			PLP.setHours(PLP.getHours() - 10); //AEST
			var PLPformat = `${PLP.getDate()}/${PLP.getMonth() + 1}/${PLP.getFullYear()}`;
		}
		else {
			var PLPformat = "-";
		}

		let pWpercent = Math.round((100 * player.twosWins) / totalPM);
		if (isNaN(pWpercent)) {
			pWpercent = "-";
		}
		else {
			pWpercent = pWpercent.toString() + "%";
		}

		const FLP = new Date(player.foursLastPlayed);
		if (!isNaN(FLP)) {
			FLP.setHours(FLP.getHours() - 10); //AEST
			var FLPformat = `${FLP.getDate()}/${FLP.getMonth() + 1}/${FLP.getFullYear()}`;
		}
		else {
			var FLPformat = "-";
		}

		let fWpercent = Math.round((100 * player.foursWins) / totalFM);
		if (isNaN(fWpercent)) {
			fWpercent = "-";
		}
		else {
			fWpercent = fWpercent.toString() + "%";
		}

		//embed fields and formatting
		const delim = "    ";
		/*
		let careerMsgVal = '';
		careerMsgVal += '```\n';
		careerMsgVal += ` M	 W	 L ` + delim + `Win %`;
		careerMsgVal += `\n` + `${padSides(totalOM + totalPM,3)} ${padSides(totalW,3)} ${padSides(totalL,3)}` + delim + `${padSides(tWpercent,5)}` ;
		careerMsgVal += '\n```';
		*/
		/*
		let casualMsgVal = '```\n';
		casualMsgVal += `${padSides('Rating',21)} `;
		casualMsgVal += `\n   Min   Max  Curr    `;
		casualMsgVal += `\n  ` + `${padSides(playerStreak.CasualRating.min,5)} ${padSides(playerStreak.CasualRating.max,5)} ${padSides(player.casualRating,5)}   `;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `${padSides('Streak',21)} `
		casualMsgVal += `\n   Min   Max  Curr    `;
		casualMsgVal += `\n  ` + `${padSides(playerStreak.CasualStreak.minStreak,5)} ${padSides(playerStreak.CasualStreak.maxStreak,5)} ${padSides(playerStreak.CasualStreak.currStreak,5)}   `;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\n   M   W   L ` + delim + `Win %`;
		casualMsgVal += `\n  ` + `${padSides(totalOM,3)} ${padSides(player.casualWins,3)} ${padSides(player.casualLosses,3)}` + delim + `${padSides(oWpercent,5)}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\nLast Played: ${OLPformat} `;
		casualMsgVal += '\n```';

		let twosMsgVal = '```\n';
		twosMsgVal += `${padSides('Rating',21)} `;
		twosMsgVal += `\n   Min   Max  Curr    `;
		twosMsgVal += `\n  ` + `${padSides(playerStreak.TwosRating.min,5)} ${padSides(playerStreak.TwosRating.max,5)} ${padSides(player.twosRating,5)}   `;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `${padSides('Streak',21)} `
		twosMsgVal += `\n   Min   Max  Curr    `;
		twosMsgVal += `\n  ` + `${padSides(playerStreak.TwosStreak.minStreak,5)} ${padSides(playerStreak.TwosStreak.maxStreak,5)} ${padSides(playerStreak.TwosStreak.currStreak,5)}   `;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\n   M   W   L ` + delim + `Win %`;
		twosMsgVal += `\n  ${padSides(totalPM,3)} ${padSides(player.twosWins,3)} ${padSides(player.twosLosses,3)}${delim}${padSides(pWpercent,5)}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\nLast Played: ${PLPformat}`;
		twosMsgVal += '\n```';
		
		let foursMsgVal = '```\n';
		foursMsgVal += `${padSides('Rating',21)} `;
		foursMsgVal += `\n   Min   Max  Curr    `;
		foursMsgVal += `\n  ` + `${padSides(playerStreak.FoursRating.min,5)} ${padSides(playerStreak.FoursRating.max,5)} ${padSides(player.foursRating,5)}   `;
		foursMsgVal += '\n```';
		foursMsgVal += '```';
		foursMsgVal += `${padSides('Streak',21)} `
		foursMsgVal += `\n   Min   Max  Curr    `;
		foursMsgVal += `\n  ` + `${padSides(playerStreak.FoursStreak.minStreak,5)} ${padSides(playerStreak.FoursStreak.maxStreak,5)} ${padSides(playerStreak.FoursStreak.currStreak,5)}   `;
		foursMsgVal += '\n```';
		foursMsgVal += '```';
		foursMsgVal += `\n   M   W   L ` + delim + `Win %`;
		foursMsgVal += `\n  ${padSides(totalFM,3)} ${padSides(player.foursWins,3)} ${padSides(player.foursLosses,3)}${delim}${padSides(fWpercent,5)}`;
		foursMsgVal += '\n```';
		foursMsgVal += '```';
		foursMsgVal += `\nLast Played: ${FLPformat}`;
		foursMsgVal += '\n```';
		//}
		*/
		
		let casualMsgVal = '```\n';
		casualMsgVal += `\n     ${padSides('R',5)}  ${padSides('S',3)} `;
		casualMsgVal += `\nMin | ${padSides(playerStreak.CasualRating.min,4)}  ${padSides(playerStreak.CasualStreak.minStreak,3)}`;
		casualMsgVal += `\nMax | ${padSides(playerStreak.CasualRating.max,4)}  ${padSides(playerStreak.CasualStreak.maxStreak,3)}`;
		casualMsgVal += `\nCurr| ${padSides(player.casualRating,4)}  ${padSides(playerStreak.CasualStreak.currStreak,3)}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\n   M   W   L `
		casualMsgVal += `\n  ` + `${padSides(totalOM,3)} ${padSides(player.casualWins,3)} ${padSides(player.casualLosses,3)}`
		casualMsgVal += `Win %: ${oWpercent}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\nLast Played: ${OLPformat} `;
		casualMsgVal += '\n```';
		
		let twosMsgVal = '```\n';
		twosMsgVal += `\n     ${padSides('R',5)}  ${padSides('S',3)} `;
		twosMsgVal += `\nMin | ${padSides(playerStreak.TwosRating.min,4)}  ${padSides(playerStreak.TwosStreak.minStreak,3)}`;
		twosMsgVal += `\nMax | ${padSides(playerStreak.TwosRating.max,4)}  ${padSides(playerStreak.TwosStreak.maxStreak,3)}`;
		twosMsgVal += `\nCurr| ${padSides(player.twosRating,4)}  ${padSides(playerStreak.TwosStreak.currStreak,3)}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\n   M   W   L `
		twosMsgVal += `\n  ` + `${padSides(totalPM,3)} ${padSides(player.twosWins,3)} ${padSides(player.twosLosses,3)}`
		twosMsgVal += `Win %: ${pWpercent}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\nLast Played: ${PLPformat} `;
		twosMsgVal += '\n```';
		
		let foursMsgVal = '```\n';
		foursMsgVal += `\n     ${padSides('R',5)}  ${padSides('S',3)} `;
		foursMsgVal += `\nMin | ${padSides(playerStreak.FoursRating.min,4)}  ${padSides(playerStreak.FoursStreak.minStreak,3)}`;
		foursMsgVal += `\nMax | ${padSides(playerStreak.FoursRating.max,4)}  ${padSides(playerStreak.FoursStreak.maxStreak,3)}`;
		foursMsgVal += `\nCurr| ${padSides(player.foursRating,4)}  ${padSides(playerStreak.FoursStreak.currStreak,3)}`;
		foursMsgVal += '\n```';
		foursMsgVal += '```';
		foursMsgVal += `\n   M   W   L `
		foursMsgVal += `\n  ` + `${padSides(totalFM,3)} ${padSides(player.foursWins,3)} ${padSides(player.foursLosses,3)}`
		foursMsgVal += `Win %: ${fWpercent}`;
		foursMsgVal += '\n```';
		foursMsgVal += '```';
		foursMsgVal += `\nLast Played: ${FLPformat} `;
		foursMsgVal += '\n```';

		let embedFilesList = [];
		//const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		//embedFilesList.push(embedThumb);
		const graphEmbed = new Discord.AttachmentBuilder(playerStreak.RatingWorms, {name: 'ratingWorm.png'});
		embedFilesList.push(graphEmbed);
		
		const userAvatarURL = (await bot.users.fetch(player.discordId).catch(console.error)).displayAvatarURL();

		let statsEmbed = {
			color: 0x34eb4c,
			author: {
				name: `${player.playerID} ${player.username}`,
				icon_url: `${userAvatarURL}`,
			},
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			title: "RPUGs Current Season Statistics",
			fields: [
				{
					name: `Casual RPUGs`,
					value: casualMsgVal,
					inline: true,
				},
				{
					name: "Twos RPUGs",
					value: twosMsgVal,
					inline: true,
				},
				{
					name: "Fours RPUGs",
					value: foursMsgVal,
					inline: true,
				},
			],
			image: {
				url: "attachment://" + graphEmbed.name,
			},
		};

		/*
		//career stats
		//embed formatting
		let careerCasualMsgVal = '';
		let careerTwosMsgVal = '';
		if (playerCareer) {
			
			let cCWpercent = Math.round(100*playerCareer.CareerCasualWins/(playerCareer.CareerCasualWins+playerCareer.CareerCasualLosses));
			if (isNaN(cCWpercent)) {
				cCWpercent = '-';
			}
			else {
				cCWpercent = cCWpercent.toString() + '%';
			}
			
			let cTWpercent = Math.round(100*playerCareer.CareerTwosWins/(playerCareer.CareerTwosWins+playerCareer.CareerTwosLosses));
			if (isNaN(cTWpercent)) {
				cTWpercent = '-';
			}
			else {
				cTWpercent = cTWpercent.toString() + '%';
			}
			
			if (playerCareer.CareerCasualRating.num !== 0) {
				careerCasualMsgVal = '```\n';
				careerCasualMsgVal += `${padSides('Rating',19)}` + delim + `${padSides('Record',19)}`;
				careerCasualMsgVal += `\n	 Min	 Max	 Avg ` + delim + `	M		 W		 L	` + delim + `Win %	`;
				careerCasualMsgVal += `\n	` + `${padSides(playerCareer.CareerCasualRating.min,5)} ${padSides(playerCareer.CareerCasualRating.max,5)} ${padSides(Math.round(playerCareer.CareerCasualRating.avg),5)}` + delim + `${padSides(playerCareer.CareerCasualWins+playerCareer.CareerCasualLosses,5)} ${padSides(playerCareer.CareerCasualWins,5)} ${padSides(playerCareer.CareerCasualLosses,5)}` + delim + `${padSides(cCWpercent,5)}`;
				careerCasualMsgVal += '\n```';
				careerCasualMsgVal += '```';
				careerCasualMsgVal += `Max W Streak: ${playerCareer.CareerCasualMaxStreak}`;
				careerCasualMsgVal += `\nMax L Streak: ${playerCareer.CareerCasualMinStreak}`;
				careerCasualMsgVal += '\n```';
			}
			else {
				careerCasualMsgVal = `*Play a Casual RPUGs match to see your Casual RPUGs career stats!*\n`
			}
			
			if (playerCareer.CareerTwosRating.num !== 0) {
				careerTwosMsgVal = '```\n';
				careerTwosMsgVal += `${padSides('Rating',19)}` + delim + `${padSides('Record',19)}`;
				careerTwosMsgVal += `\n	 Min	 Max	 Avg ` + delim + `	M		 W		 L	` + delim + `Win %	`;
				careerTwosMsgVal += `\n	` + `${padSides(playerCareer.CareerTwosRating.min,5)} ${padSides(playerCareer.CareerTwosRating.max,5)} ${padSides(Math.round(playerCareer.CareerTwosRating.avg),5)}` + delim + `${padSides(playerCareer.CareerTwosWins+playerCareer.CareerTwosLosses,5)} ${padSides(playerCareer.CareerTwosWins,5)} ${padSides(playerCareer.CareerTwosLosses,5)}` + delim + `${padSides(cTWpercent,5)}`;
				careerTwosMsgVal += '\n```';
				careerTwosMsgVal += '```';
				careerTwosMsgVal += `Max W Streak: ${playerCareer.CareerTwosMaxStreak}`;
				careerTwosMsgVal += `\nMax L Streak: ${playerCareer.CareerTwosMinStreak}`;
				careerTwosMsgVal += '\n```';
				careerTwosMsgVal += '\n**Current Season:**';
			}
			else {
				careerTwosMsgVal = `*Play a Twos RPUGs match to see your Twos RPUGs career stats!*\n`
				careerTwosMsgVal += '\n**Current Season:**';
			}
			
		}
		else {
			statsEmbed.description = `*Play an RPUGs match to see your career stats!*\n` + '\n**Current Season:**';
		}
		
		if (playerCareer) {
			statsEmbed.fields.splice(0,0,{
				name: `Casual RPUGs - ${playerCareer.CareerCasualRating.num} season(s)`,
				value: careerCasualMsgVal,
			});
			statsEmbed.fields.splice(1,0,{
				name: `Twos RPUGs - ${playerCareer.CareerTwosRating.num} season(s)`,
				value: careerTwosMsgVal,
			});
		}
		*/

		return {
			embedMessage: statsEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};
	}
}

async function ratingCareer(msg) {
	const userMessage = msg.content;
	const userMessageLower = userMessage.toLowerCase();
    if ((userMessageLower === '!ratingcareer') || (userMessageLower === '!rc') || (userMessageLower === '!statscareer')) {
		var player = await getPlayerFromDiscordIdQuery(msg.author.id); //currently a super inefficient method, but purely for checking if the player exists in the database in the latest season
		
		if (player == null) {
			return errorMsg('Could not find you in the database.');
		}
		
		//var playerStreak = await getPlayerFromDiscordIdQueryMoreInfo(msg.author.id);
		var playerCareer = await getPlayerCareerFromDiscordIdQuery(msg.author.id);
	}
	
	else if ((userMessageLower.startsWith('!ratingcareer ')) || (userMessageLower.startsWith('!rc ')) || (userMessageLower.startsWith('!statscareer '))) {
		if (enforceWordCount(userMessage,2)) {
			var player = await getPlayerFromUsernameQuery(getWord(userMessage,2)); //currently a super inefficient method, but purely for checking if the player exists in the database in the latest season
			
			if (player == null) {
				return errorMsg(`Could not find ${getWord(userMessage,2)} in the database.`);
			}
			
			//var playerStreak = await getPlayerFromUsernameQueryMoreInfo(getWord(userMessage,2));
			var playerCareer = await getPlayerCareerFromUsernameQuery(getWord(userMessage,2));
		}
		else {
			// Error Syntax
			return errorMsg('Expected 0 or 1 inputs for this command.');
		}
	}
	// Success
	if (player) {
		/*
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
		
		//if (totalPM > 0) {
		const PLP = new Date(player.twosLastPlayed);
		if (!isNaN(PLP)) {
			PLP.setHours(PLP.getHours() - 10); //AEST
			var PLPformat = `${PLP.getDate()}/${PLP.getMonth() + 1}/${PLP.getFullYear()}`;
		}
		else {
			var PLPformat = '-'; 
		}
		
		let pWpercent =Math.round(100*player.twosWins/totalPM);
		if (isNaN(pWpercent)) {
			pWpercent = '-';
		}
		else {
			pWpercent = pWpercent.toString() + '%';
		}
		
		//embed fields and formatting
		const delim = "		";
		/*
		let careerMsgVal = '';
		careerMsgVal += '```\n';
		careerMsgVal += ` M	 W	 L ` + delim + `Win %`;
		careerMsgVal += `\n` + `${padSides(totalOM + totalPM,3)} ${padSides(totalW,3)} ${padSides(totalL,3)}` + delim + `${padSides(tWpercent,5)}` ;
		careerMsgVal += '\n```';
		*/
		/*
		let casualMsgVal = '```\n';
		casualMsgVal += `Rating: ${player.casualRating}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `${padSides('Streak',21)} `
		casualMsgVal += `\n	 Min	 Max	Curr		`;
		casualMsgVal += `\n	` + `${padSides(playerStreak.CasualStreak.minStreak,5)} ${padSides(playerStreak.CasualStreak.maxStreak,5)} ${padSides(playerStreak.CasualStreak.currStreak,5)}	 `;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\n	 M	 W	 L ` + delim + `Win %`;
		casualMsgVal += `\n	` + `${padSides(totalOM,3)} ${padSides(player.casualWins,3)} ${padSides(player.casualLosses,3)}` + delim + `${padSides(oWpercent,5)}`;
		casualMsgVal += '\n```';
		casualMsgVal += '```';
		casualMsgVal += `\nLast Played: ${OLPformat} `;
		casualMsgVal += '\n```';
		
		let twosMsgVal = '```\n';
		twosMsgVal += `Rating: ${player.twosRating}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `${padSides('Streak',21)} `
		twosMsgVal += `\n	 Min	 Max	Curr		`;
		twosMsgVal += `\n	` + `${padSides(playerStreak.TwosStreak.minStreak,5)} ${padSides(playerStreak.TwosStreak.maxStreak,5)} ${padSides(playerStreak.TwosStreak.currStreak,5)}	 `;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\n	 M	 W	 L ` + delim + `Win %`;
		twosMsgVal += `\n	${padSides(totalPM,3)} ${padSides(player.twosWins,3)} ${padSides(player.twosLosses,3)}${delim}${padSides(pWpercent,5)}`;
		twosMsgVal += '\n```';
		twosMsgVal += '```';
		twosMsgVal += `\nLast Played: ${PLPformat}`;
		twosMsgVal += '\n```';
		//}
		*/
		let embedFilesList = [];
		//const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		//embedFilesList.push(embedThumb);
		const graphEmbed = new Discord.AttachmentBuilder(playerCareer.CareerRatingWorm, {name: 'ratingWorm.png'});
		embedFilesList.push(graphEmbed);
		
		const userAvatarURL = (await bot.users.fetch(player.discordId).catch(console.error)).displayAvatarURL();

		let statsEmbed = {
			color: 0x34eb4c,
			author: {
				name: `${player.playerID}	${player.username}`,
				icon_url: `${userAvatarURL}`,
			},
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			title: "RPUGs Career Statistics",
			fields: [],
			image: {
				url: "attachment://" + graphEmbed.name,
			},
		};

		//career stats
		//embed formatting
		const delim = "    ";
		let careerCasualMsgVal = "";
		let careerTwosMsgVal = "";
		let careerFoursMsgVal = "";
		if (playerCareer) {
			let cCWpercent = Math.round((100 * playerCareer.CareerCasualWins) / (playerCareer.CareerCasualWins + playerCareer.CareerCasualLosses));
			if (isNaN(cCWpercent)) {
				cCWpercent = "-";
			}
			else {
				cCWpercent = cCWpercent.toString() + "%";
			}

			let cTWpercent = Math.round((100 * playerCareer.CareerTwosWins) / (playerCareer.CareerTwosWins + playerCareer.CareerTwosLosses));
			if (isNaN(cTWpercent)) {
				cTWpercent = "-";
			}
			else {
				cTWpercent = cTWpercent.toString() + "%";
			}
			
			let cFWpercent = Math.round((100 * playerCareer.CareerFoursWins) / (playerCareer.CareerFoursWins + playerCareer.CareerFoursLosses));
			if (isNaN(cFWpercent)) {
				cFWpercent = "-";
			}
			else {
				cFWpercent = cFWpercent.toString() + "%";
			}

			if (playerCareer.CareerCasualRating.num !== 0) {
				careerCasualMsgVal = '```\n';
				careerCasualMsgVal += `${padSides('Rating',19)}` + delim + `${padSides('Record',19)}`;
				careerCasualMsgVal += `\n   Min   Max   Avg ` + delim + `  M     W     L  ` + delim + `Win %  `;
				careerCasualMsgVal += `\n  ` + `${padSides(playerCareer.CareerCasualRating.min,5)} ${padSides(playerCareer.CareerCasualRating.max,5)} ${padSides(Math.round(playerCareer.CareerCasualRating.avg),5)}` + delim + `${padSides(playerCareer.CareerCasualWins+playerCareer.CareerCasualLosses,5)} ${padSides(playerCareer.CareerCasualWins,5)} ${padSides(playerCareer.CareerCasualLosses,5)}` + delim + `${padSides(cCWpercent,5)}`;
				careerCasualMsgVal += '\n```';
				careerCasualMsgVal += '```';
				careerCasualMsgVal += `Max W Streak: ${playerCareer.CareerCasualMaxStreak}`;
				careerCasualMsgVal += `\nMax L Streak: ${playerCareer.CareerCasualMinStreak}`;
				careerCasualMsgVal += '\n```';
			}
			else {
				careerCasualMsgVal = `*Play a Casual RPUGs match to see your Casual RPUGs career stats!*\n`;
			}

			if (playerCareer.CareerTwosRating.num !== 0) {
				careerTwosMsgVal = '```\n';
				careerTwosMsgVal += `${padSides('Rating',19)}` + delim + `${padSides('Record',19)}`;
				careerTwosMsgVal += `\n   Min   Max   Avg ` + delim + `  M     W     L  ` + delim + `Win %  `;
				careerTwosMsgVal += `\n  ` + `${padSides(playerCareer.CareerTwosRating.min,5)} ${padSides(playerCareer.CareerTwosRating.max,5)} ${padSides(Math.round(playerCareer.CareerTwosRating.avg),5)}` + delim + `${padSides(playerCareer.CareerTwosWins+playerCareer.CareerTwosLosses,5)} ${padSides(playerCareer.CareerTwosWins,5)} ${padSides(playerCareer.CareerTwosLosses,5)}` + delim + `${padSides(cTWpercent,5)}`;
				careerTwosMsgVal += '\n```';
				careerTwosMsgVal += '```';
				careerTwosMsgVal += `Max W Streak: ${playerCareer.CareerTwosMaxStreak}`;
				careerTwosMsgVal += `\nMax L Streak: ${playerCareer.CareerTwosMinStreak}`;
				careerTwosMsgVal += '\n```';
			}
			else {
				careerTwosMsgVal = `*Play a Twos RPUGs match to see your Twos RPUGs career stats!*\n`;
			}
			
			if (playerCareer.CareerFoursRating.num !== 0) {
				careerFoursMsgVal = '```\n';
				careerFoursMsgVal += `${padSides('Rating',19)}` + delim + `${padSides('Record',19)}`;
				careerFoursMsgVal += `\n   Min   Max   Avg ` + delim + `  M     W     L  ` + delim + `Win %  `;
				careerFoursMsgVal += `\n  ` + `${padSides(playerCareer.CareerFoursRating.min,5)} ${padSides(playerCareer.CareerFoursRating.max,5)} ${padSides(Math.round(playerCareer.CareerFoursRating.avg),5)}` + delim + `${padSides(playerCareer.CareerFoursWins+playerCareer.CareerFoursLosses,5)} ${padSides(playerCareer.CareerFoursWins,5)} ${padSides(playerCareer.CareerFoursLosses,5)}` + delim + `${padSides(cFWpercent,5)}`;
				careerFoursMsgVal += '\n```';
				careerFoursMsgVal += '```';
				careerFoursMsgVal += `Max W Streak: ${playerCareer.CareerFoursMaxStreak}`;
				careerFoursMsgVal += `\nMax L Streak: ${playerCareer.CareerFoursMinStreak}`;
				careerFoursMsgVal += '\n```';
			}
			else {
				careerFoursMsgVal = `*Play a Fours RPUGs match to see your Fours RPUGs career stats!*\n`;
			}
		} else {
			statsEmbed.description = `*Play an RPUGs match to see your career stats!*\n`;
		}

		if (playerCareer) {
			statsEmbed.fields.splice(0, 0, {
				name: `Casual RPUGs - ${playerCareer.CareerCasualRating.num} season(s)`,
				value: careerCasualMsgVal,
			});
			statsEmbed.fields.splice(1, 0, {
				name: `Twos RPUGs - ${playerCareer.CareerTwosRating.num} season(s)`,
				value: careerTwosMsgVal,
			});
			statsEmbed.fields.splice(2, 0, {
				name: `Fours RPUGs - ${playerCareer.CareerFoursRating.num} season(s)`,
				value: careerFoursMsgVal,
			});
		}

		return {
			embedMessage: statsEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false,
		};
	}
}

export { rating, ratingCareer };
