import Discord from 'discord.js';
import { getPublicShop } from '../queries/slapshot.js';
import {  getCosmeticNotificationsQuery, updateCosmeticNotificationsQuery, updateCosmeticLibraryQuery } from '../queries/index.js';
import { bot, server, cmdChannels } from '../index.js';
import fs from 'fs';
import cfg from '../../config.js';
import { getStringWidth, padStringToWidth } from 'discord-button-width';
import padSides from '../utls/padSides.js';
import notifyDev from '../utls/notifyDev.js';
import help from '../commands/help.js';
import about from '../commands/about.js';
import cosmetics from '../commands/cosmeticManager.js';
//import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';


class DailyShopTracker {
	constructor(messageId = null) {
		this.shopCh = cmdChannels.dailyShopCh;
		this.shopHistoryCh = cmdChannels.shopHistoryCh;
		this.shopMsgId = messageId;
		
		this.variantsEmoji = '<:variants:1197479466646122546>';
		this.previewEmoji = '📷';
		this.cosmeticTypeEmojiMap = {
			hat: '<:helmet_slapshop:1197531679028428900>',
			hairstyle: '<:hairstyle_slapshop:1197531675194826904>',
			hair_color: '<:hair_color_slapshop:1197536505460183131>',
			facial_hair: '<:facial_hair_slapshop:1197531661622059118>',
			facial_hair_color: '<:facial_hair_color_slapshop:1197536625178189926>',
			skin_color: '<:skin_color_slapshop:1197531693880459414>',
			eyes_decal: '<:eyes_slapshop:1197531659189370970>',
			eyes_item: '<:eyes_item_slapshop:1197531665598263336>',
			mouth_decal: '<:mouth_slapshop:1197531685898690600>',
			mouth_item: '<:mouth_item_slapshop:1197531689824551073>',
			face_decal: '<:face_slapshop:1197531655091535924>',
			gloves: '<:gloves_slapshop:1197531669364748338>',
			jersey: '<:jersey_slapshop:1197531682035748915>',
			back: '<:back_slapshop:1197531618995359764>',
			pants: '<:pants_slapshop:1261272303509966971>',
			puck: '<:puck_slapshop:1197535565298552872>',
			stick: '<:stick_slapshop:1197531696057286666>',
			stick_base_color: '<:stick_base_color_slapshop:1197534073183273040>',
			stick_tape_color: '<:stick_tape_color_slapshop:1197531699672776776>',
			goal_horn: '<:goal_horn_slapshop:1197531671596126359>'
		};
		this.cosmeticTypeNameMap = {
			hat: 'Hat',
			hairstyle: 'Hairstyle',
			hair_color: 'Hair Color',
			facial_hair: 'Facial Hair',
			facial_hair_color: 'Facial Hair Color',
			skin_color: 'Skin Color',
			eyes_decal: 'Eyes',
			eyes_item: 'Glasses',
			mouth_decal: 'Mouth',
			mouth_item: 'Mouth Item',
			face_decal: 'Face',
			gloves: 'Gloves',
			jersey: 'Jersey',
			back: 'Back',
			pants: 'Pants',
			puck: 'Puck',
			stick: 'Stick',
			stick_base_color: 'Stick Base Color',
			stick_tape_color: 'Stick Tape Color',
			goal_horn: 'Goal Horn'
		};
		this.cosmeticRarityEmojiMap = {
			0: '🟥', //exclusive
			1: '🟨', //legendary
			2: '🟪', //epic
			3: '🟦', //rare
			4: '🟩', //uncommon
			5: '⬜', //common
		};
		
		this.shopRefreshAttempts = 0;
	}
	
	setDefaultDailyShopState() {
		this.dailyShopState = {
			featured: {},
			daily: {},
			popular: {}
		};
	}
	
	async runTracker(scheduledCall = false) {
		this.notif_dtb = await this.readCosmeticNotificationsDtb();
		await this.getDailyShop();
		
		let shopMsgEmb = this.getShopMsg();
		
		if (this.shopMsgId) {
			try {
				this.shopMsg = await this.shopCh.messages.fetch(this.shopMsgId);
				this.shopMsg = await this.shopMsg.edit({content: '', files: shopMsgEmb.files, embeds: shopMsgEmb.embeds, components: shopMsgEmb.components});
			}
			catch (error) {
				if (error.code === 10008) {
					console.error(`Message ID ${this.shopMsgId} not found in channel ${this.shopCh}.`);
					console.log(error);
				}
				else {
					console.log(error);
				}
			}
		}
		else {
			this.shopMsg = await this.shopCh.send({content: '', files: shopMsgEmb.files, embeds: shopMsgEmb.embeds, components: shopMsgEmb.components});
			this.shopMsgId = this.shopMsg.id;
			console.log(`New shop tracker message sent. The message ID is ${this.shopMsgId}.`);
		}
		
		if (!this.shopMsgCollector) {
			this.shopMsgCollector = await this.shopMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button });
			
