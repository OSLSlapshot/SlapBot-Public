import Discord from 'discord.js';
//const { GatewayIntentBits, Client, AttachmentBuilder, EmbedBuilder } = Discord;
import SimpleNodeLogger from 'simple-node-logger';
import cfg from '../config.js';
import * as commands from './commands/index.js';
//import { version } from '../package.json' assert { type: "json" };
import { initDatabase } from './scripts/initDatabase.js';
import { serverTip } from './commands/serverTip.js';
import { LivePlayerTracker } from './scripts/slapshotQueue.js';
import { DailyShopTracker } from './scripts/dailyShopTracker.js';
import { Queue } from './scripts/matches.js';
import errorMsg from './scripts/errorMessage.js';
import { EventEmitter } from 'events';
import capitaliseFirstLetter from './utls/capitaliseFirstLetter.js';
import notifyDev from './utls/notifyDev.js';
//import about from './commands/about.js';

EventEmitter.defaultMaxListeners = 15; //Increasing max listeners- too many .on() listeners I think

/* ==========================================
*  Initialize Logger
/* ========================================== */
const logger = SimpleNodeLogger.createRollingFileLogger({
    errorEventName: 'error',
    logDirectory: 'logs',
    fileNamePattern: '<DATE>.log',
    dateFormat: 'YYYY.MM.DD',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss'
});

/* ==========================================
*  Bot Initialization
/* ========================================== */

let server;
const cmdChannels = {};
let queueController;
let shopTrackerController;

//const bot = new Discord.Client({ ws: { intents: new Discord.Intents(Discord.Intents.ALL) }});
const bot = new Discord.Client({
	partials: [
		Discord.Partials.Channel,
		Discord.Partials.Message
	],
	intents: [
			Discord.GatewayIntentBits.Guilds,
			Discord.GatewayIntentBits.GuildMembers,
			Discord.GatewayIntentBits.GuildMessageReactions,
			Discord.GatewayIntentBits.GuildMessages,
			Discord.GatewayIntentBits.DirectMessages,
			Discord.GatewayIntentBits.MessageContent
		]
	});

//Assign Slappas role to new members
bot.on('guildMemberAdd', async member => {
	try {
		if (member.guild.name === cfg.server[cfg.environment]) {
			await member.roles.add(member.guild.roles.cache.find(role => role.id === "555294783493636097"));
		}
		
		const welcomeThumb = new Discord.AttachmentBuilder('./thumbnails/OSL_Welcome.png', {name: 'OSL_Welcome.png'}); //from: created on MS Word
		try {
			await member.send({ files: [welcomeThumb] });
		}
		catch (error) {
			if (error.code === 50007) {
				const errObj = errorMsg('Unable to message the following user:',`<@${member.user.id}> ${member.user.username}`,null,false);
				try {
					await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]});
				}
				catch (error) {
					console.log(error);
				}
			}
			else {
				console.log(error);
			}
		}
	}
	catch (error) {
		logger.log('error', `Error while adding Role ID 555294783493636097 to User ${member.user.id} ${member.user.username}`);
		console.log(error);
	}
});

bot.login(cfg.discordToken).then(() => console.log('Bot logged in succesfully!'));

