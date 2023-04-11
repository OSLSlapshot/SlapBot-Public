import Discord from 'discord.js';
import SimpleNodeLogger from 'simple-node-logger';
import cfg from '../config';
import * as commands from './commands/';
import { version } from '../package.json';
import { initDatabase } from './scripts/initDatabase.js';
import { idleCheck } from './commands/queue';
import { serverTip } from './commands/serverTip';
import { updateSlapQueueTextChannel } from './scripts/slapshotQueue';
import errorMsg from './scripts/errorMessage';
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

const bot = new Discord.Client({ ws: { intents: new Discord.Intents(Discord.Intents.ALL) }});

//Assign Slappas role to new members
bot.on('guildMemberAdd', member => {
    member.roles.add(member.guild.roles.cache.find(role => role.id === "555294783493636097"))
});

bot.login(cfg.discordToken).then(() => console.log('Bot logged in succesfully!'));

bot.on('ready', () => {
    console.log('Initializing starting variables...');
    logger.log('info', 'Started bot instance!');

    // Server setup...
    server = bot.guilds.cache.find(guild => guild.name === cfg.server[cfg.environment]);
    if (!server) {
        console.error(`Server ${cfg.server[cfg.environment]} not found.`);
        logger.log('error', `Server ${cfg.server[cfg.environment]} not found.`);
        process.exit(-1);
    }
	
	//console.log(cfg.cmdChannels[cfg.environment].entries());
    // Channels setup...
    for (const [key,channel] of Object.entries(cfg.cmdChannels[cfg.environment])) {
        const foundChannel = server.channels.cache.find(channels => ((channels.name === channel) && (channels.type === 'text')));
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
	const embedThumb = new Discord.MessageAttachment('./thumbnails/slapbot.png', 'slapbot.png'); //from: https://www.pngkit.com/png/detail/99-993265_bar-graph-clip-art.png
	embedFilesList.push(embedThumb);

	let startEmbed = {
			color: 0xf76df7,
			author: {
				name: `${bot.user.username} is now online!`,
				icon_url: 'attachment://' + embedThumb.name
			}
		};

    console.log(`Ready! Serving for a total of ${server.memberCount} users!\n`);
    logger.log('info', `Bot instance ready! Serving for a total of ${server.memberCount} users!`);
    cmdChannels.updatesCh.send({ files: embedFilesList, embed: startEmbed }).catch(console.error);
	
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
		await cmdChannels.tipsCh.send({ files: sendObj.embedFiles, embed: sendObj.embedMessage}).catch(console.error);
	}
	
	(async () => { await updateSlapQueueTextChannel(true); })();
	setInterval(updateSlapQueueTextChannelCaller,20000);
	async function updateSlapQueueTextChannelCaller() {
		await updateSlapQueueTextChannel();
	}
	
});

/* ==========================================
*  Message parsing
/* ========================================== */

const talkedRecently = new Set();

bot.on('message', async (msg) => {
    let finalMessageObj;
    if ((msg.channel.name !== 'general') && (Object.values(cmdChannels).includes(msg.channel) || msg.channel.type === 'dm') && !msg.author.bot) {
        // Traverse through commands list
		if ((msg.content.startsWith('!')) && (talkedRecently.has(msg.author.id))) {
			finalMessageObj = errorMsg('Command cooldown',`<@${msg.author.id}> Please wait to use another command.`,null,false);
		}
		else {
			for (const key in commands) {
				if (commands.hasOwnProperty(key)) {
					const response = await commands[key](msg);
					if (response) {
						finalMessageObj = response;
						
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
        if (finalMessageObj && finalMessageObj.responseMessage) {
            if (msg.channel.type === 'dm' || finalMessageObj.sendToDm) {
                // Direct message
                msg.author.send(finalMessageObj.responseMessage).catch(console.error);
            } else {
                // Channel message
                msg.channel.send(finalMessageObj.responseMessage).catch(console.error);
                if (finalMessageObj.deleteSenderMessage) {
                    msg.delete({ timeout: 1});
                }
            }
        }
		
		//Response to command for embed message
		if (finalMessageObj && finalMessageObj.embedMessage) {
			if (!finalMessageObj.embedFiles) {
				finalMessageObj.embedFiles = [];
			}
			
            if (msg.channel.type === 'dm' || finalMessageObj.sendToDm) {
                // Direct message
                msg.author.send({ files: finalMessageObj.embedFiles, embed: finalMessageObj.embedMessage}).catch(async function (error) {
					if (error.code === 50007) {
						const errObj = errorMsg('Unable to message the following user:',`<@${msg.author.id}> ${msg.author.username}`,null,false);
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
					}
					else {
						console.error;
					}
				});
            }
			else {
                // Channel message
                msg.channel.send({ files: finalMessageObj.embedFiles, embed: finalMessageObj.embedMessage}).catch(async function (error) {
					if (error.code === 50007) {
						const errObj = errorMsg('Unable to message the following user:',`<@${msg.author.id}> ${msg.author.username}`,null,false);
						await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embed: errObj.embedMessage}).catch(console.error);
					}
					else {
						console.error;
					}
				});
                if (finalMessageObj.deleteSenderMessage) {
                    msg.delete({ timeout: 1});
                }
            }
        }
    }
});

export { bot, logger, cmdChannels, server };