			try{
				this.shopMsgCollector.on('collect', async i => {
					await i.deferReply({ephemeral: true});
					
					const buttonPressed = i.customId;
					const cmdCalled = buttonPressed.slice(6);
					const cmdCalledArgs = cmdCalled.split(' ');
					const cmdType = cmdCalledArgs[0];
					
					switch (cmdType) {
						case 'library':
							return await cosmetics(i);
							break;
						case 'help':
							await help(i);
							//await i.editReply({content: 'Please use `!help` in ' + `${cmdChannels.commandsCh}` + ' for info', emphemeral: true})
							break;
						case 'about':
							const supportMsg = await about({content: '!a'});
							await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
							break;
						case 'featured':
						case 'daily':
						case 'popular':
							const cosmeticInfo = this.dailyShopState[cmdType][cmdCalledArgs[1]];
							let pageNumTrack = 1;
							let notif_enabled = this.getCosmeticNotifState(i.user.id, cmdType, cmdCalledArgs[1]);
							const initial_notif_state = notif_enabled;
							
							const cosmeticMsg = this.generateCosmeticMsg(cmdType,cmdCalledArgs[1], {pageNum: pageNumTrack, notif: notif_enabled} );
							await i.editReply({files: cosmeticMsg.embedFiles, embeds: [cosmeticMsg.embedMessage], components: cosmeticMsg.components, ephemeral: true})
							.then(
								async (msg) => {
									setTimeout(() => i.deleteReply(msg), 120000);
								}
							);
							
							let sentCosmeticMsg = await i.fetchReply();
							
							const cosmeticMsgCollector = await sentCosmeticMsg.createMessageComponentCollector({ componentType: Discord.ComponentType.Button, idle: 5000 });
							try {
								cosmeticMsgCollector.on('collect', async i => {
									await i.deferUpdate();
									
									const buttonPressed = i.customId;
									const cmdCalled = buttonPressed.slice(10);
									//const cmdCalledArgs = cmdCalled.split(' ');
									//const cmdType = cmdCalledArgs[0];
									
									switch (cmdCalled) {
										case 'left':
											pageNumTrack -= 1;
											break;
										case 'right':
											pageNumTrack += 1;
											break;
										case 'bell':
											notif_enabled = !notif_enabled;
											break;
									}
									const editedCosmeticMsg = this.generateCosmeticMsg(cmdType,cmdCalledArgs[1], {pageNum: pageNumTrack, notif: notif_enabled});
									await i.editReply({files: editedCosmeticMsg.embedFiles, embeds: [editedCosmeticMsg.embedMessage], components: editedCosmeticMsg.components, ephemeral: true})
									
									if (cmdCalled === 'bell') {
										await i.followUp({content: `🔔 You have **${notif_enabled ? 'enabled' : 'disabled'}** notifications for ${this.cosmeticTypeEmojiMap[cosmeticInfo.type]} ${cosmeticInfo.name}.\n*Your settings will be updated in the database once this command expires.*`, ephemeral: true})
										.then(
											async (msg) => {
												setTimeout(() => i.deleteReply(msg), 10000);
											}
										);
									}
								});
							}
							catch (err) {
								console.log('Error in cosmetic message listener');
								console.log(err);
							}
							
							cosmeticMsgCollector.once('end', async (collected,reason) => {
								if (reason === 'idle') {
									if (notif_enabled !== initial_notif_state) {
										await this.updateCosmeticNotifDtb(i.user.id, cmdType, cmdCalledArgs[1],notif_enabled);
									}
								}
							});
							
							break;
					}	
				});
			}
			catch (err) {
				console.log('Error in shop tracker listener');
				console.log(err);
			}
		}
		
		if (scheduledCall) {
			const all_cosmetics = [...Object.values(this.dailyShopState.featured), ...Object.values(this.dailyShopState.daily), ...Object.values(this.dailyShopState.popular)];
			//missing previews
			let missingPreviewsMsg = '';
			let inLibPreviewsMsg = '';
			for (const cosmetic of all_cosmetics) {
				if (cosmetic.preview_exists) {
					if ((cosmetic.has_variants) && (!cosmetic.variant_preview_exists)) {
						missingPreviewsMsg += `\nName: ${cosmetic.name}, Key: ${cosmetic.key}, Type: ${cosmetic.type}, Variants preview missing`;
					}
					else {
						inLibPreviewsMsg += `\nName: ${cosmetic.name}, Key: ${cosmetic.key}, Type: ${cosmetic.type}`;
					}
				}
				else {
					missingPreviewsMsg += `\nName: ${cosmetic.name}, Key: ${cosmetic.key}, Type: ${cosmetic.type}`;
					
					if ((cosmetic.has_variants) && (!cosmetic.variant_preview_exists)) {
						missingPreviewsMsg += `, Variants preview missing`;
					}
				}
				
				this.notif_dtb = await this.readCosmeticNotificationsDtb();
				
				if ((this.notif_dtb[cosmetic.type]) && (this.notif_dtb[cosmetic.type][cosmetic.key])) {
					for (const user of this.notif_dtb[cosmetic.type][cosmetic.key]) {
						try {
							const cosmeticsDir = './thumbnails/cosmetics/library/'
							let embedFilesList = [];
							if (cosmetic.preview_exists || cosmetic.lazp_preview_exists) {
								switch (cosmetic.type) {
									case 'goal_horn':
										const embedFile = new Discord.AttachmentBuilder(`${cosmeticsDir}/slapbot/goal_horn/${cosmetic.key}.ogg`, {name: `${cosmetic.key}.ogg`});
										embedFilesList.push(embedFile);
										break;
									default:
										const embedThumb = new Discord.AttachmentBuilder(`${cosmeticsDir}/${cosmetic.preview_exists ? 'slapbot' : 'lazp'}/${cosmetic.type}/${cosmetic.key}.png`, {name: `${cosmetic.key}.png`});
										embedFilesList.push(embedThumb);
								}
							}
							
							const playerClient = await bot.users.fetch(user);
							await playerClient.send({content: `${this.cosmeticTypeEmojiMap[cosmetic.type]} **${cosmetic.name} (${this.cosmeticTypeNameMap[cosmetic.type]})** is available in the Slapshop for **${cosmetic.price}** <:pux:1188661791304196216> today.\n${cmdChannels.dailyShopCh}`, files: embedFilesList});
						}
						catch (e) {	//fail safe- if the DM fails, ignore the issue as it is not critical to the bot's operation
							if (e.code === 50007) {
								console.log(`Failed to DM user ${user}`);
							}
							else {
								console.log('Error DM-ing user for daily shop notification')
								console.log(e);
							}
						}
						/*
						catch (e) {
							if (e.code === 50007) {
								const errObj = errorMsg('Unable to message the following user:',`<@${player.discordId}>/${player.username}`,null,false);
								await cmdChannels.updatesCh.send({ files: errObj.embedFiles, embeds: [errObj.embedMessage]}).catch(console.error);
							}
							else {
								throw e;
							}
						}
						*/
					}
				}
			}
			if (missingPreviewsMsg.length > 0) {
				missingPreviewsMsg = '**Missing Previews:**' + missingPreviewsMsg;
			}
			if (inLibPreviewsMsg.length > 0) {
				inLibPreviewsMsg = '**In Library:**' + inLibPreviewsMsg;
			}
			
			//fs.appendFileSync('./thumbnails/cosmetics/cosmetic_log.txt',JSON.stringify(all_cosmetics)+'\n');
			await this.updateCosmeticLibrary();
			
			await this.shopHistoryCh.send({content: '', files: shopMsgEmb.files, embeds: shopMsgEmb.embeds});
			await this.shopHistoryCh.send({content: missingPreviewsMsg + '\n' + inLibPreviewsMsg});
			await this.shopCh.send({content: `<@&${cfg.dailyShopTracker.shopperRoleId}>`})
			.then(
				async (msg) => {
					setTimeout(() => msg.delete());
				}
			);
			await this.scheduleTrackerRefresh();
		}
	}

	async scheduleTrackerRefresh() {
		let timeToRefresh = null;
		try {
			timeToRefresh = Object.values(this.dailyShopState.daily)[0].seconds_remaining*1000 + 30*1000; //milliseconds; 30 second margin
		}
		catch (err) {
			console.log('Couldn\'t set timeToRefresh');
			console.log(err);
		}
		//timeToRefresh = null;
		
		this.shopRefreshAttempts += 1;
		if (!timeToRefresh) {
			if (this.shopRefreshAttempts === 7) {	//tried for a minute, 7 attempts
				this.setDefaultDailyShopState();
				await this.getDailyShop();	//query API again incase there was an error
			}
			else if (this.shopRefreshAttempts === 13) {	//tried for a minute after API query
				await notifyDev(`Failed to refresh daily shop.\n Daily shop state:`,'Failed to refresh daily shop. Check console.');
				console.log(this.dailyShopState);
				
				await this.shopCh.send({content: `Failed to refresh the shop today. The developer has been notified. Please wait while it is investigated.\nThe buttons above have been disabled.`})
				
				this.shopMsgCollector.stop();
				
				return;
			}
			setTimeout((await this.scheduleTrackerRefresh).bind(this), 10000);	//timeToRefresh returned
			
			return;
		}
		//console.log(timeToRefresh);
		//console.log(this.dailyShopState);
		//timeToRefresh = 10*1000;
		this.shopRefreshAttempts = 0;
		setTimeout((await this.runTracker).bind(this),timeToRefresh,true);
	}

	getDailyShopBanner() {
		const embedImg = new Discord.AttachmentBuilder(`./thumbnails/dailyShopMsgBanner.png`, {name: 'dailyShopMsgBanner.png'});
		
		return embedImg;
	}
	
	getShopMsg() {
		//refresh time
		let currTime = new Date();
		currTime.setHours(currTime.getHours() + 10);
		const currTimeFormatted = currTime.toISOString().slice(0, 16).replace('T',', ');
		
		let embedFilesList = [];
		const dailyShopBanner = this.getDailyShopBanner();
		embedFilesList.push(dailyShopBanner);
		
		//featured shop embed
		const featuredShopEmbed = {
			color: 0x3f5bff,
			fields: []
		};
		featuredShopEmbed.fields.push({
			//name: `\u200b\n${':sparkles: Featured :sparkles:'.padEnd(156)}\u200b`,
			name: `\u200b${padSides(':sparkles: Featured :sparkles:',156)}\u200b`,
			value: `*Refreshes <t:${Date.parse(Object.values(this.dailyShopState.featured)[0].end_time)/1000}:R>*`,
		});
		for (const cosmetic of Object.values(this.dailyShopState.featured)) {
			featuredShopEmbed.fields.push({
				name: `${this.cosmeticRarityEmojiMap[cosmetic.rarity_rank]}${this.cosmeticTypeEmojiMap[cosmetic.type]} ${cosmetic.name} ${cosmetic.has_variants ? this.variantsEmoji : ''} ${(cosmetic.preview_exists || cosmetic.lazp_preview_exists) ? this.previewEmoji : ''}`,
				value: `<:pux:1188661791304196216> ${cosmetic.price}`,
				inline: true
			});
		}
		featuredShopEmbed.fields.push({
			name: '\u200b',
			value: '\u200b',
			inline: true
		});
		
		//daily shop embed
		const dailyShopEmbed = {
			color: 0x3f5bff,
			fields: []
		};
		dailyShopEmbed.fields.push({
			//name: `\u200b\n<:business:728089147125792774> Daily <:business:728089147125792774>`,
			name: `\u200b${padSides('<:business:728089147125792774> Daily <:business:728089147125792774>',201)}\u200b`,
			//name: `\u200b\n${'<:business:728089147125792774> Daily <:business:728089147125792774>'.padEnd(200)}\u200b`,
			value: `*Refreshes <t:${Date.parse(Object.values(this.dailyShopState.daily)[0].end_time)/1000}:R>*`,
		});
		for (const cosmetic of Object.values(this.dailyShopState.daily)) {
			dailyShopEmbed.fields.push({
				name: `${this.cosmeticRarityEmojiMap[cosmetic.rarity_rank]}${this.cosmeticTypeEmojiMap[cosmetic.type]} ${cosmetic.name} ${cosmetic.has_variants ? this.variantsEmoji : ''} ${(cosmetic.preview_exists || cosmetic.lazp_preview_exists) ? this.previewEmoji : ''}`,
				value: `<:pux:1188661791304196216> ${cosmetic.price}`,
				inline: true
			});
		}
		
		//popular shop embed
		const popularShopEmbed = {
			color: 0x3f5bff,
			fields: []
		};
		popularShopEmbed.fields.push({
			//name: `\u200b\n<:business:728089147125792774> Daily <:business:728089147125792774>`,
			name: `\u200b${padSides('<:rich_gang:782892310627221545> Popular <:rich_gang:782892310627221545>',199)}\u200b`,
			//name: `\u200b\n${'<:business:728089147125792774> Daily <:business:728089147125792774>'.padEnd(200)}\u200b`,
			value: `*Refreshes <t:${Date.parse(Object.values(this.dailyShopState.popular)[0].end_time)/1000}:R>*`,
		});
		
		for (const cosmetic of Object.values(this.dailyShopState.popular)) {
			popularShopEmbed.fields.push({
				name: `${this.cosmeticRarityEmojiMap[cosmetic.rarity_rank]}${this.cosmeticTypeEmojiMap[cosmetic.type]} ${cosmetic.name} ${cosmetic.has_variants ? this.variantsEmoji : ''} ${(cosmetic.preview_exists || cosmetic.lazp_preview_exists) ? this.previewEmoji : ''}`,
				value: `<:pux:1188661791304196216> ${cosmetic.price}`,
				inline: true
			});
		}
		popularShopEmbed.fields.push({
			name: '\u200b',
			value: '\u200b',
			inline: true
		});
		
		const shopLegendEmbed = {
			color: 0x3f5bff,
			title: `${'Symbol Guide'.padEnd(122)}\u200b`,
			description: `${this.cosmeticRarityEmojiMap['1']} Legendary᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['2']} Epic᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['3']} Rare᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['4']} Uncommon᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['5']} Common\n${this.variantsEmoji} Has variants᲼᲼•᲼᲼${this.previewEmoji} Preview available`,
			//title: `${':hockey: Slapshot Rebound In-Game Shop'.padEnd(105)}\u200b`,
			//description: `${this.cosmeticTypeEmojiMap.hairstyle}${this.cosmeticTypeEmojiMap.hair_color}${this.cosmeticTypeEmojiMap.facial_hair}${this.cosmeticTypeEmojiMap.facial_hair_color}${this.cosmeticTypeEmojiMap.skin_color}${this.cosmeticTypeEmojiMap.eyes_decal}${this.cosmeticTypeEmojiMap.mouth_decal}${this.cosmeticTypeEmojiMap.face_decal} Appearance᲼•᲼${this.cosmeticTypeEmojiMap.goal_horn} Goal Horn\n${this.cosmeticTypeEmojiMap.hat}${this.cosmeticTypeEmojiMap.glasses}${this.cosmeticTypeEmojiMap.mouth_item}${this.cosmeticTypeEmojiMap.gloves}${this.cosmeticTypeEmojiMap.jersey}${this.cosmeticTypeEmojiMap.back} Gear᲼•᲼${this.cosmeticTypeEmojiMap.puck}${this.cosmeticTypeEmojiMap.stick}${this.cosmeticTypeEmojiMap.stick_base_color}${this.cosmeticTypeEmojiMap.stick_tape_color} Equipment\n${this.cosmeticRarityEmojiMap['1']} Legendary᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['2']} Epic᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['3']} Rare᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['4']} Uncommon᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['5']} Common\n${this.variantsEmoji} Has variants`,
			//description: `${this.cosmeticRarityEmojiMap['1']} Legendary᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['2']} Epic᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['3']} Rare᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['4']} Uncommon᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['5']} Common\n${this.variantsEmoji} Has variants`,
			fields: [],
			footer: {
				text: `Last refreshed: ${currTimeFormatted} AEST`
			},
		};
		/*
		shopLegendEmbed.fields.push({
			name: '\u200b',
			value: `${this.cosmeticRarityEmojiMap['1']} Legendary᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['2']} Epic᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['3']} Rare᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['4']} Uncommon᲼᲼•᲼᲼${this.cosmeticRarityEmojiMap['5']} Common\n${this.variantsEmoji} Has variants᲼᲼•᲼᲼${this.previewEmoji} Preview available`,
		});
		*/
		return {
			files: embedFilesList,
			embeds: [featuredShopEmbed, dailyShopEmbed, popularShopEmbed, shopLegendEmbed],
			components: this.generateShopComponents()
		};
	}

	generateShopComponents() {
		let componentRows = [];
		
		const buttonWidth = 83;
		const row0 = new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!shop library`)
				.setLabel(`\u200b${padStringToWidth('Cosmetic Library',2*buttonWidth,"center")}\u200b`)
				.setEmoji('📚')
				.setStyle(Discord.ButtonStyle.Danger)
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!shop help`)
				.setLabel(`\u200b${padStringToWidth('Help',buttonWidth,"center")}\u200b`)
				.setEmoji('ℹ️')
				.setStyle(Discord.ButtonStyle.Secondary)
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!shop about`)
				.setLabel(`\u200b${padStringToWidth('About',buttonWidth,"center")}\u200b`)
				.setEmoji('<:OSLCorgo:1114817237317075025>')
				.setStyle(Discord.ButtonStyle.Secondary)
		);
		componentRows.push(row0);
		
		this.setButtonWidths();
		
		const row1 = this.generateFeaturedShopComponents();
		componentRows.push(row1);
		
		const dailyRows = this.generateDailyShopComponents();
		componentRows.push(dailyRows[0]);
		componentRows.push(dailyRows[1]);
		
		const popularRows = this.generatePopularShopComponents();
		componentRows.push(popularRows);
		
		return componentRows;
	}
	
	setButtonWidths() {
		const defaultButtonWidth = 70;
		
		const featuredCosmetics = Object.values(this.dailyShopState.featured);
		const dailyCosmetics = Object.values(this.dailyShopState.daily);
		const popularCosmetics = Object.values(this.dailyShopState.popular);
		
		//console.log(featuredCosmetics);
		//console.log(dailyCosmetics);
		
		let buttonLabels = {
			col1: [],
			col2: [],
			col3: [],
			col4: [],
			col5: []
		}
		
		for (let i = 0; i < 5; i++) {
			buttonLabels[`col${i+1}`].push(featuredCosmetics[i].name);
			buttonLabels[`col${i+1}`].push(dailyCosmetics[i].name);
			buttonLabels[`col${i+1}`].push(dailyCosmetics[i+5].name);
			buttonLabels[`col${i+1}`].push(popularCosmetics[i].name);
		}
		
		this.buttonWidths = {};
		
		for (const [col,labels] of Object.entries(buttonLabels)) {
			const maxColWidth = Math.max(...labels.map( (lbl) => getStringWidth(lbl) ));
			this.buttonWidths[col] = maxColWidth > defaultButtonWidth ? maxColWidth : defaultButtonWidth;
		}
		
		return;
	}
	
	generateFeaturedShopComponents() {
		const featuredCosmetics = Object.values(this.dailyShopState.featured);
		let row = new Discord.ActionRowBuilder();
		for (const [idx,cosmetic] of Object.entries(featuredCosmetics)) {
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!shop featured ${cosmetic.type}/${cosmetic.key}`)
					.setLabel('\u200b'+ padStringToWidth(`${cosmetic.name}`,this.buttonWidths[`col${parseInt(idx)+1}`],"center") + '\u200b')
					.setEmoji(`${this.cosmeticTypeEmojiMap[cosmetic.type]}`)
					.setStyle(Discord.ButtonStyle.Primary)
			)
		}
		
		return row;
	}

	generateDailyShopComponents() {
		let buttonRows = [];
		
		let row2 = new Discord.ActionRowBuilder();
		for (let i = 0; i <5; i++) {
			const cosmetic = Object.values(this.dailyShopState.daily)[i];
			row2.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!shop daily ${cosmetic.type}/${cosmetic.key}`)
					.setLabel('\u200b'+ padStringToWidth(`${cosmetic.name}`,this.buttonWidths[`col${i+1}`],"center") + '\u200b')
					.setEmoji(`${this.cosmeticTypeEmojiMap[cosmetic.type]}`)
					.setStyle(Discord.ButtonStyle.Success)
			)
		}
		buttonRows.push(row2);
		
		let row3 = new Discord.ActionRowBuilder();
		for (let i = 5; i < 10; i++) {
			const cosmetic = Object.values(this.dailyShopState.daily)[i];
			row3.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!shop daily ${cosmetic.type}/${cosmetic.key}`)
					.setLabel('\u200b'+ padStringToWidth(`${cosmetic.name}`,this.buttonWidths[`col${i-4}`],"center") + '\u200b')
					.setEmoji(`${this.cosmeticTypeEmojiMap[cosmetic.type]}`)
					.setStyle(Discord.ButtonStyle.Success)
			)
		}
		buttonRows.push(row3);
		
		return buttonRows;
	}
	
	generatePopularShopComponents() {
		const popularCosmetics = Object.values(this.dailyShopState.popular);
		let row = new Discord.ActionRowBuilder();
		for (const [idx,cosmetic] of Object.entries(popularCosmetics)) {
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!shop popular ${cosmetic.type}/${cosmetic.key}`)
					.setLabel('\u200b'+ padStringToWidth(`${cosmetic.name}`,this.buttonWidths[`col${parseInt(idx)+1}`],"center") + '\u200b')
					.setEmoji(`${this.cosmeticTypeEmojiMap[cosmetic.type]}`)
					.setStyle(Discord.ButtonStyle.Primary)
			)
		}
		
		return row;
	}

	generateCosmeticMsg(shopType,cosmeticKey,component_state) {
		let variantPage = component_state.pageNum;
		const cosmeticInfo = this.dailyShopState[shopType][cosmeticKey];
		
		let authorStr = '';
		if (cosmeticInfo.preview_exists || cosmeticInfo.lazp_preview_exists) {
			if ((cosmeticInfo.has_variants) && (cosmeticInfo.variant_preview_exists || cosmeticInfo.lazp_variant_preview_exists)) {
				authorStr = 'Slapshop Cosmetic';
			}
			else {
				authorStr = `${'Slapshop Cosmetic'.padEnd(95)}\u200b`;
			}
		}
		else {
			authorStr = `${'Slapshop Cosmetic'.padEnd(127)}\u200b`;
		}
		
		let embedFilesList = [];
		const embedAuthor = new Discord.AttachmentBuilder(`./thumbnails/cosmeticMsgAuthor.png`, {name: 'cosmeticMsgAuthor.png'});
		embedFilesList.push(embedAuthor);
		
		//last seen str
		const lastSeenStr = cosmeticInfo.last_seen ? `<t:${Date.parse(cosmeticInfo.last_seen)/1000}:R>` : '-';
		
		const cosmeticEmbed = {
			color: parseInt(cosmeticInfo.rarity_color.replace('#','0x'),16),
			author: {
				name: authorStr,
				icon_url: 'attachment://' + embedAuthor.name
			},
			title: `${cosmeticInfo.name}`,
			description: `${cosmeticInfo.description}`,
			fields: [
				{
					name: 'Type',
					value: `${this.cosmeticTypeEmojiMap[cosmeticInfo.type]} ${this.cosmeticTypeNameMap[cosmeticInfo.type]}`,
					inline: true
				},
				{
					name: 'Rarity',
					value: `${this.cosmeticRarityEmojiMap[cosmeticInfo.rarity_rank]} ${cosmeticInfo.rarity_name}`,
					inline: true
				},
				{
					name: 'Price',
					value: `<:pux:1188661791304196216> ${cosmeticInfo.price}`,
					inline: true
				},
				{
					name: 'Variants?',
					value: `${cosmeticInfo.has_variants ? '✅' : '❌'}`,
					inline: true
				},
				{
					name: 'Last Seen',
					value: lastSeenStr,
					inline: true
				},
				{
					name: 'Expires',
					value: `<t:${Date.parse(cosmeticInfo.end_time)/1000}:R>`,
					inline: true
				},
				
			],
			//footer: {
			//	text: `\u200b${''.padEnd(183)}\u200b`
			//}
		};
		
		const cosmeticsDir = './thumbnails/cosmetics/library/'
		if (cosmeticInfo.preview_exists || cosmeticInfo.lazp_preview_exists) {
			switch (cosmeticInfo.type) {
				case 'goal_horn':
					const embedFile = new Discord.AttachmentBuilder(`${cosmeticsDir}/slapbot/goal_horn/${cosmeticInfo.key}.ogg`, {name: `${cosmeticInfo.key}.ogg`});
					embedFilesList.push(embedFile);
					break;
				default:
					const embedThumb = new Discord.AttachmentBuilder(`${cosmeticsDir}/${cosmeticInfo.preview_exists ? 'slapbot' : 'lazp'}/${cosmeticInfo.type}/${cosmeticInfo.key}.png`, {name: `${cosmeticInfo.key}.png`});
					embedFilesList.push(embedThumb);
					
					cosmeticEmbed.thumbnail = {
						url: 'attachment://' + embedThumb.name
					};
			}
		}
		let numVariantPages = 1;
		if ((cosmeticInfo.has_variants) && (cosmeticInfo.variant_preview_exists || cosmeticInfo.lazp_variant_preview_exists)) {
			const cosmeticTypeDir = `${cosmeticsDir}/${cosmeticInfo.variant_preview_exists ? 'slapbot' : 'lazp'}/${cosmeticInfo.type}/`;
			let variantFiles;
			switch (cosmeticInfo.type) {
				case 'goal_horn':
					variantFiles = fs.readdirSync(cosmeticTypeDir)
						.filter( (fn) => {
							return (new RegExp(`^${cosmeticInfo.key}_variants` + '.*\.(ogg)$')).test(fn)
						});
						
					for (const f of variantFiles) {
						const embedFile = new Discord.AttachmentBuilder(`${cosmeticTypeDir}/${f}`, {name: `${f}`});
						embedFilesList.push(embedFile);
					}
					break;
				default:
					variantFiles = fs.readdirSync(cosmeticTypeDir)
						.filter( (fn) => {
							return (new RegExp(`^${cosmeticInfo.key}_variants` + '.*\.(png|jpg)$')).test(fn)
						});
					numVariantPages = variantFiles.length;
					
					//buttons can be spammed to go past page bounds
					if (variantPage < 1) {
						variantPage = 1;
					}
					else if (variantPage > numVariantPages) {
						variantPage = numVariantPages;
					}
					
					const variantPageStr = variantPage === 1 ? '' : `_${variantPage}`
					const embedImage = new Discord.AttachmentBuilder(`${cosmeticTypeDir}/${cosmeticInfo.key}_variants${variantPageStr}.png`, {name: `${cosmeticInfo.key}_variants${variantPageStr}.png`});
					embedFilesList.push(embedImage);
					
					cosmeticEmbed.image = {
						url: 'attachment://' + embedImage.name
					};
			}
		}
		
		//const cosmeticMsgComponents = numVariantPages === 1 ? []: this.generateCosmeticMsgComponents(variantPage, numVariantPages);
		const cosmeticMsgComponents = this.generateCosmeticMsgComponents(variantPage, numVariantPages, component_state.notif);
		
		return {
			embedFiles: embedFilesList,
			embedMessage: cosmeticEmbed,
			components: cosmeticMsgComponents
		};
	}
	
	generateCosmeticMsgComponents(page,lastpage,notif_state) {
		let buttonRow = [];
		
		let row = new Discord.ActionRowBuilder()
		
		if (lastpage !== 1) {
			if (page === 1) {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic left`)
						//.setLabel('\u200b'+ padStringToWidth(`◄`,170,"center") + '\u200b')
						.setEmoji(`◀️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(true)
				)
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic right`)
						//.setLabel('\u200b'+ padStringToWidth(`►`,170,"center") + '\u200b')
						.setEmoji(`▶️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(false)
				)
			}
			else if (page === lastpage) {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic left`)
						//.setLabel('\u200b'+ padStringToWidth(`◄`,170,"center") + '\u200b')
						.setEmoji(`◀️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(false)
				)
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic right`)
						//.setLabel('\u200b'+ padStringToWidth(`►`,170,"center") + '\u200b')
						.setEmoji(`▶️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(true)
				)
			}
			else {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic left`)
						//.setLabel('\u200b'+ padStringToWidth(`◄`,170,"center") + '\u200b')
						.setEmoji(`◀️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(false)
				)
				.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetic right`)
						//.setLabel('\u200b'+ padStringToWidth(`►`,170,"center") + '\u200b')
						.setEmoji(`▶️`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(false)
				)
			}
		}
		
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetic bell`)
				.setEmoji(`${notif_state ? '🔔' : '🔕'}`)
				.setStyle(notif_state ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger)
		)
		
		buttonRow.push(row);
		return buttonRow;
	}
	
	getCosmeticNotifState(userId,shopType,cosmeticKey) {
		const cosmeticInfo = this.dailyShopState[shopType][cosmeticKey];
		const cos_type = cosmeticInfo.type;
		const cos_key = cosmeticInfo.key;
		
		//const type_key = `${cos_type}/${cos_key}`;
		
		let notifUserList = null;
		if (this.notif_dtb[cos_type]) {
			notifUserList = this.notif_dtb[cos_type][cos_key];
		}
		
		if ((notifUserList) && (notifUserList.includes(userId))) {
			return true;
		}
		else {
			return false;
		}
	}
	
	async readCosmeticNotificationsDtb() {
		return await getCosmeticNotificationsQuery();
	}
	
	async updateCosmeticNotifDtb(userId,shopType,cosmeticKey,is_notif_enabled) {
		this.notif_dtb = await this.readCosmeticNotificationsDtb();
		const cosmeticInfo = this.dailyShopState[shopType][cosmeticKey];
		const cos_type = cosmeticInfo.type;
		const cos_key = cosmeticInfo.key;
		
		if (!this.notif_dtb[cos_type]) {
			this.notif_dtb[cos_type] = {};
		}
		if (!this.notif_dtb[cos_type][cos_key]) {
			this.notif_dtb[cos_type][cos_key] = [];
		}
		
		let notifUserList = this.notif_dtb[cos_type][cos_key];
		
		if (is_notif_enabled) {
			if (!notifUserList.includes(userId)) {
				notifUserList.push(userId);
			}
		}
		else {
			notifUserList = notifUserList.filter( u => u === toString(userId));
			
			if (notifUserList.length === 0) {
				delete this.notif_dtb[cos_type][cos_key];
				if (Object.keys(this.notif_dtb[cos_type]).length === 0) {
					delete this.notif_dtb[cos_type];
				}
			}
		}
			
		await updateCosmeticNotificationsQuery(this.notif_dtb);
	}
	
	async updateCosmeticLibrary() {
		//console.log(...
		const all_cosmetics = {...this.dailyShopState.featured, ...this.dailyShopState.daily, ...this.dailyShopState.popular};
		await updateCosmeticLibraryQuery(all_cosmetics, true);
	}

	async runDailyShopQuery() {
		//query slap API
		try {
			var gqResponse = await getPublicShop();
			return JSON.parse(gqResponse.body);
		}
		catch (err) {
			console.log(gqResponse);
			throw err;
		}
	}
	
	async getDailyShop() {
		this.setDefaultDailyShopState();
		const dailyShopQuery = await this.runDailyShopQuery();
		
		const cosmeticsDir = './thumbnails/cosmetics/library/';
		
		for (const cosmetic of dailyShopQuery) {
			const fileExt = cosmetic.type === 'goal_horn' ? 'ogg' : 'png';
			const preview_exists = fs.existsSync(cosmeticsDir + '/slapbot/' + `/${cosmetic.type}/${cosmetic.key}.${fileExt}`);
			cosmetic.preview_exists = preview_exists;
			if (!preview_exists) {
				cosmetic.lazp_preview_exists = fs.existsSync(cosmeticsDir + '/lazp/' + `/${cosmetic.type}/${cosmetic.key}.png`);
			}
			
			if (cosmetic.has_variants) {
				const fileExt = cosmetic.type === 'goal_horn' ? 'ogg' : 'png';
				const variant_preview_exists = fs.existsSync(cosmeticsDir + '/slapbot/' + `/${cosmetic.type}/${cosmetic.key}_variants.${fileExt}`);
				cosmetic.variant_preview_exists = variant_preview_exists;
				if (!variant_preview_exists) {
					cosmetic.lazp_variant_preview_exists = fs.existsSync(cosmeticsDir + '/lazp/' + `/${cosmetic.type}/${cosmetic.key}_variants.png`);
				}
			}
			
			//if (!this.dailyShopState[cosmetic.shop_type][cosmetic.type]) {
			//	this.dailyShopState[cosmetic.shop_type][cosmetic.type] = cosmetic.type;
			//}
			
			this.dailyShopState[cosmetic.shop_type][`${cosmetic.type}/${cosmetic.key}`] = cosmetic;
		}
		
		//console.log(this.dailyShopState);
		
		return;
	}
}

export { DailyShopTracker };