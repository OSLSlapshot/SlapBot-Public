import { getVersusInfo, getVersusCareerInfo } from '../queries/index.js';
import enforceWordCount from '../utls/enforceWordCount.js';
import getWord from '../utls/getWord.js';
//import { round } from 'mathjs';
import padSides from '../utls/padSides.js';
import Discord from 'discord.js';
import { bot } from '../index.js';
import errorMsg from '../scripts/errorMessage.js';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
async function versus(msg) {
		const userMessage = msg.content;
	const userMessageLower = userMessage.toLowerCase();
		if ((userMessageLower.startsWith('!versus ')) || (userMessageLower.startsWith('!vs '))) {
		if (enforceWordCount(userMessage,2)) {
			var versusInfo = await getVersusInfo(msg.author.id,getWord(userMessage,2));
			
			if (versusInfo == null) {
				return errorMsg('Could not find one or both players in the database.');
			}
		}
		else {
			// Error Syntax
			return errorMsg('Expected 1 input for this command.');
		}
	}
	//console.log(versusInfo)
	
	
	// Success
	if (versusInfo) {
		const totalCWM =
			versusInfo.Casual.With.Wins + versusInfo.Casual.With.Losses; //with matches casual
		const totalFWM = versusInfo.Fours.With.Wins + versusInfo.Fours.With.Losses; //with matches fours
		const totalTWM = versusInfo.Twos.With.Wins + versusInfo.Twos.With.Losses; //with matches twos
		const totalCAM =
			versusInfo.Casual.Against.Wins + versusInfo.Casual.Against.Losses; //against matches casual
		const totalFAM =
			versusInfo.Fours.Against.Wins + versusInfo.Fours.Against.Losses; //against matches Fours
		const totalTAM =
			versusInfo.Twos.Against.Wins + versusInfo.Twos.Against.Losses; //against matches twos

		let CWWpercent = Math.round((100 * versusInfo.Casual.With.Wins) / totalCWM);
		if (isNaN(CWWpercent)) {
			CWWpercent = "-";
		}
	else {
			CWWpercent = CWWpercent.toString() + "%";
		}

		let FWWpercent = Math.round((100 * versusInfo.Fours.With.Wins) / totalFWM);
		if (isNaN(FWWpercent)) {
			FWWpercent = "-";
		}
	else {
			FWWpercent = FWWpercent.toString() + "%";
		}

		let TWWpercent = Math.round((100 * versusInfo.Twos.With.Wins) / totalTWM);
		if (isNaN(TWWpercent)) {
			TWWpercent = "-";
		}
	else {
			TWWpercent = TWWpercent.toString() + "%";
		}

		let CAWpercent = Math.round((100 * versusInfo.Casual.Against.Wins) / totalCAM);
		if (isNaN(CAWpercent)) {
			CAWpercent = "-";
		}
	else {
			CAWpercent = CAWpercent.toString() + "%";
		}

		let FAWpercent = Math.round((100 * versusInfo.Fours.Against.Wins) / totalFAM);
		if (isNaN(FAWpercent)) {
			FAWpercent = "-";
		}
	else {
			FAWpercent = FAWpercent.toString() + "%";
		}

		let TAWpercent = Math.round((100 * versusInfo.Twos.Against.Wins) / totalTAM);
		if (isNaN(TAWpercent)) {
			TAWpercent = "-";
		}
	else {
			TAWpercent = TAWpercent.toString() + "%";
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
		
		let foursMsgVal = '```\n';
		foursMsgVal += `${padSides('With',21)}  ` + delim2 + `${padSides('Against',21)} `;
		foursMsgVal += `\n   M   W   L ` + delim + `Win % ` + delim2 + `  M   W   L ` + delim + `Win %`;
		foursMsgVal += `\n  ` + `${padSides(totalFWM,3)} ${padSides(versusInfo.Fours.With.Wins,3)} ${padSides(versusInfo.Fours.With.Losses,3)}` + delim + `${padSides(FWWpercent,5)} ` + delim2 + ` ` + `${padSides(totalFAM,3)} ${padSides(versusInfo.Fours.Against.Wins,3)} ${padSides(versusInfo.Fours.Against.Losses,3)}` + delim + `${padSides(FAWpercent,5)}`;
		foursMsgVal += '\n```';
    //}

		let embedFilesList = [];
		//const embedThumb = new Discord.MessageAttachment('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		//embedFilesList.push(embedThumb);
		//const graphEmbed = new Discord.MessageAttachment(playerStreak.RatingWorms, 'ratingWorm.png');
		//embedFilesList.push(graphEmbed);

		const userAvatarURL = (
			await bot.users
				.fetch(versusInfo.Players.Player1.discordId)
				.catch(console.error)
		).displayAvatarURL();
		const user2AvatarURL = (
			await bot.users
				.fetch(versusInfo.Players.Player2.discordId)
				.catch(console.error)
		).displayAvatarURL();

		let statsEmbed = {
			color: 0xff0000,
			author: {
				name: `${versusInfo.Players.Player1.playerID}  ${versusInfo.Players.Player1.username} vs. ${versusInfo.Players.Player2.playerID}  ${versusInfo.Players.Player2.username}`,
				icon_url: `${userAvatarURL}`
			},
			thumbnail: {
				url: `${user2AvatarURL}`,
			},
			title: "RPUGs Current Season Versus",
			fields: [
				{
					name: `Casual RPUGs`,
					value: casualMsgVal,
					inline: false,
				},
				{
					name: "Twos RPUGs",
					value: twosMsgVal,
					inline: false,
				},
				{
					name: "Fours RPUGs",
					value: foursMsgVal,
					inline: false,
				},
			],
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
      deleteSenderMessage: false,
    };
  }
}

async function versusCareer(msg) {
    const userMessage = msg.content;
	const userMessageLower = userMessage.toLowerCase();
    if ((userMessageLower.startsWith('!versuscareer ')) || (userMessageLower.startsWith('!vsc '))) {
		if (enforceWordCount(userMessage,2)) {
			var versusInfo = await getVersusCareerInfo(msg.author.id,getWord(userMessage,2));
			
			if (versusInfo == null) {
				return errorMsg('Could not find one or both players in the database.');
			}
		}
		else {
			// Error Syntax
			return errorMsg('Expected 1 input for this command.');
		}
	}
	//console.log(versusInfo)
	
	
	// Success
	if (versusInfo) {
		const totalCWM = versusInfo.Casual.With.Wins + versusInfo.Casual.With.Losses; //with matches casual
		const totalFWM = versusInfo.Fours.With.Wins + versusInfo.Fours.With.Losses; //with matches fours
		const totalTWM = versusInfo.Twos.With.Wins + versusInfo.Twos.With.Losses; //with matches twos
		const totalCAM = versusInfo.Casual.Against.Wins + versusInfo.Casual.Against.Losses; //against matches casual
		const totalFAM = versusInfo.Fours.Against.Wins + versusInfo.Fours.Against.Losses; //against matches fours
		const totalTAM = versusInfo.Twos.Against.Wins + versusInfo.Twos.Against.Losses; //against matches twos

		let CWWpercent = Math.round((100 * versusInfo.Casual.With.Wins) / totalCWM);
		if (isNaN(CWWpercent)) {
			CWWpercent = "-";
		}
		else {
			CWWpercent = CWWpercent.toString() + "%";
		}

		let FWWpercent = Math.round((100 * versusInfo.Fours.With.Wins) / totalFWM);
		if (isNaN(FWWpercent)) {
			FWWpercent = "-";
		}
		else {
			FWWpercent = FWWpercent.toString() + "%";
		}

		let TWWpercent = Math.round((100 * versusInfo.Twos.With.Wins) / totalTWM);
		if (isNaN(TWWpercent)) {
			TWWpercent = "-";
		}
		else {
			TWWpercent = TWWpercent.toString() + "%";
		}

		let CAWpercent = Math.round((100 * versusInfo.Casual.Against.Wins) / totalCAM);
		if (isNaN(CAWpercent)) {
			CAWpercent = "-";
		}
		else {
			CAWpercent = CAWpercent.toString() + "%";
		}

		let FAWpercent = Math.round((100 * versusInfo.Fours.Against.Wins) / totalFAM);
		if (isNaN(FAWpercent)) {
			FAWpercent = "-";
		}
		else {
			FAWpercent = FAWpercent.toString() + "%";
		}

		let TAWpercent = Math.round((100 * versusInfo.Twos.Against.Wins) / totalTAM);
		if (isNaN(TAWpercent)) {
			TAWpercent = "-";
		}
		else {
			TAWpercent = TAWpercent.toString() + "%";
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
		
		let foursMsgVal = '```\n';
		foursMsgVal += `${padSides('With',21)}  ` + delim2 + `${padSides('Against',21)} `;
		foursMsgVal += `\n   M   W   L ` + delim + `Win % ` + delim2 + `  M   W   L ` + delim + `Win %`;
		foursMsgVal += `\n  ` + `${padSides(totalTWM,3)} ${padSides(versusInfo.Fours.With.Wins,3)} ${padSides(versusInfo.Fours.With.Losses,3)}` + delim + `${padSides(TWWpercent,5)} ` + delim2 + ` ` + `${padSides(totalTAM,3)} ${padSides(versusInfo.Fours.Against.Wins,3)} ${padSides(versusInfo.Fours.Against.Losses,3)}` + delim + `${padSides(TAWpercent,5)}`;
		foursMsgVal += '\n```';
		//}

		let embedFilesList = [];
		//const embedThumb = new Discord.MessageAttachment('./thumbnails/rating.png', 'rating.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
		//embedFilesList.push(embedThumb);
		//const graphEmbed = new Discord.MessageAttachment(playerStreak.RatingWorms, 'ratingWorm.png');
		//embedFilesList.push(graphEmbed);

		const userAvatarURL = (
			await bot.users
				.fetch(versusInfo.Players.Player1.discordId)
				.catch(console.error)
		).displayAvatarURL();
		const user2AvatarURL = (
			await bot.users
				.fetch(versusInfo.Players.Player2.discordId)
				.catch(console.error)
		).displayAvatarURL();

		let statsEmbed = {
			color: 0xff0000,
			author: {
				name: `${versusInfo.Players.Player1.playerID}  ${versusInfo.Players.Player1.username} vs. ${versusInfo.Players.Player2.playerID}  ${versusInfo.Players.Player2.username}`,
				icon_url: `${userAvatarURL}`
			},
			thumbnail: {
				url: `${user2AvatarURL}`,
			},
			title: "RPUGs Career Versus",
			fields: [
				{
					name: `Casual RPUGs`,
					value: casualMsgVal,
					inline: false,
				},
				{
					name: "Twos RPUGs",
					value: twosMsgVal,
					inline: false,
				},
				{
					name: "Fours RPUGs",
					value: foursMsgVal,
					inline: false,
				},
			],
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

export { versus, versusCareer };
