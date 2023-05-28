import Discord from 'discord.js';
//const { GatewayIntentBits, Client, AttachmentBuilder, EmbedBuilder } = Discord;
import SimpleNodeLogger from 'simple-node-logger';
import cfg from '../config.js';
import * as commands from './commands/index.js';
//import { version } from '../package.json' assert { type: "json" };
import { initDatabase } from './scripts/initDatabase.js';
import { idleCheck } from './commands/queue.js';
import { serverTip } from './commands/serverTip.js';
import { updateSlapQueueTextChannel } from './scripts/slapshotQueue.js';
import errorMsg from './scripts/errorMessage.js';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 15; //Increasing max listeners- too many asynchronous tasks at once (I think)

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
bot.on('guildMemberAdd', member => {
	try {
		member.roles.add(member.guild.roles.cache.find(role => role.id === "555294783493636097"))
		
		const welcomeThumb = new Discord.AttachmentBuilder('./thumbnails/OSL_Welcome.png', {name: 'OSL_Welcome.png'}); //from: created on MS Word
		try {
			await member.send({ files: [welcomeThumb] });
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
			else {
				console.log(error);
			}
		}
	}
});

bot.login(cfg.discordToken).then(() => console.log('Bot logged in succesfully!'));

bot.on('ready', async () => {
    console.log('Initializing starting variables...');
    logger.log('info', 'Started bot instance!');

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
	
	//bot startup embed
	let embedFilesList = [];
	const embedThumb = new Discord.AttachmentBuilder('./thumbnails/slapbot.png', {name: 'slapbot.png'}); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
	embedFilesList.push(embedThumb);

	const startEmbed = {
		color: 0xf76df7,
		author: {
			name: `${bot.user.username} is now online!`,
			icon_url: 'attachment://' + embedThumb.name
		}
	};

    console.log(`Ready! Serving for a total of ${server.memberCount} users!\n`);
    logger.log('info', `Bot instance ready! Serving for a total of ${server.memberCount} users!`);
    cmdChannels.updatesCh.send({ files: embedFilesList, embeds: [startEmbed] }).catch(console.error);
	
	//initialise database (if necessary)
	if (initDatabase()) {
		logger.log('info','Initialised database. Data folder was created.');
	}

	//Check if people in queue are idle
	if (cfg.idleParams.idleCheckerEnable) {
		setInterval(idleChecker,cfg.idleParams.checkPeriodmin*60*1000,cfg.idleParams.idleThresholdmin,cfg.idleParams.kickThresholdmin);
	}
	async function idleChecker(iTm,kTm) {
		await idleCheck(iTm,kTm);
	}
	
	//Message server tip to tips channel
	if (cfg.autoTips.autoTipsEnable) {
		setInterval(serverTipCaller,cfg.autoTips.autoTipsPeriod*60*1000);
	}
	async function serverTipCaller() {
		let sendObj = await serverTip();
		await cmdChannels.tipsCh.send({ files: sendObj.embedFiles, embeds: [sendObj.embedMessage]}).catch(console.error);
	}
	
	(async () => { await updateSlapQueueTextChannel(true); })();
	setInterval(updateSlapQueueTextChannelCaller,0000);
	async function updateSlapQueueTextChannelCaller() {
		await updateSlapQueueTextChannel();
	}
	
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
							msgObj: {
								embeds: [response.embedMessage]
							}
						};
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

export { bot, logger, cmdChannels, server };
