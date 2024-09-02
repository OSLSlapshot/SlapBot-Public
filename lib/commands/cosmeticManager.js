import { bot, cmdChannels, shopTrackerController } from '../index.js';
import fs from 'fs';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import { getCosmeticLibraryQuery, getCosmeticNotificationsQuery, updateCosmeticNotificationsQuery } from '../queries/index.js';
import { padStringToWidth } from 'discord-button-width';
import about from '../commands/about.js';
import { ceil, floor, min } from 'mathjs';
import { Canvas, Image, loadImage, registerFont } from 'canvas';

/**
* Command to check the rating of another player
* Syntax: !rating <username>
*/

async function cosmetics(cmd_call) {
	if (isMessageClass(cmd_call)) {
		const commandCalls = ['!cosmetics','!c'];
		const msgAuthorId = cmd_call.author.id;
		const userMessage = cmd_call.content.trimEnd().match(/\S+/g);
		
		if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
			
			if (userMessage.length !== 1) {
				return errorMsg(
					"Expected no inputs for this command."
				);
			}
			
			//Maybe allow multiple inputs- 1st arg would be category, 2nd arg would be sub category (error checking for if it doesn't exist.. maybe default to the level above. E.g. !help commands blah, could default to !help commands, !help blah cancel, could default to !help), include aliases for category and command names
			
			let cosmeticClass = new CosmeticManager(cmd_call);
			return await cosmeticClass.generateCosmeticManager();
		}
	}
	else {
		let cosmeticClass = new CosmeticManager(cmd_call);
		return await cosmeticClass.generateCosmeticManager();
	}
	return;
}

function isMessageClass(cmd_call) {
	return cmd_call instanceof Discord.Message;
}

class CosmeticManager {
	constructor(inputCmd) {
		this.inputCmd = inputCmd;
		this.isMessageInput = isMessageClass(inputCmd);
		this.cmdUserId = this.isMessageInput ? this.inputCmd.author.id : this.inputCmd.user.id;
		
		this.cosmetics_per_page = 10;
		
		this.cosmetic_notif_updates = {};
	}
	
	getDefaultCosmeticManagerState() {
		return {
			cosmetic_type: '',
			cosmetic_page: 1,
			num_type_pages: 1,
			cosmetic_keyname: '',
			notif_enabled: false,
			variant_page: 1,
			num_variant_pages: 1
		};
	}
	
	async initialiseCosmeticLibrary() {
		const allCosmetics = await getCosmeticLibraryQuery();
		this.CosmeticLibrary = {};
		
		for (const [type,cosmetics] of Object.entries(allCosmetics)) {
			this.CosmeticLibrary[type] = {};
			const nameSortedCosmetics = Object.values(cosmetics).sort((a,b) => a.name.localeCompare(b.name));
			this.CosmeticLibrary[type] = nameSortedCosmetics.reduce((a,v) => ({...a, [v.key]: v}), {});	//from here: https://stackoverflow.com/questions/4215737/how-to-convert-an-array-into-an-object
			//for (const cos of nameSortedCosmetics) {
			//	this.CosmeticLibrary[cos.key] = cos;
			//}
		}
	}
	
	initialiseCosmeticsCount() {
		this.CosmeticsCount = {};
		for (const [cos_type,cos_collection] of Object.entries(this.CosmeticLibrary)) {
			this.CosmeticsCount[cos_type] = Object.keys(cos_collection).length;
		}
	}
	
	async readCosmeticNotificationsDtb() {
		return await getCosmeticNotificationsQuery();
	}
		
