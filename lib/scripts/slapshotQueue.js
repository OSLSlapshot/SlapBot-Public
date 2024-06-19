//import enforceWordCount from '../utls/enforceWordCount.js';
//import { logger } from '../';
import Discord from 'discord.js';
import { getPublicMatchmaking } from '../queries/slapshot.js';
import { bot, server, cmdChannels, queueController } from '../index.js';
//import { getQueues } from '../scripts/matches.js';
import { getOngoingDrafts } from './draftClass.js';
import cfg from '../../config.js';
import { padStringToWidth } from 'discord-button-width';
import about from '../commands/about.js';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';

class LivePlayerTracker {
	constructor(messageId = null) {
		this.trackerCh = cmdChannels.liveCh;
		this.trackerMsgId = messageId;
		this.timeElapsed = 0;	//seconds; needed for resetting the message every now and then- there seem to be errors with the attachments
		this.msgResetPeriod = 30; //minutes
		this.prevReboundPlayerCount; //used for avoiding unnecessarily changing the Activity Status of the bot
	}
	
	async startTracker() {
		let trackerMsgDefault = this.createTrackerMsg();
		
		if (this.trackerMsgId) {
			try {
				this.trackerMsg = await this.trackerCh.messages.fetch(this.trackerMsgId);
				this.trackerMsg = await this.trackerMsg.edit({content: '', files: trackerMsgDefault.files, embeds: [trackerMsgDefault.embed], components: [trackerMsgDefault.components]});
			}
			catch (error) {
				if (error.code === 10008) {
					console.error(`Message ID ${this.trackerMsgId} not found in channel ${this.trackerCh}.`);
					console.log(error);
				}
				else {
					console.log(error);
				}
			}
		}
		else {
			this.trackerMsg = await this.trackerCh.send({content: '', files: trackerMsgDefault.files, embeds: [trackerMsgDefault.embed], components: [trackerMsgDefault.components]});
			this.trackerMsgId = this.trackerMsg.id;
			console.log(`New live tracker message sent. The message ID is ${this.trackerMsgId}.`);
		}
		
		const trackerCollector = await this.trackerMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button });
		
		try{
			trackerCollector.on('collect', async i => {
				await i.deferReply({ephemeral: true});
				const supportMsg = await about({content: '!a'});
				await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
			});
		}
		catch (err) {
			console.log('Error in live tracker listener');
			console.log(err);
		}
	}

	createTrackerMsg() {
		
		let embedFilesList = [];
		const embedBanner = new Discord.AttachmentBuilder(`./thumbnails/liveTrackerBanner.png`, {name: 'liveTrackerBanner.png'});
		embedFilesList.push(embedBanner);
		
		//const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/liveTrackerThumb.png`, {name: 'liveTrackerThumb.png'});
		//embedFilesList.push(embedThumb);
		
		const trackerEmbed = {
			color: 0x3f5bff,
			title: `${':hockey: Slapshot Rebound Quick Play'.padEnd(109)}\u200b`,
			//description: 'This number only represents those not currently in a match.\n*(Updates every 6 seconds)*\n\u200b\n**RPUGs:**',
			description: `**Total Player Count: 0 **\nIn Queue: 0\nIn Match: 0\n\u200b\n<:spar:848005249783431188> **RPUGs:**`,
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			fields: [
				{
					name: `${'► Casual - 3v3'.padEnd(16, ' ')}\u200b`,
					value: `In Queue: 0\nMatch Count: 0`,
					inline: true
				},
				{
					name: `${'► Scrims - League'.padEnd(18,' ')}\u200b`,
					value: `In Queue: 0\nMatch Count: 0`,
					inline: true
				},
				{
					name: '\u200b',
					value: `*(Updates every ${cfg.slapshotLiveTracker.refreshTime} seconds)*`
				},
				{
					name: 'Shortcuts',
					value: `${cmdChannels.tipsCh}  •  ${cmdChannels.queueCh}\n${cmdChannels.updatesCh}  •  ${cmdChannels.commandsCh}  •  ${cmdChannels.otherCh}`,
					inline: false
				},
			],
			footer: {
				text: 'Server time:'
			},
		};
		
		const liveTrackerComponents = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!live about`)
					//.setLabel(`\u200b${buttonLabels['col3'][0]}\u200b`)	//About
					.setLabel(`\u200b${padStringToWidth('About',100,"center")}\u200b`)
					.setEmoji('<:OSLCorgo:1114817237317075025>')
					.setStyle(Discord.ButtonStyle.Secondary)
			);
			
		return {
			files: embedFilesList,
			embed: trackerEmbed,
			components: liveTrackerComponents
		};
	}

	async slapshotQueue() {
		//query slap API
		try {
			var gqResponse = await getPublicMatchmaking();
			return JSON.parse(gqResponse.body);
		}
		catch (err) {
			console.log(gqResponse);
			throw err;
		}
	}

	async OceNumInSlapPlaylists() {
		try {
			const slapQ = await this.slapshotQueue();
			//const qEntities = slapQ["entities"];
			const qPlaylists = slapQ["playlists"];
			
			return qPlaylists;
		}
		catch (err) {
			throw err;
		}
	}

	async refreshTracker() {
		let playerCount = '';
		let queueCount = '';
		let matchCount = '';
		
		try {
			const playlist = await this.OceNumInSlapPlaylists();
			this.reboundQueueCount = playlist["in_queue"];
			this.reboundMatchCount = playlist["in_match"];
			this.reboundPlayerCount = this.reboundQueueCount + this.reboundMatchCount;
		}
		catch (err) {
			console.log(err);
			queueCount = 'Err';
			matchCount = 'Err';
			playerCount = 'Err';
		}

		//rpugs status
		let draftCount = {};
		let featuredMode;
		for (const q of Object.keys(queueController.allQueues)) {
			draftCount[q] = 0;
		}
		
		const drafts = getOngoingDrafts();
		for (const draft of drafts) {
			draftCount[draft.mode] += 1;
		}
		
		let currTime = new Date();
		currTime.setHours(currTime.getHours() + 10);
		const currTimeFormatted = currTime.toISOString().slice(0, 16).replace('T',', ');
		
		//embed
		let embedFilesList = [];
		const embedBanner = new Discord.AttachmentBuilder(`./thumbnails/liveTrackerBanner.png`, {name: 'liveTrackerBanner.png'});
		embedFilesList.push(embedBanner);
		
		//const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/liveTrackerThumb.png`, {name: 'liveTrackerThumb.png'});
		//embedFilesList.push(embedThumb);
		
		const trackerEmbed = {
			color: 0x3f5bff,
			title: `${':hockey: Slapshot Rebound Quick Play'.padEnd(109)}\u200b`,
			//description: 'This number only represents those not currently in a match.\n*(Updates every 6 seconds)*\n\u200b\n**RPUGs:**',
			description: `**Total Player Count: ${this.reboundPlayerCount} **\nIn Queue: ${this.reboundQueueCount}\nIn Match: ${this.reboundMatchCount}\n\u200b\n<:spar:848005249783431188> **RPUGs:**`,
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			fields: [
				{
					name: `${'► Casual - 3v3'.padEnd(16, ' ')}\u200b`,
					value: `In Queue: ${queueController.allQueues.casual.length}\nMatch Count: ${draftCount.casual}`,
					inline: true
				},
				{
					name: `${'► Scrims - League'.padEnd(18,' ')}\u200b`,
					value: `In Queue: ${queueController.allQueues.scrims.length}\nMatch Count: ${draftCount.scrims}`,
					inline: true
				},
				{
					name: `:sparkles: ${queueController.getFeaturedModeFields(queueController.featuredMode)[0].name.slice(0,-4).trimEnd()} :sparkles:`.padEnd(22,' ') + '\u200b',
					value: `In Queue: ${queueController.allQueues[queueController.featuredMode].length}\nMatch Count: ${draftCount[queueController.featuredMode]}`,
					inline: true
				},
				{
					name: '\u200b',
					value: `*(Updates every ${cfg.slapshotLiveTracker.refreshTime} seconds)*`,
					inline: false
				},
				{
					name: 'Shortcuts',
					value: `${cmdChannels.tipsCh}  •  ${cmdChannels.queueCh}\n${cmdChannels.updatesCh}  •  ${cmdChannels.commandsCh}  •  ${cmdChannels.otherCh}`,
					inline: false
				},
			],
			footer: {
				text: `Server time: ${currTimeFormatted} AEST`
			},
		};
		
		if (this.prevReboundPlayerCount !== this.reboundPlayerCount) {
			try {
				bot.user.setActivity(`Oce Pubs: ${this.reboundPlayerCount}`,{type: Discord.ActivityType.Watching});
			}
			catch(err) {
				console.log(err);
			}
		}
		this.prevReboundPlayerCount = this.reboundPlayerCount.valueOf();
		
		try {
			if (this.timeElapsed/60 < this.msgResetPeriod) {
				this.timeElapsed += cfg.slapshotLiveTracker.refreshTime;
				this.trackerMsg = await this.trackerMsg.edit({ embeds: [trackerEmbed]});
			}
			else {
				this.timeElapsed = 0;
				this.trackerMsg = await this.trackerMsg.edit({ files: embedFilesList, embeds: [trackerEmbed]});
			}
		}
		catch (err) {
			console.log(err);
		}
		
		return;
	}

}

export { LivePlayerTracker };