import { getSeasonSummary } from '../queries';
//import enforceWordCount from '../utls/enforceWordCount';
//import getWord from '../utls/getWord';
//import { round } from 'mathjs';
//import padSides from '../utls/padSides';
import Discord from 'discord.js';
//import { bot } from '../';
import errorMsg from '../scripts/errorMessage';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
async function seasonSummary(msg) {
    const userMessage = msg.content;
	const userMessageLower = userMessage.toLowerCase();
    if ((userMessageLower === '!seasonsummary') || (userMessageLower === '!ss')) {
		var seasonInfo = await getSeasonSummary();
		
		if (seasonInfo == null) {
			return errorMsg('No matches have been played this season!');
		}
	}
	//console.log(versusInfo)
	
	
	// Success
	if (seasonInfo) {
		/*
		const totalCWM = versusInfo.Casual.With.Wins + versusInfo.Casual.With.Losses; //with matches casual
		const totalTWM = versusInfo.Twos.With.Wins + versusInfo.Twos.With.Losses; //with matches twos
		const totalCAM = versusInfo.Casual.Against.Wins + versusInfo.Casual.Against.Losses; //against matches casual
		const totalTAM = versusInfo.Twos.Against.Wins + versusInfo.Twos.Against.Losses; //against matches twos
		
		let CWWpercent = Math.round(100*versusInfo.Casual.With.Wins/(totalCWM));
		if (isNaN(CWWpercent)) {
			CWWpercent = '-';
		}
		else {
			CWWpercent = CWWpercent.toString() + '%';
		}
		
		let TWWpercent = Math.round(100*versusInfo.Twos.With.Wins/(totalTWM));
		if (isNaN(TWWpercent)) {
			TWWpercent = '-';
		}
		else {
			TWWpercent = TWWpercent.toString() + '%';
		}
		
		let CAWpercent = Math.round(100*versusInfo.Casual.Against.Wins/(totalCAM));
		if (isNaN(CAWpercent)) {
			CAWpercent = '-';
		}
		else {
			CAWpercent = CAWpercent.toString() + '%';
		}
		
		let TAWpercent = Math.round(100*versusInfo.Twos.Against.Wins/(totalTAM));
		if (isNaN(TAWpercent)) {
			TAWpercent = '-';
		}
		else {
			TAWpercent = TAWpercent.toString() + '%';
		}
		
		//embed fields and formatting
		const delim = "    ";
		const delim2 = "  |  ";
		
		let casualMsgVal = '```\n';
		casualMsgVal += `${padSides('With',21)}  ` + delim2 + `${padSides('Against',21)} `;
		casualMsgVal += `\n   M   W   L ` + delim + `Win % ` + delim2 + `  M   W   L ` + delim + `Win %`;
		casualMsgVal += `\n  ` + `${padSides(totalCWM,3)} ${padSides(versusInfo.Casual.With.Wins,3)} ${padSides(versusInfo.Casual.With.Losses,3)}` + delim + `${padSides(CWWpercent,5)} ` + delim2 + ` ` + `${padSides(totalCAM,3)} ${padSides(versusInfo.Casual.Against.Wins,3)} ${padSides(versusInfo.Casual.Against.Losses,3)}` + delim + `${padSides(CAWpercent,5)}`;
		casualMsgVal += '\n```';
		
		let twosMsgVal = '```\n';
		twosMsgVal += `${padSides('With',21)}  ` + delim2 + `${padSides('Against',21)} `;
		twosMsgVal += `\n   M   W   L ` + delim + `Win % ` + delim2 + `  M   W   L ` + delim + `Win %`;
		twosMsgVal += `\n  ` + `${padSides(totalTWM,3)} ${padSides(versusInfo.Twos.With.Wins,3)} ${padSides(versusInfo.Twos.With.Losses,3)}` + delim + `${padSides(TWWpercent,5)} ` + delim2 + ` ` + `${padSides(totalTAM,3)} ${padSides(versusInfo.Twos.Against.Wins,3)} ${padSides(versusInfo.Twos.Against.Losses,3)}` + delim + `${padSides(TAWpercent,5)}`;
		twosMsgVal += '\n```';
		//}
		*/
		let embedFilesList = [];
		//const embedThumb = new Discord.MessageAttachment('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		//embedFilesList.push(embedThumb);
		const graphEmbed = new Discord.MessageAttachment(seasonInfo.Histogram, 'seasonHistogram.png');
		embedFilesList.push(graphEmbed);
		
		//const userAvatarURL = (await bot.users.fetch(player.discordId).catch(console.error)).displayAvatarURL();
		
		let statsEmbed = {
			color: 0x00ff00,
			//author: {
			//	name: `${player.playerID}  ${player.username}`,
			//	icon_url: `${userAvatarURL}`
			//},
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			title: 'RPUGs Current Season Summary Statistics',
			/*
			fields: [
				{
					name: `Casual RPUGs`,
					value: casualMsgVal,
					inline: true
				},
				{
					name: 'Twos RPUGs',
					value: twosMsgVal,
					inline: true,
				},
			],
			*/
			image: {
				url: 'attachment://' + graphEmbed.name
			}
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
				careerCasualMsgVal += `\n   Min   Max   Avg ` + delim + `  M     W     L  ` + delim + `Win %  `;
				careerCasualMsgVal += `\n  ` + `${padSides(playerCareer.CareerCasualRating.min,5)} ${padSides(playerCareer.CareerCasualRating.max,5)} ${padSides(Math.round(playerCareer.CareerCasualRating.avg),5)}` + delim + `${padSides(playerCareer.CareerCasualWins+playerCareer.CareerCasualLosses,5)} ${padSides(playerCareer.CareerCasualWins,5)} ${padSides(playerCareer.CareerCasualLosses,5)}` + delim + `${padSides(cCWpercent,5)}`;
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
				careerTwosMsgVal += `\n   Min   Max   Avg ` + delim + `  M     W     L  ` + delim + `Win %  `;
				careerTwosMsgVal += `\n  ` + `${padSides(playerCareer.CareerTwosRating.min,5)} ${padSides(playerCareer.CareerTwosRating.max,5)} ${padSides(Math.round(playerCareer.CareerTwosRating.avg),5)}` + delim + `${padSides(playerCareer.CareerTwosWins+playerCareer.CareerTwosLosses,5)} ${padSides(playerCareer.CareerTwosWins,5)} ${padSides(playerCareer.CareerTwosLosses,5)}` + delim + `${padSides(cTWpercent,5)}`;
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
			deleteSenderMessage: false
		};
		
	}
	
}

export default seasonSummary;