	async generateCosmeticManager() {
		this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
		await this.initialiseCosmeticLibrary();
		this.initialiseCosmeticsCount();
		this.cosmeticNotifDtb = await this.readCosmeticNotificationsDtb();
		
		const currEmbed = await this.generateCosmeticsEmbed('home');
		const currComponents = this.generateCosmeticsComponents();
		
		if (this.isMessageInput) {
			this.cosmeticsMsg = await this.inputCmd.reply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}});	
		}
		else {
			this.cosmeticsMsg = await this.inputCmd.editReply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}, fetchReply: true});
			this.cosmeticsInteraction = await this.inputCmd;
		}
		
		const cosmeticsFilter =  (i) => {
			if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
				i.reply({content: "How did you even do this?!", ephemeral: true});
				return false;
			}
			
			if ((this.isMessageInput) && (this.cmdUserId !== i.user.id)) {
				i.reply({content: "This message is not for you!", ephemeral: true});
				return false;
			}
			
			return true;
		};
		
		const cosmeticsCollector = this.cosmeticsMsg.createMessageComponentCollector({ filter: cosmeticsFilter, idle: 60000 });
		
		try {
			cosmeticsCollector.on('collect', async i => {
				const buttonPressed = i.customId;
				const cmdCalled = buttonPressed.slice(11);
				const cmdCalledArgs = cmdCalled.split(' ');
				const cmdType = cmdCalledArgs[0];
				
				if (cmdType === 'about') {
					await i.deferReply({ephemeral: true});
					const supportMsg = await about({content: '!a'});
					await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
					return;
				}
				else if (cmdType !== 'pagegoto') {
					await i.deferUpdate();
				}
				
				
				
				let newCosmeticMsg;
				let newCosmeticsButtons;
				switch(cmdType) {
					case 'pagegoto':
						const pageSelectModal = await this.generatePageSelectMenu();
						await i.showModal(pageSelectModal);
						i.awaitModalSubmit({time: 58000})
						.then(async (modal_i) => {
							let modalPageSelected = modal_i.fields.getTextInputValue('!cosmetics pagevalue');
							if (!(/^-?\d+$/.test(modalPageSelected))) {
								await modal_i.reply({content: 'Please enter a valid page number.', ephemeral: true})
								.then(
									async () => {
										setTimeout(() => modal_i.deleteReply(), 5000);
									}
								);
								return;
							}
							modalPageSelected = parseInt(modalPageSelected);
							this.CosmeticManagerState.cosmetic_page = modalPageSelected < 1 ? 1 : modalPageSelected > this.CosmeticManagerState.num_type_pages ? this.CosmeticManagerState.num_type_pages : modalPageSelected;
							newCosmeticMsg = await this.generateCosmeticsEmbed('type');
							newCosmeticsButtons = this.generateCosmeticsComponents();
							await modal_i.update({files: newCosmeticMsg.embedFiles, embeds: [newCosmeticMsg.embedMessage], components: newCosmeticsButtons, ephemeral: true});
						})
						.catch((err) => {
							if (err.code !== 'InteractionCollectorError') {
								console.log('Error in modal collection');
								console.log(err);
							}
						});
						 return;
						//this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
						newCosmeticMsg = await this.generateCosmeticsEmbed('type');
						//const pageSelectModal = await this.generatePageSelectMenu();
						//i.showModal(pageSelectModal);
						break;
					case 'type':
						this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
						const selectedPageValue = i.values[0] ? i.values[0] : '';
						this.CosmeticManagerState.cosmetic_type = selectedPageValue;
						
						switch (selectedPageValue) {
							case '':
								newCosmeticMsg = await this.generateCosmeticsEmbed('home');
								break;
							default:
								this.CosmeticManagerState.num_type_pages = Math.ceil( this.CosmeticsCount[this.CosmeticManagerState.cosmetic_type] / this.cosmetics_per_page );
								newCosmeticMsg = await this.generateCosmeticsEmbed(cmdType);
						}
						break;
					case 'page':
						/*
						if ((cmdCalledArgs[1] !== 'down') && (cmdCalledArgs[1] !== 'up')) {
							this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
							this.CosmeticManagerState.cosmetic_type = cmdCalledArgs[1];
							this.CosmeticManagerState.num_type_pages = Math.ceil( this.CosmeticsCount[this.CosmeticManagerState.cosmetic_type] / this.cosmetics_per_page );
							newCosmeticMsg = this.generateCosmeticsEmbed('type');
							break;
						}
						*/
						if (this.CosmeticManagerState.cosmetic_keyname) {
							let newVariantPageNum;
							switch(cmdCalledArgs[1]) {
								case 'down':
									newVariantPageNum = this.CosmeticManagerState.variant_page - 1;
									this.CosmeticManagerState.variant_page = newVariantPageNum < 1 ? 1 : newVariantPageNum;
									break;
								case 'up':
									newVariantPageNum = this.CosmeticManagerState.variant_page + 1;
									this.CosmeticManagerState.variant_page = newVariantPageNum > this.CosmeticManagerState.num_variant_pages ? this.CosmeticManagerState.num_variant_pages : newVariantPageNum;
									break;
							}
							newCosmeticMsg = await this.generateCosmeticsEmbed('keyname');
							break;
						}
						//changing type page
						let newPageNum;
						switch(cmdCalledArgs[1]) {
							case 'down':
								newPageNum = this.CosmeticManagerState.cosmetic_page - 1;
								this.CosmeticManagerState.cosmetic_page = newPageNum < 1 ? 1 : newPageNum;
								break;
							case 'up':
								newPageNum = this.CosmeticManagerState.cosmetic_page + 1;
								this.CosmeticManagerState.cosmetic_page = newPageNum > this.CosmeticManagerState.num_type_pages ? this.CosmeticManagerState.num_type_pages : newPageNum;
								break;
						}
						newCosmeticMsg = await this.generateCosmeticsEmbed('type');
						break;
					case 'keyname':
						const selectedValue = i.values[0] ? i.values[0] : '';
						this.CosmeticManagerState.cosmetic_keyname = selectedValue;
						
						switch(selectedValue) {
							case '':
								newCosmeticMsg = await this.generateCosmeticsEmbed('type');
								break;
							default:
								this.getCosmeticNotifState();
								newCosmeticMsg = await this.generateCosmeticsEmbed(cmdType);
						}
						break;
					case 'bell':
						this.toggleCosmeticNotifState();
						newCosmeticMsg = await this.generateCosmeticsEmbed('keyname');
						break;
				}
				
				newCosmeticsButtons = this.generateCosmeticsComponents();
				await i.editReply({files: newCosmeticMsg.embedFiles, embeds: [newCosmeticMsg.embedMessage], components: newCosmeticsButtons, ephemeral: true});
				
				if (cmdType === 'bell') {
					await i.followUp({content: `🔔 You have **${this.CosmeticManagerState.notif_enabled ? 'enabled' : 'disabled'}** notifications for ${shopTrackerController.cosmeticTypeEmojiMap[this.lastSelCosmeticInfo.type]} ${this.lastSelCosmeticInfo.name}.\n*Your settings will be updated in the database once this command expires.*`, ephemeral: true})
					.then(
						async (msg) => {
							setTimeout(() => i.deleteReply(msg), 10000);
						}
					);
					/*
					if (this.CosmeticManagerState.notif_enabled) {
						await i.followUp({content: `🔔 You have **enabled** notifications for ${shopTrackerController.cosmeticTypeEmojiMap[this.lastSelCosmeticInfo.type]} ${this.lastSelCosmeticInfo.name}.\n*Your settings will be updated in the database once this command expires.*`, ephemeral: true})
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
					}
					else {
						await i.followUp({content: `🔕 You have **disabled** notifications for ${shopTrackerController.cosmeticTypeEmojiMap[this.lastSelCosmeticInfo.type]} ${this.lastSelCosmeticInfo.name}.\n*Your settings will be updated in the database once this command expires.*`, ephemeral: true})
						.then(
							async (msg) => {
								setTimeout(() => i.deleteReply(msg), 10000);
							}
						);
					}
					*/
				}
				
				this.cosmeticsInteraction = i;
			});
		}
		catch (err) {
			console.log('Error in cosmetic manager collection listener');
			console.log(err);
		}
		
		cosmeticsCollector.once('end', async (collected,reason) => {
			if (reason === 'idle') {
				if (this.isMessageInput) {
					const cosmeticsMsgComponents = this.cosmeticsMsg.components;
					for (const r of cosmeticsMsgComponents) {
						for (const b of r.components) {
							b.data.disabled = true;
						}
					}
					await this.cosmeticsMsg.edit({components: cosmeticsMsgComponents, ephemeral: true});
					
					await this.updateCosmeticNotifDtb();
				}
				else {
					await this.cosmeticsInteraction.deleteReply();
					
					await this.updateCosmeticNotifDtb();
				}
			}
		});
		
		/*
		this.cosmeticsMsg = await this.inputCmd.editReply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
			.then( async (cMsg) => {
				const cosmeticsFilter =  (i) => {
					if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
						i.reply({content: "How did you even do this?!", ephemeral: true});
						return false;
					}
					
					if ((isMessageClass(this.inputCmd)) && (this.cmdUserId !== i.user.id)) {
						i.reply({content: "This message is not for you!", ephemeral: true});
						return false;
					}
					
					return true;
				};
				
				const cosmeticsCollector = cMsg.createMessageComponentCollector({ filter: cosmeticsFilter, idle: 60000 });
				
				try {
					cosmeticsCollector.on('collect', async i => {
						const buttonPressed = i.customId;
						const cmdCalled = buttonPressed.slice(11);
						const cmdCalledArgs = cmdCalled.split(' ');
						const cmdType = cmdCalledArgs[0];
						
						if (cmdType === 'about') {
							await i.deferReply({ephemeral: true});
							const supportMsg = await about({content: '!a'});
							await i.editReply({files: supportMsg.embedFiles, components: supportMsg.msgComponents, embeds: [supportMsg.embedMessage], emphemeral: true});
							return;
						}
						
						await i.deferUpdate();
						
						let newCosmeticMsg;
						switch(cmdType) {
							case 'home':
								this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
								newCosmeticMsg = this.generateCosmeticsEmbed(cmdType);
								break;
							case 'type':
								this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
								this.CosmeticManagerState.cosmetic_type = i.values[0];
								this.CosmeticManagerState.num_type_pages = Math.ceil( this.CosmeticsCount[this.CosmeticManagerState.cosmetic_type] / this.cosmetics_per_page );
								newCosmeticMsg = this.generateCosmeticsEmbed(cmdType);
								break;
							case 'page':
								if ((cmdCalledArgs[1] !== 'down') && (cmdCalledArgs[1] !== 'up')) {
									this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
									this.CosmeticManagerState.cosmetic_type = cmdCalledArgs[1];
									this.CosmeticManagerState.num_type_pages = Math.ceil( this.CosmeticsCount[this.CosmeticManagerState.cosmetic_type] / this.cosmetics_per_page );
									newCosmeticMsg = this.generateCosmeticsEmbed('type');
									break;
								}
								if (this.CosmeticManagerState.cosmetic_keyname) {
									let newVariantPageNum;
									switch(cmdCalledArgs[1]) {
										case 'down':
											newVariantPageNum = this.CosmeticManagerState.variant_page - 1;
											this.CosmeticManagerState.variant_page = newVariantPageNum < 1 ? 1 : newVariantPageNum;
											break;
										case 'up':
											newVariantPageNum = this.CosmeticManagerState.variant_page + 1;
											this.CosmeticManagerState.variant_page = newVariantPageNum > this.CosmeticManagerState.num_variant_pages ? this.CosmeticManagerState.num_variant_pages : newVariantPageNum;
											break;
									}
									newCosmeticMsg = this.generateCosmeticsEmbed('keyname');
									break;
								}
								//changing type page
								let newPageNum;
								switch(cmdCalledArgs[1]) {
									case 'down':
										newPageNum = this.CosmeticManagerState.cosmetic_page - 1;
										this.CosmeticManagerState.cosmetic_page = newPageNum < 1 ? 1 : newPageNum;
										break;
									case 'up':
										newPageNum = this.CosmeticManagerState.cosmetic_page + 1;
										this.CosmeticManagerState.cosmetic_page = newPageNum > this.CosmeticManagerState.num_type_pages ? this.CosmeticManagerState.num_type_pages : newPageNum;
										break;
								}
								newCosmeticMsg = this.generateCosmeticsEmbed('type');
								break;
							case 'keyname':
								this.CosmeticManagerState.cosmetic_keyname = i.values[0];
								newCosmeticMsg = this.generateCosmeticsEmbed(cmdType);
								break;
						}
						
						const newCosmeticsButtons = this.generateCosmeticsComponents();
						
						await i.editReply({files: newCosmeticMsg.embedFiles, embeds: [newCosmeticMsg.embedMessage], components: newCosmeticsButtons, ephemeral: true});
					});
				}
				catch (err) {
					console.log('Error in cosmetic manager collection listener');
					console.log(err);
				}
				
				cosmeticsCollector.once('end', async function(collected,reason) {
					if (reason === 'idle') {
						const cosmeticsMsgComponents = cMsg.components;
						for (const r of cosmeticsMsgComponents) {
							for (const b of r.components) {
								b.data.disabled = true;
							}
						}
						await cMsg.edit({components: cosmeticsMsgComponents, ephemeral: true});
					}
				});
			});
			*/
	}
	
	async generateCosmeticsEmbed(cmdType) {
		const embedGetter = {
			home: this.generateHomeEmbed.bind(this),
			type: await this.generateCosmeticTypeEmbed.bind(this),
			keyname: this.generateSelectedCosmeticEmbed.bind(this)
		}
		
		return embedGetter[cmdType]();
	}
	
	generateHomeEmbed() {
		/*
		let listOfTypesStr = '';
		for (const [key,type] of Object.entries(shopTrackerController.cosmeticTypeNameMap)) {
			listOfTypesStr += `\n${shopTrackerController.cosmeticTypeEmojiMap[key]} ${type}`;
		}
		
		for (const [key,type] of Object.entries(shopTrackerController.cosmeticTypeNameMap)) {
			//listOfTypesStr += `\n${shopTrackerController.cosmeticTypeEmojiMap[key]} ${type}`;
			listOfTypesFields.push({
				name: `${shopTrackerController.cosmeticTypeEmojiMap[key]} ${type}`,
				value: `\u200b`,
				inline: true
			});
		}
		*/
		let listOfTypesFields = [];
		let typeKeys = Object.keys(shopTrackerController.cosmeticTypeNameMap)
			.sort()
			.filter( e => {
				return this.CosmeticsCount[e] !== 0;
			});
		
		const numTypes = typeKeys.length;
		
		for (let i = 0; (i < numTypes); i++) {
			if (Math.floor(i/3)%2 === 0) {
				const typeKey = typeKeys[i];
				const typeKey2 = typeKeys[i+3];
				if (typeKey2) {
					listOfTypesFields.push({
						name: `${shopTrackerController.cosmeticTypeEmojiMap[typeKey]} ${shopTrackerController.cosmeticTypeNameMap[typeKey]}`,
						value: `**${shopTrackerController.cosmeticTypeEmojiMap[typeKey2]} ${shopTrackerController.cosmeticTypeNameMap[typeKey2]}**`,
						inline: true
					});
				}
				else {
					listOfTypesFields.push({
						name: `${shopTrackerController.cosmeticTypeEmojiMap[typeKey]} ${shopTrackerController.cosmeticTypeNameMap[typeKey]}`,
						value: `\u200b`,
						inline: true
					});
				}
			}
		}
		
		if (listOfTypesFields.length % 3 === 2) {
			listOfTypesFields.push({
				name: '\u200b',
				value: '\u200b',
				inline: true
			});
		}
		
		listOfTypesFields.push({
			name: 'Shortcuts',
			value: `${cmdChannels.tipsCh}  •  ${cmdChannels.liveCh}  •  ${cmdChannels.otherCh}\n${cmdChannels.queueCh}  •  ${cmdChannels.updatesCh}  •  ${cmdChannels.commandsCh}`
		});
		
		
		let embedFilesList = [];
		const embedAuthor = new Discord.AttachmentBuilder(`./thumbnails/cosmeticMsgAuthor.png`, {name: 'cosmeticMsgAuthor.png'});
		embedFilesList.push(embedAuthor);
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/pux.png', {name: 'pux.png'});
		embedFilesList.push(embedThumb);
		
		let homeEmbed = {
			color: 0xffff00,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: 'attachment://' + embedAuthor.name
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `Slapshot Rebound Cosmetic Preview Manager`,
			description: `You can use the interactions buttons/menus below to navigate through the cosmetic previews available.\n\nCosmetic types:`,
			fields: listOfTypesFields,
			footer: {
				text: `Home Page`
			}
		};
		
		return {
			embedMessage: homeEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	generatePageSelectMenu() {
		const pageSelectModal = new Discord.ModalBuilder()
			.setCustomId('!cosmetics page select')
			.setTitle(`Cosmetic Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]} - Go to Page`);
			
		pageSelectModal.addComponents(
			new Discord.ActionRowBuilder().addComponents(
				new Discord.TextInputBuilder()
					.setCustomId('!cosmetics pagevalue')
					.setLabel(`Select a page between 1 and ${this.CosmeticManagerState.num_type_pages}`)
					.setStyle(Discord.TextInputStyle.Short)
					.setMinLength(1)
					.setMaxLength(3)
					//.setValue(`${this.CosmeticManagerState.cosmetic_page}`)
					.setPlaceholder(`${this.CosmeticManagerState.cosmetic_page}`)
			)
		);
		
		return pageSelectModal;
	}
	
	async generateCosmeticTypeEmbed() {
		let cosmeticListFields = [];
		
		const cosmeticList = Object.values(this.CosmeticLibrary[this.CosmeticManagerState.cosmetic_type]);
		const startIdx = (this.CosmeticManagerState.cosmetic_page - 1)*this.cosmetics_per_page;
		let pageCosmeticCollection = [];
		let col1val = '';
		for (let i = startIdx; i < (startIdx + this.cosmetics_per_page/2); i++) {
			if (!cosmeticList[i]) {
				break;
			}
			const currCosmetic = cosmeticList[i];
			pageCosmeticCollection.push(currCosmetic);
			let is_notif_enabled = false;
			if ((this.cosmeticNotifDtb[currCosmetic.type]) && (this.cosmeticNotifDtb[currCosmetic.type][currCosmetic.key]) && (this.cosmeticNotifDtb[currCosmetic.type][currCosmetic.key].includes(this.cmdUserId))) {
				is_notif_enabled = true;
			}
			
			//col1val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}${currCosmetic.season ? '🎟️':''}${is_notif_enabled ? '🔔':''}\n`;
			col1val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} [${i-startIdx+1}] ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}${currCosmetic.season ? '🎟️':''}${is_notif_enabled ? '🔔':''}\n`;
		}
		cosmeticListFields.push({
			name: `Cosmetics available (${cosmeticList.length}):`,
			value: col1val,
			inline: true
		});
		
		let col2val = '';
		for (let i = startIdx+this.cosmetics_per_page/2; i < (startIdx + this.cosmetics_per_page); i++) {
			if (!cosmeticList[i]) {
				break;
			}
			const currCosmetic = cosmeticList[i];
			pageCosmeticCollection.push(currCosmetic);
			let is_notif_enabled = false;
			if ((this.cosmeticNotifDtb[currCosmetic.type]) && (this.cosmeticNotifDtb[currCosmetic.type][currCosmetic.key]) && (this.cosmeticNotifDtb[currCosmetic.type][currCosmetic.key].includes(this.cmdUserId))) {
				is_notif_enabled = true;
			}
			//col2val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}${currCosmetic.season ? '🎟️':''}${is_notif_enabled ? '🔔':''}\n`;
			col2val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} [${i-startIdx+1}] ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}${currCosmetic.season ? '🎟️':''}${is_notif_enabled ? '🔔':''}\n`;
		}
		//const col2val = `${cosmeticNameList.slice(startIdx+this.cosmetics_per_page/2, startIdx + this.cosmetics_per_page).join('\n')}`;
		cosmeticListFields.push({
			name: '\u200b',
			value: col2val ? col2val : '\u200b',
			inline: true
		});
		
		const pageGraphic = await this.getTypePageGraphic(pageCosmeticCollection);
		
		let embedFilesList = [];
		const embedAuthor = new Discord.AttachmentBuilder(`./thumbnails/cosmeticMsgAuthor.png`, {name: 'cosmeticMsgAuthor.png'});
		embedFilesList.push(embedAuthor);
		const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/cosmetics/type_icons/${this.CosmeticManagerState.cosmetic_type}.png`, {name: `${this.CosmeticManagerState.cosmetic_type}.png`});
		//embedFilesList.push(embedThumb);
		const embedImg = new Discord.AttachmentBuilder(pageGraphic.toBuffer(), {name: `pageGraphic.png`});
		embedFilesList.push(embedImg);
		
		let typeEmbed = {
			color: 0xffff00,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: 'attachment://' + embedAuthor.name
			},
			//thumbnail: {
			//	url: 'attachment://' + embedThumb.name
			//},
			title: `Slapshot Rebound Cosmetic Preview Manager`,
			description: `Use the ️◀️ ▶️ buttons (if available) to view more pages of cosmetics for this cosmetic type.\nFor details and previews of a specific cosmetic, use the bottom interaction menu.`,
			fields: cosmeticListFields,
			image: {
				url: 'attachment://' + embedImg.name
			},
			footer: {
				text: `Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]}  •  Page ${this.CosmeticManagerState.cosmetic_page} of ${this.CosmeticManagerState.num_type_pages}`
			}
		};
		
		return {
			embedMessage: typeEmbed,
			embedFiles: embedFilesList,
			deleteSenderMessage: false
		};
	}
	
	async getTypePageGraphic(cosmeticList) {
		let previews = [];
		for (const cosmetic of cosmeticList) {
			//load and push all images to previews Array (or maybe make this an object so that each cosmetic can be accessed easily again since a 2nd loop will be required after all images have been loaded
			try {
				previews.push(await loadImage(`./thumbnails/cosmetics/library/slapbot/${cosmetic.type}/${cosmetic.key}.png`));
			}
			catch {
				previews.push(await loadImage(`./thumbnails/cosmetics/library/slapbot/unknown.png`));
			}
		}
		
		const puxImg = await loadImage(`./thumbnails/pux.png`);
		
		//define canvas object with width, height
		//define canvas context
		//draw images and whatever other text/graphics
		//probably going for 2x5, label numbers in text above, and numbers below the images on a band of colour for the cosmetic's rarity
		
		registerFont("./fonts/gg sans Regular.ttf", { family: "gg sans" });
		
		const num_cos = previews.length;
		const img_colcount = 5;
		const img_rowcount = Math.ceil(num_cos / img_colcount);
		//images are 200x200
		const preview_size = 200;	//square
		const img_margin = 25;
		const prev_plus_mar = preview_size + img_margin;
		
		const font_size = 36;
		const font_family = "gg sans";
		const puxImg_size = 32;	//square
		const puxImg_offset = 6;	//seems to be a little high and must be lowered
		
		const canvas = new Canvas(img_colcount*prev_plus_mar + img_margin, img_rowcount*(prev_plus_mar + font_size) + img_margin);	//must maintain ratio above ~1.35 for widest embed (with no thumbnail)
		const ctx = canvas.getContext('2d');
		
		//background
		//ctx.globalCompositeOperation = 'destination-over'
		ctx.fillStyle = "#2c2d30";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		for (let i = 0; i < img_rowcount; i++) {
			for (let j = 0; j < img_colcount; j++) {
				const cos_idx = img_colcount*i+j;
				
				if (cos_idx > num_cos) {
					break;
				}
				
				try {
					ctx.drawImage(previews[cos_idx], prev_plus_mar*j + img_margin,(prev_plus_mar + font_size)*i + img_margin);
					ctx.textAlign = 'center';
					ctx.textBaseline = 'top';
					ctx.fillStyle = 'white';
					ctx.font = `${font_size}px "${font_family}"`;
					const cos_price = Object.values(cosmeticList)[cos_idx].price;
					const text_string = `[${cos_idx+1}]${cos_price ? ' ' + cos_price : ''}`;
					const textWidth = ctx.measureText(text_string).width;
					const txt_x_coord = cos_price ? prev_plus_mar*j + (preview_size/2 + img_margin - puxImg_size/2) : prev_plus_mar*j + (preview_size/2 + img_margin);
					const y_coord = (prev_plus_mar + font_size)*i + (prev_plus_mar + 5);
					//console.log(textWidth);
					ctx.fillText(text_string,txt_x_coord,y_coord,preview_size - puxImg_size);
					
					if (cos_price) {
						const pux_x_coord = Math.ceil(txt_x_coord + textWidth/2);
						ctx.drawImage(puxImg, pux_x_coord, y_coord + puxImg_offset, puxImg_size, puxImg_size);
					}
					
				}
				catch {
					continue;
				}
			}
		}
		
		return canvas;
	}
	
	getCosmeticNotifState() {
		const cos_type = this.CosmeticManagerState.cosmetic_type;
		const cos_key = this.CosmeticManagerState.cosmetic_keyname;
		
		const type_key = `${cos_type}/${cos_key}`;
		
		if (type_key in this.cosmetic_notif_updates) {
			this.CosmeticManagerState.notif_enabled = this.cosmetic_notif_updates[type_key];
		}
		else {
			let notifUserList = null;
			if (this.cosmeticNotifDtb[cos_type]) {
				notifUserList = this.cosmeticNotifDtb[cos_type][cos_key];
			}
			
			if ((notifUserList) && (notifUserList.includes(this.cmdUserId))) {
				this.CosmeticManagerState.notif_enabled = true;
			}
			else {
				this.CosmeticManagerState.notif_enabled = false;
			}
		}
	}
	
	toggleCosmeticNotifState() {
		if (!this.lastSelCosmeticInfo.appears_in_shop) {
			return;
		}
		
		//set initial state
		this.getCosmeticNotifState();
		
		const cos_type = this.CosmeticManagerState.cosmetic_type;
		const cos_key = this.CosmeticManagerState.cosmetic_keyname;
		
		const type_key = `${cos_type}/${cos_key}`;
		
		if (type_key in this.cosmetic_notif_updates) {
			this.cosmetic_notif_updates[type_key] = !this.cosmetic_notif_updates[type_key];
		}
		else {
			this.cosmetic_notif_updates[type_key] = !this.CosmeticManagerState.notif_enabled;
		}
		
		//update state
		this.getCosmeticNotifState();
	}
	
	async updateCosmeticNotifDtb() {
		//no changes made
		if (Object.keys(this.cosmetic_notif_updates).length === 0) {
			return;
		}
		
		this.cosmeticNotifDtb = await this.readCosmeticNotificationsDtb();
		
		//const user_id = toString(this.cmdUserId);
		//console.log(this.cmdUserId);
		
		for (const [cos,is_enabled] of Object.entries(this.cosmetic_notif_updates)) {
			const [cos_type, cos_key] = cos.split('/');
			
			if (!this.cosmeticNotifDtb[cos_type]) {
				this.cosmeticNotifDtb[cos_type] = {};
			}
			if (!this.cosmeticNotifDtb[cos_type][cos_key]) {
				this.cosmeticNotifDtb[cos_type][cos_key] = [];
			}
			
			let notifUserList = this.cosmeticNotifDtb[cos_type][cos_key];
			
			if (is_enabled) {
				if (!notifUserList.includes(this.cmdUserId)) {
					notifUserList.push(this.cmdUserId);
				}
			}
			else {
				notifUserList = notifUserList.filter( u => u === toString(this.cmdUserId));
				
				if (notifUserList.length === 0) {
					delete this.cosmeticNotifDtb[cos_type][cos_key];
					if (Object.keys(this.cosmeticNotifDtb[cos_type]).length === 0) {
						delete this.cosmeticNotifDtb[cos_type];
					}
				}
			}
			
			/*
			let notifUserList = null;
			if (this.cosmeticNotifDtb[cos_type]) {
				notifUserList = this.cosmeticNotifDtb[cos_type][cos_key];	//undefined if no users have selected the cosmetic
			}
			
			if (notifUserList) {
				notifUserList.push(this.cmdUserId);
			}
			
			if (state) {	//was enabled and has now been disabled
				notifUserList = notifUserList.filter( u => u === toString(this.cmdUserId));
				
				if (notifUserList.length === 0) {
					delete this.cosmeticNotifDtb[cos_type][cos_key];
				}
			}
			else {
				if (notifUserList) {
					notifUserList.push(this.cmdUserId);
				}
				else {
					if (!this.cosmeticNotifDtb[cos_type]) {
						this.cosmeticNotifDtb[cos_type] = {};
					}
					if (!this.cosmeticNotifDtb[cos_type][cos_key]) {
						this.cosmeticNotifDtb[cos_type][cos_key] = [];
					}
					
					this.cosmeticNotifDtb[cos_type][cos_key].push(this.cmdUserId);
				}
			}
			*/
			
			await updateCosmeticNotificationsQuery(this.cosmeticNotifDtb);
		}
		
	}
	
	generateSelectedCosmeticEmbed() {
		this.lastSelCosmeticInfo = this.CosmeticLibrary[this.CosmeticManagerState.cosmetic_type][this.CosmeticManagerState.cosmetic_keyname];
		const cosmeticInfo = this.lastSelCosmeticInfo;
		
		let authorStr = '';
		if (cosmeticInfo.preview_exists) {
			if ((cosmeticInfo.has_variants) && (cosmeticInfo.variant_preview_exists)) {
				authorStr = 'Slapshot Rebound Cosmetic';
			}
			else {
				authorStr = `${'Slapshot Rebound Cosmetic'.padEnd(86)}\u200b`;
			}
		}
		else {
			authorStr = `${'Slapshot Rebound Cosmetic'.padEnd(117)}\u200b`;
		}
		
		let embedFilesList = [];
		const embedAuthor = new Discord.AttachmentBuilder(`./thumbnails/cosmeticMsgAuthor.png`, {name: 'cosmeticMsgAuthor.png'});
		embedFilesList.push(embedAuthor);
		
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
					value: `${shopTrackerController.cosmeticTypeEmojiMap[cosmeticInfo.type]} ${shopTrackerController.cosmeticTypeNameMap[cosmeticInfo.type]}`,
					inline: true
				},
				{
					name: 'Rarity',
					value: `${shopTrackerController.cosmeticRarityEmojiMap[cosmeticInfo.rarity_rank]} ${cosmeticInfo.rarity_name}`,
					inline: true
				},
				//{
				//	name: 'Price',
				//	value: `<:pux:1188661791304196216> ${cosmeticInfo.price}`,
				//	inline: true
				//},
				{
					name: 'Variants?',
					value: `${cosmeticInfo.has_variants ? '✅' : '❌'}`,
					inline: true
				},
				//{
				//	name: 'Last Seen',
				//	value: lastSeenStr,
				//	inline: true
				//},
				
			],
			//footer: {
			//	text: `\u200b${''.padEnd(183)}\u200b`
			//}
		};
		
		if (cosmeticInfo.appears_in_shop) {
			cosmeticEmbed.fields.splice(2,0,{
				name: 'Price',
				value: `<:pux:1188661791304196216> ${cosmeticInfo.price}`,
				inline: true
			});
			
			//last seen str
			const lastSeenStr = cosmeticInfo.days_seen ? `<t:${Date.parse(cosmeticInfo.days_seen.at(-1))/1000}:R>` : '-';
			cosmeticEmbed.fields.push({
				name: 'Last Seen',
				value: lastSeenStr,
				inline: true
			});
			
			cosmeticEmbed.footer = {
				text: 'Shop Cosmetic'
			};
		}
		else if (cosmeticInfo.season) {	//season pass cosmetic
			const seasonPassFields = [
				{
					name: '🎟️ Season',
					value: `${cosmeticInfo.season}`,
					inline: true
				},
				{
					name: 'Tier',
					value: `${cosmeticInfo.obtained_at_tier}`,
					inline: true
				},
				{
					name: 'Track',
					value: `${cosmeticInfo.track}`,
					inline: true
				}
			];
			cosmeticEmbed.fields.push(...seasonPassFields);
			
			cosmeticEmbed.footer = {
				text: 'Season Pass Cosmetic'
			};
		}
		else if (cosmeticInfo.is_default) {
			cosmeticEmbed.footer = {
				text: 'Default Cosmetic'
			};
		}
		else if (cosmeticInfo.rarity_rank === 0) {
			cosmeticEmbed.footer = {
				text: 'Exclusive Cosmetic'
			};
		}
		
		if ("extra_info" in cosmeticInfo) {
			cosmeticEmbed.fields.push({
				name: 'Additional Information',
				value: cosmeticInfo.extra_info,
				inline: false
			});
		}
		
		const cosmeticsDir = './thumbnails/cosmetics/library/'
		if (cosmeticInfo.preview_exists) {
			switch (cosmeticInfo.type) {
				case 'goal_horn':
					const embedFile = new Discord.AttachmentBuilder(`${cosmeticsDir}/slapbot/goal_horn/${cosmeticInfo.key}.ogg`, {name: `${cosmeticInfo.key}.ogg`});
					embedFilesList.push(embedFile);
					break;
				default:
					const embedThumb = new Discord.AttachmentBuilder(`${cosmeticsDir}/slapbot/${cosmeticInfo.type}/${cosmeticInfo.key}.png`, {name: `${cosmeticInfo.key}.png`});
					embedFilesList.push(embedThumb);
					
					cosmeticEmbed.thumbnail = {
						url: 'attachment://' + embedThumb.name
					};
			}
			
		}
		
		if ((cosmeticInfo.has_variants) && (cosmeticInfo.variant_preview_exists)) {
			const cosmeticTypeDir = `${cosmeticsDir}/slapbot/${cosmeticInfo.type}/`;
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
					
					cosmeticEmbed.footer.text += `  •  Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]}`;
					break;
				default:
					variantFiles = fs.readdirSync(cosmeticTypeDir)
						.filter( (fn) => {
							return (new RegExp(`^${cosmeticInfo.key}_variants` + '.*\.(png|jpg)$')).test(fn)
						});
					this.CosmeticManagerState.num_variant_pages = variantFiles.length;
					
					//buttons can be spammed to go past page bounds
					if (this.CosmeticManagerState.variant_page < 1) {
						this.CosmeticManagerState.variant_page = 1;
					}
					else if (this.CosmeticManagerState.variant_page > this.CosmeticManagerState.num_variant_pages) {
						this.CosmeticManagerState.variant_page = this.CosmeticManagerState.num_variant_pages;
					}
					
					const variantPageStr = this.CosmeticManagerState.variant_page === 1 ? '' : `_${this.CosmeticManagerState.variant_page}`
					const embedImage = new Discord.AttachmentBuilder(`${cosmeticTypeDir}/${cosmeticInfo.key}_variants${variantPageStr}.png`, {name: `${cosmeticInfo.key}_variants${variantPageStr}.png`});
					embedFilesList.push(embedImage);
					
					cosmeticEmbed.image = {
						url: 'attachment://' + embedImage.name
					};
					cosmeticEmbed.footer.text += `  •  Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]}  •  Page ${this.CosmeticManagerState.variant_page} of ${this.CosmeticManagerState.num_variant_pages}`;
			}
		}
		
		return {
			embedFiles: embedFilesList,
			embedMessage: cosmeticEmbed,
		};
	}
	
	generateCosmeticsComponents() {
		let componentRows = [];
		componentRows = this.addComponentRow(componentRows, this.generateTopComponentRow() );
		componentRows = this.generateCosmeticsComponentRows(componentRows);
		
		return componentRows;
	}

	addComponentRow(componentRowList,rowToAdd) {
		componentRowList.push(rowToAdd);
		return componentRowList;
	}

	generateTopComponentRow() {
		const buttonWidth = 85;
		
		let row = new Discord.ActionRowBuilder()

		//ternary logic below:
		//If on a cosmetic page, check if more than one variant page exists
		//Otherwise, if on a cosmetic type page, check if more than one cosmetic list page exists
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics page down`)
				.setEmoji('◀️')
				.setStyle(Discord.ButtonStyle.Primary)
				.setDisabled(!!this.CosmeticManagerState.cosmetic_keyname ? (this.CosmeticManagerState.variant_page <= 1) : (!!this.CosmeticManagerState.cosmetic_type ? (this.CosmeticManagerState.cosmetic_page <= 1) : true))
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics page up`)
				.setEmoji('▶️')
				.setStyle(Discord.ButtonStyle.Primary)
				.setDisabled(!!this.CosmeticManagerState.cosmetic_keyname ? (this.CosmeticManagerState.variant_page >= this.CosmeticManagerState.num_variant_pages) : (!!this.CosmeticManagerState.cosmetic_type ? (this.CosmeticManagerState.cosmetic_page >= this.CosmeticManagerState.num_type_pages) : true))
		)
		
		
		const pagegoto_about_button_width = ((this.CosmeticManagerState.cosmetic_keyname) && (this.lastSelCosmeticInfo.appears_in_shop) && (this.lastSelCosmeticInfo.variant_preview_exists)) ? 50 : 79;
		
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics pagegoto`)
				//.setLabel(`\u200b${padStringToWidth('Home',((this.CosmeticManagerState.cosmetic_keyname) && (this.lastSelCosmeticInfo.appears_in_shop)) ? 128 : 197,"center")}\u200b`)
				.setLabel(`\u200b${padStringToWidth('Go to Page',pagegoto_about_button_width,"center")}\u200b`)
				//.setEmoji('🏠')
				.setStyle(Discord.ButtonStyle.Primary)
				.setDisabled(!this.CosmeticManagerState.cosmetic_type || !!this.CosmeticManagerState.cosmetic_keyname)
				//.setDisabled(this.CosmeticManagerState.cosmetic_type ? false : true)
		)
		
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics about`)
				.setLabel(`\u200b${padStringToWidth('About',pagegoto_about_button_width,"center")}\u200b`)
				.setEmoji('<:OSLCorgo:1114817237317075025>')
				.setStyle(Discord.ButtonStyle.Secondary)
		)
		
		if (this.CosmeticManagerState.cosmetic_keyname) {
			if (this.lastSelCosmeticInfo.appears_in_shop) {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetics bell`)
						.setEmoji(`${this.CosmeticManagerState.notif_enabled ? '🔔' : '🔕'}`)
						.setStyle(this.CosmeticManagerState.notif_enabled ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger)
				)
			}
			/*
			if ((this.cosmeticNotifDtb[this.CosmeticManagerState.cosmetic_type]) && (this.cosmeticNotifDtb[this.CosmeticManagerState.cosmetic_type][this.CosmeticManagerState.cosmetic_keyname])) {
				row.addComponents(
					new Discord.ButtonBuilder()
						.setCustomId(`!cosmetics bell}`)
						.setEmoji(`${shopTrackerController.cosmeticTypeEmojiMap[this.CosmeticManagerState.cosmetic_type]}`)
						.setStyle(Discord.ButtonStyle.Primary)
						.setDisabled(!this.CosmeticManagerState.cosmetic_keyname)
						//.setDisabled(this.CosmeticManagerState.cosmetic_keyname ? false : true)
				)
			}
			*/
		}
		
		return row;
	}

	generateCosmeticsComponentRows(components) {;
		components = this.addComponentRow(components, this.generateCosmeticTypeSelectComponentRow() );
		
		if (this.CosmeticManagerState.cosmetic_type) {
			components = this.addComponentRow(components, this.generateCosmeticSelectComponentRow() );
		}
		
		return components;
	}

	generateCosmeticTypeSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!cosmetics type')
					.setPlaceholder('Select a cosmetic type')
					.setMinValues(0)
					.setMaxValues(1)
			);
			
		for (const typeKey of Object.keys(this.CosmeticLibrary)) {
			if (this.CosmeticsCount[typeKey] === 0) {
				continue;
			}
			if (typeKey === this.CosmeticManagerState.cosmetic_type) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(`${shopTrackerController.cosmeticTypeNameMap[typeKey]} (Deselect to go home)`)
						.setValue(typeKey)
						.setEmoji(shopTrackerController.cosmeticTypeEmojiMap[typeKey])
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`${shopTrackerController.cosmeticTypeNameMap[typeKey]}`)
					.setValue(typeKey)
					.setEmoji(shopTrackerController.cosmeticTypeEmojiMap[typeKey])
					.setDefault(false)
			);
		}
		
		return row;
	}

	generateCosmeticSelectComponentRow() {
		let row = new Discord.ActionRowBuilder()
			.addComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('!cosmetics keyname')
					.setPlaceholder('Select a cosmetic to preview')
					.setMinValues(0)
					.setMaxValues(1)
			);
			
		const cosmeticList = Object.values(this.CosmeticLibrary[this.CosmeticManagerState.cosmetic_type]);
		
		const startIdx = (this.CosmeticManagerState.cosmetic_page - 1) * this.cosmetics_per_page;
		const endIdx = Math.min(startIdx + this.cosmetics_per_page, this.CosmeticsCount[this.CosmeticManagerState.cosmetic_type]);
		for (let i = startIdx; i < endIdx; i++) {
			const cosmeticKeyname = cosmeticList[i].key;
			if (cosmeticKeyname === this.CosmeticManagerState.cosmetic_keyname) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(`[${i+1}] ${cosmeticList[i].name} (Deselect to go back)`)
						.setValue(cosmeticKeyname)
						.setEmoji(shopTrackerController.cosmeticRarityEmojiMap[cosmeticList[i].rarity_rank])
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(`[${i+1}] ${cosmeticList[i].name}`)
					.setValue(cosmeticKeyname)
					.setEmoji(shopTrackerController.cosmeticRarityEmojiMap[cosmeticList[i].rarity_rank])
					.setDefault(false)
			);
		}
		
		return row;
	}
}

export default cosmetics;
