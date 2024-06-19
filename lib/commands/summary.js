import { getSeasonSummaryQuery } from '../queries/index.js';
//import enforceWordCount from '../utls/enforceWordCount';
//import getWord from '../utls/getWord';
//import { round } from 'mathjs';
//import padSides from '../utls/padSides';
import Discord from 'discord.js';
//import { bot } from '../';
import errorMsg from '../scripts/errorMessage.js';
import { cmdChannels } from '../index.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import padSides from '../utls/padSides.js';

/**
 * Command to check the rating of another player
 * Syntax: !rating <username>
 */
async function seasonSummary(msg) {
	const commandCalls = ['!seasonsummary','!ss'];
	const msgAuthorId = msg.author.id;
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		if ((msg.guild) && (msg.channel.name !== cmdChannels.commandsCh.name) && (msg.channel.name !== cmdChannels.otherCh.name)) {
			return errorMsg("You cannot use that command here.");
		}
		
		let ssState = {
			season: 'current',
		};
		
		const ssEmbed = await generateSsEmbed(ssState);
		
		await msg.reply({files: ssEmbed.embedFiles, embeds: [ssEmbed.embedMessage], ephemeral: true, allowedMentions: { repliedUser: false}})
	
		return;
	}	
}

async function generateSsEmbed(params) {
	const seasonMatchCount = await getSeasonSummaryQuery(params.season);
	
	let ssEmbedDesc = '```';
	ssEmbedDesc += `\u200b${'Mode'.padStart(12)}  |  ${padSides('Count',5)}`; //22 length
	ssEmbedDesc += `\n${''.padEnd(22,'-')}`;
	
	for (const [m,c] of Object.entries(seasonMatchCount)) {
		if (m === 'total') {
			continue;
		}
		//ssEmbedDesc += `\n${capitaliseFirstLetter(m).padStart(12)}  |  ${padSides(c.toString(),5)}`;
		ssEmbedDesc += `\n\u200b${capitaliseFirstLetter(m).padStart(12)}  |  ${c.toString().padEnd(5)}`;
	}
	
	ssEmbedDesc += `\n${''.padEnd(22,'-')}`;
	//ssEmbedDesc += `\n${'Total'.padStart(12)}  |  ${padSides(seasonMatchCount.total.toString(),5)}`;
	ssEmbedDesc += `\n\u200b${'Total'.padStart(12)}  |  ${seasonMatchCount.total.toString().padEnd(5)}`;
	ssEmbedDesc += '```';
	
	let ssEmbed = {
		color: 0x00ff00,
		title: 'Season Summary                          \u200b',
		description: ssEmbedDesc,
		footer: {
			text: `${capitaliseFirstLetter(params.season)} Season`
		}
	}
	
	return {
		embedFiles: [],
		embedMessage: ssEmbed,
		deleteSenderMessage: false
	}
}

export default seasonSummary;