bot.on('ready', async () => {
    console.log('Initializing starting variables...');
    logger.log('info', 'Started bot instance!');

	//bot.user.setUsername('SlapBot');

    // Server setup...
    server = bot.guilds.cache.find(guild => guild.name === cfg.server[cfg.environment]);
    if (!server) {
        console.error(`Server ${cfg.server[cfg.environment]} not found.`);
        logger.log('error', `Server ${cfg.server[cfg.environment]} not found.`);
        process.exit(-1);
    }

    // Channels setup...
    for (const [key,channel] of Object.entries(cfg.cmdChannels[cfg.environment])) {
        const foundChannel = server.channels.cache.find(channels => ((channels.name === channel) && (channels.type === 0)));
        if (!foundChannel) {
            console.error(`Channel ${channel} not found.`);
            logger.log('error', `Channel ${channel} not found.`);
            process.exit(-1);
        } else {
            cmdChannels[key] = foundChannel;
        }
    }
	
    console.log(`Ready! Serving for a total of ${server.memberCount} users!\n`);
    logger.log('info', `Bot instance ready! Serving for a total of ${server.memberCount} users!`);
	
	//initialise database (if necessary)
	if (initDatabase()) {
		logger.log('info','Initialised database. Data folder was created.');
	}
	
	//Daily start up time of 4 AM AEST - check if so, otherwise notify dev
	let startupTime = new Date();
	startupTime.setHours(startupTime.getHours() + 10);
	
	let startOfDay = new Date(
		startupTime.getFullYear(),
		startupTime.getMonth(),
		startupTime.getDate(),
		0,0,0
	);
	//startOfDay.setHours(startOfDay.getHours() + 10);
	const timeSinceStart = (startupTime - startOfDay)/1000;
	if ((timeSinceStart > 238*60) && (timeSinceStart < 242*60)) {}
	else {
		await notifyDev('', 'Unexpected startup time');
	}

	const startupTimeFormatted = startupTime.toISOString().slice(0, 16).replace('T',', ');
	
	//initialise queue
	//await startQueue();
	queueController = new Queue(cfg.queueStatusMsgId);
	await queueController.startQueue();
	const featuredModeObj = queueController.getFeaturedMode();
	
	//bot startup embed
	let embedFilesList = [];
	const embedThumb = new Discord.AttachmentBuilder('./thumbnails/slapbot.png', {name: 'slapbot.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
	embedFilesList.push(embedThumb);

	const startEmbed = {
		color: 0xf76df7,
		author: {
			name: `${bot.user.username} is now online!`,
			icon_url: 'attachment://' + embedThumb.name
		},
		//description: `Server members: ${server.memberCount}\nFeatured Mode of the Week: ${capitaliseFirstLetter(queueController.featuredMode)}`,
		fields: [
			{
				name: 'Server Members',
				value: server.memberCount,
				inline: true
			},
			{
				name: ':sparkles: Featured Mode of the Week :sparkles:',
				value: capitaliseFirstLetter(featuredModeObj.mode) + '\n\n' + `Remaining: ${featuredModeObj.pouch.join(',')}`,
				inline: false
			}
		],
		footer: {
			text: `${startupTimeFormatted} AEST`
		}
	};
	await cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [startEmbed] }).catch(console.error);
	
	//Check if people in queue are idle
	if (cfg.idleParams.idleCheckerEnable) {
		setInterval(idleChecker,cfg.idleParams.checkPeriodmin*60*1000,cfg.idleParams.idleThresholdmin,cfg.idleParams.kickThresholdmin);
	}
	async function idleChecker(iTm,kTm) {
		await queueController.idleCheck(iTm,kTm);
	}
	
	//Message server tip to tips channel
	if (cfg.autoTips.enable) {
		setInterval(serverTipCaller,cfg.autoTips.period*60*1000);
	}
		let sendObj = await serverTip();
	async function serverTipCaller() {
		await cmdChannels.tipsCh.send({ files: sendObj.embedFiles, embeds: [sendObj.embedMessage]}).catch(console.error);
	}
	
	if (cfg.slapshotLiveTracker.enable) {
		const liveTrackerController = new LivePlayerTracker(cfg.slapshotLiveTracker.msgId);
		await liveTrackerController.startTracker();
		
		setInterval(refreshTrackerCaller,(cfg.slapshotLiveTracker.refreshTime*1000),liveTrackerController);
	}
	
	async function refreshTrackerCaller(trackerObject) {
		await trackerObject.refreshTracker();
	}	
	
	if (cfg.dailyShopTracker.enable) {
		shopTrackerController = new DailyShopTracker(cfg.dailyShopTracker.msgId);
		await shopTrackerController.runTracker();
		shopTrackerController.scheduleTrackerRefresh();
	}
	
	/*
	//let slapQueueMsg = null;
	(async () => { await updateSlapQueueTextChannel(true); })();
	setInterval(updateSlapQueueTextChannelCaller,(cfg.slapshotLiveMsg.refreshTime*1000));
	//setInterval(updateSlapQueueTextChannelCaller,6000);
	async function updateSlapQueueTextChannelCaller() {
		//console.log('1');
		//console.log(slapQueueMsg);
		await updateSlapQueueTextChannel();
		//console.log('2');
		//console.log(slapQueueMsg);
	}
	*/
});

/* ==========================================
*  Message parsing
/* ========================================== */

const talkedRecently = new Set();

bot.on('messageCreate', async (msg) => {
    let finalMessageObj;
    if ((msg.channel.name !== 'general') && (Object.values(cmdChannels).includes(msg.channel) || !msg.guild) && !msg.author.bot) {
        // Traverse through commands list
		if ((msg.content.startsWith('!')) && (talkedRecently.has(msg.author.id))) {
			const err_response = errorMsg('Command cooldown',`<@${msg.author.id}> Please wait to use another command.`,null,false);
			finalMessageObj = {
				msgObj: {
					embeds: [err_response.embedMessage],
					files: err_response.embedFiles
				},
				deleteSenderMessage: err_response.deleteSenderMessage
			};
			if (err_response.sendToDm) {
				finalMessageObj.sendToDm = err_response.sendToDm;
			}
		}
		else {
			for (const key in commands) {
				if (commands.hasOwnProperty(key)) {
					const response = await commands[key](msg);
					if (response) {
						//finalMessageObj = response;
						finalMessageObj = {
							msgObj: {}
						};
						if (response.embedMessage) {
							finalMessageObj.msgObj.embeds = [response.embedMessage]
						}
						if (response.sendToDm) {
							finalMessageObj.sendToDm = response.sendToDm;
						}
						if (response.deleteSenderMessage) {
							finalMessageObj.deleteSenderMessage = response.deleteSenderMessage;
						}
						if (response.embedFiles) {
							finalMessageObj.msgObj.files = response.embedFiles;
						}
						if (response.msgContent) {
							finalMessageObj.msgObj.content = response.msgContent;
						}
						if (response.msgComponents) {
							finalMessageObj.msgObj.components = response.msgComponents;
						}
						if (response.msgEphemeral) {
							finalMessageObj.msgObj.ephermeral = response.msgEphemeral;
						}
						
						// Adds the user to the set so that they can't talk for a minute
						talkedRecently.add(msg.author.id);
						setTimeout(() => {
						  // Removes the user from the set after a minute
						  talkedRecently.delete(msg.author.id);
						}, 2500);
					}
				}
			}
		}

        // Response to command for response message
		if (finalMessageObj) {
			try {
				let replyInfo;
				if (!msg.guild || finalMessageObj.sendToDm) {
					// Direct message
					//await msg.author.send({ content: finalMessageObj.msgContent, files: finalMessageObj.embedFiles, embeds: [finalMessageObj.embedMessage], components: [finalMessageObj.msgComponents] });
					replyInfo = {
						reply: await msg.author.send(finalMessageObj.msgObj),
						replyTo: msg
					}
				}
				else {
					// Channel message
					//await msg.channel.send({ content: finalMessageObj.msgContent, files: finalMessageObj.embedFiles, embeds: [finalMessageObj.embedMessage], components: [finalMessageObj.msgComponents] });
					replyInfo = { 
						reply: await msg.channel.send(finalMessageObj.msgObj),
						replyTo: msg
					}
					//await msg.channel.send({embeds: [new Discord.EmbedBuilder(finalMessageObj.embeds[0])]});
					/*
					bot.on(Discord.Events.InteractionCreate, async interaction => {
						//if (!interaction.isChatInputCommand()) return;
						
						//if (interaction.commandName === 'ping') {
						console.log('helo');
						await interaction.reply(finalMessageObj);
						console.log('helo2');
						//}
					});
					*/
					if (finalMessageObj.deleteSenderMessage) {
						await msg.delete({ timeout: 1});
					}	
				}
				//console.log(reply);
				/*
				bot.on(Discord.Events.InteractionCreate, async interaction => {
					console.log(interaction.user.id);
					console.log(reply.author.id);
					if (interaction.user.id === reply.author.id) {
						console.log('ye boi');
					}
					else {
						console.log('nah bro');
					}
					//console.log(interaction);
				});
				*/
				//check if message has components
				//console.log(replyInfo.reply.msgComponents);
				if (replyInfo.reply.msgComponents) {
					const interactionFilter = (interaction) => interaction.isButton() && interaction.user.id === replyInfo.replyTo.author.id;
					const collector = replyInfo.reply.createMessageComponentCollector({ filter: interactionFilter, idle: 20_000, time: 120_000 });
					collector.once('collect', async i => {
						console.log(`Collected ${i.customId}`);
						//collector.resetTimer();
						//await i.deferReply({ephemeral:  true});
						await i.deferUpdate();
						for (const key in commands) {
							if (commands.hasOwnProperty(key)) {
								msg.content = i.customId;
								//console.log(key);
								//console.log(msg.content);
								const response = await commands[key](msg);
								//console.log(response);
								if (response) {
									let editMessage = {
										embeds: [response.embedMessage]
									}
									if (response.embedFiles) {
										editMessage.files = response.embedFiles;
									}
									if (response.msgContent) {
										editMessage.content = response.msgContent;
									}
									if (response.msgComponents) {
										editMessage.components = response.msgComponents;
									}
									if (response.msgEphemeral) {
										editMessage.ephermeral = response.msgEphemeral;
									}
								
								replyInfo.reply.edit(editMessage);
								
								}
							}
						}
					});
					collector.once('end', collected => {
						console.log(`Collected ${collected.size} items`);
						//console.log(replyInfo.reply);
						let editMessage = {
							embeds: replyInfo.reply.embeds
						}
						if (replyInfo.reply.attachments) {
								editMessage.files = replyInfo.reply.attachments;
						}
						if (replyInfo.reply.content) {
							editMessage.content = replyInfo.reply.content;
						}
						if (replyInfo.reply.components) {
							for (const row of replyInfo.reply.components) {
								for (const comp of row.components) {
									if (comp.data.style !== Discord.ButtonStyle.Link) {
										comp.data.disabled = true;
									}
								}
							}
							editMessage.components = replyInfo.reply.components;
						}
						if (replyInfo.reply.ephemeral) {
							editMessage.ephermeral = replyInfo.reply.ephemeral;
						}
						replyInfo.reply.edit(editMessage);
					});
				}
			}
			catch (error) {
				if (error.code === 50007) {
					const errObj = errorMsg('Unable to message the following user:',`<@${msg.author.id}> ${msg.author.username}`,null,false);
					try {
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]});
					}
					catch (error) {
						console.log(error);
					}
				}
				else if (error.code === 50035) {
					console.log(msg);
					console.log(finalMessageObj);
					console.log(error.requestBody.json.embeds[0]);
					console.log(error);
				}
				else {
					console.log(error);
				}
			}
            
        }
    }
});

/*
const interactedRecently = new Set();

bot.on('interactionCreate', async (interaction) => {
	const userID = interaction.user.id;
	console.log(`int: ${interactedRecently}`);
	if (await interactedRecently.has(userID)) {
		const err_response = errorMsg('Interaction cooldown',`<@${userID}> Please wait to use another command.`,null,false);
		let finalMessageObj = {
			msgObj: {
				embeds: [err_response.embedMessage],
				files: err_response.embedFiles,
				ephemeral: true
			},
			deleteSenderMessage: err_response.deleteSenderMessage
		};
		if (err_response.sendToDm) {
			finalMessageObj.sendToDm = err_response.sendToDm;
		}
	}
	else {
		// Adds the user to the set so that they can't talk for a minute
		talkedRecently.add(userID);
		setTimeout(() => {
		  // Removes the user from the set after a minute
		  talkedRecently.delete(userID);
		}, 2500);
	}
})
*/

bot.on('interactionCreate', async (i) => {
	/*
	if (i.customId.includes('about')) {
		await i.deferReply({ephemeral: true});
		const supportMsg = await about({content: '!a'});
		await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
	}
	*/	
	/*
	const blahblooblee = process.once("uncaughtException", (e) => {
		if (e.code === 10062) {
			console.log('Created: ' + i.createdTimestamp);
			console.log(i);
		}
		throw e;
	});
	console.log(blahblooblee);
	
	setTimeout( () => {
		if (i.replied) {
			blah
		}
	}, 30000);
	*/
	logger.log('info', `Interaction - Username: ${i.user.username}, ComponentType: ${i.componentType}, InteractionId: ${i.customId}`);
	
	/*
	process.once("uncaughtException", async (e) => {
		if (e.code === 10062) {
			await notifyDev('', 'Unknown interaction error thrown');
			
			const errorTime = new Date();
			console.log('Interaction Created: ' + i.createdTimestamp);
			console.log(`Error Thrown: ${errorTime.toISOString()}`);
			console.log(i);
			console.log(e);
		}
		else {
			console.log(e);
			process.exit();
		}
	});
	*/
});


process.on("uncaughtException", async (e) => {
	const errorTime = new Date();
	console.log(`Error Thrown: ${errorTime.toISOString()}`);
	
	if (e.code === 10062) {
		await notifyDev('', 'Unknown interaction error thrown');
		console.log(e);
	}
	else {
		console.log(e);
		process.exit();
	}
});

export { bot, logger, cmdChannels, server, queueController, shopTrackerController };
