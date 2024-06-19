import { bot, cmdChannels, shopTrackerController } from '../index.js';
import fs from 'fs';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import { getCosmeticLibraryQuery } from '../queries/index.js';
import { padStringToWidth } from 'discord-button-width';
import about from '../commands/about.js';
import { ceil, floor, min } from 'mathjs';

/**
* Command to check the rating of another player
* Syntax: !rating <username>
*/

async function cosmetics(msg) {
	const commandCalls = ['!cosmetics','!c'];
	const msgAuthorId = msg.author.id;
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		
		if (userMessage.length !== 1) {
			return errorMsg(
				"Expected no inputs for this command."
			);
		}
		
		//Maybe allow multiple inputs- 1st arg would be category, 2nd arg would be sub category (error checking for if it doesn't exist.. maybe default to the level above. E.g. !help commands blah, could default to !help commands, !help blah cancel, could default to !help), include aliases for category and command names
		
		let cosmeticClass = new CosmeticManager(msg);
		return await cosmeticClass.generateCosmeticManager();
	}
	return;
}

class CosmeticManager {
	constructor(inputCmd) {
		this.inputCmd = inputCmd;
		
		this.cosmetics_per_page = 20;
	}
	
	getDefaultCosmeticManagerState() {
		return {
			cosmetic_type: '',
			cosmetic_page: 1,
			num_type_pages: 1,
			cosmetic_keyname: '',
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
		
	async generateCosmeticManager() {
		this.CosmeticManagerState = this.getDefaultCosmeticManagerState();
		await this.initialiseCosmeticLibrary();
		this.initialiseCosmeticsCount();
		
		const currEmbed = this.generateCosmeticsEmbed('home');
		const currComponents = this.generateCosmeticsComponents();
		
		this.cosmeticsMsg = await this.inputCmd.reply({files: currEmbed.embedFiles, embeds: [currEmbed.embedMessage], components: currComponents, ephemeral: true, allowedMentions: { repliedUser: false}})
			.then( async (cMsg) => {
				const cosmeticsFilter =  (i) => {
					if ((!(i.isButton())) && (!(i.isStringSelectMenu()))) {
						i.reply({content: "How did you even do this?!", ephemeral: true});
						return false;
					}
					
					if (this.inputCmd.author.id !== i.user.id) {
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
						
						await cMsg.edit({files: newCosmeticMsg.embedFiles, embeds: [newCosmeticMsg.embedMessage], components: newCosmeticsButtons, ephemeral: true});
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
	}
	
	generateCosmeticsEmbed(cmdType) {
		const embedGetter = {
			home: this.generateHomeEmbed.bind(this),
			type: this.generateCosmeticTypeEmbed.bind(this),
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
		const typeKeys = Object.keys(shopTrackerController.cosmeticTypeNameMap);
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
			title: `Slapshop Cosmetic Preview Manager`,
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
	
	generateCosmeticTypeEmbed() {
		let cosmeticListFields = [];
		
		const cosmeticList = Object.values(this.CosmeticLibrary[this.CosmeticManagerState.cosmetic_type]);
		const startIdx = (this.CosmeticManagerState.cosmetic_page - 1)*this.cosmetics_per_page;
		let col1val = '';
		for (let i = startIdx; i < (startIdx + this.cosmetics_per_page/2); i++) {
			if (!cosmeticList[i]) {
				break;
			}
			const currCosmetic = cosmeticList[i];
			col1val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}\n`;
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
			col2val += `${shopTrackerController.cosmeticRarityEmojiMap[currCosmetic.rarity_rank]} ${currCosmetic.name} ${currCosmetic.has_variants ? shopTrackerController.variantsEmoji : ''}\n`;
		}
		//const col2val = `${cosmeticNameList.slice(startIdx+this.cosmetics_per_page/2, startIdx + this.cosmetics_per_page).join('\n')}`;
		cosmeticListFields.push({
			name: '\u200b',
			value: col2val ? col2val : '\u200b',
			inline: true
		});
		
		let embedFilesList = [];
		const embedAuthor = new Discord.AttachmentBuilder(`./thumbnails/cosmeticMsgAuthor.png`, {name: 'cosmeticMsgAuthor.png'});
		embedFilesList.push(embedAuthor);
		const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/cosmetics/type_icons/${this.CosmeticManagerState.cosmetic_type}.png`, {name: `${this.CosmeticManagerState.cosmetic_type}.png`});
		embedFilesList.push(embedThumb);
		
		let typeEmbed = {
			color: 0xffff00,
			author: {
				name: `${bot.user.username}                                                                                           \u200b`,	
				icon_url: 'attachment://' + embedAuthor.name
			},
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
			title: `Slapshop Cosmetic Preview Manager`,
			description: `Use the ️◀️ ▶️ buttons (if available) to view more pages of cosmetics for this cosmetic type.\nFor details and previews of a specific cosmetic, use the bottom interaction menu.`,
			fields: cosmeticListFields,
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
	
	generateSelectedCosmeticEmbed() {
		const cosmeticInfo = this.CosmeticLibrary[this.CosmeticManagerState.cosmetic_type][this.CosmeticManagerState.cosmetic_keyname];
		
		let authorStr = '';
		if (cosmeticInfo.preview_exists) {
			if ((cosmeticInfo.has_variants) && (cosmeticInfo.variant_preview_exists)) {
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
		const lastSeenStr = cosmeticInfo.days_seen ? `<t:${Date.parse(cosmeticInfo.days_seen.at(-1))/1000}:R>` : '-';
		
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
				
			],
			//footer: {
			//	text: `\u200b${''.padEnd(183)}\u200b`
			//}
		};
		
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
					
					cosmeticEmbed.footer = {
						text: `Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]}`
					};
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
					cosmeticEmbed.footer = {
						text: `Type: ${shopTrackerController.cosmeticTypeNameMap[this.CosmeticManagerState.cosmetic_type]}  •  Page ${this.CosmeticManagerState.variant_page} of ${this.CosmeticManagerState.num_variant_pages}`
					};
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
				.setDisabled(this.CosmeticManagerState.cosmetic_keyname ? (this.CosmeticManagerState.variant_page <= 1) : (this.CosmeticManagerState.cosmetic_type ? (this.CosmeticManagerState.cosmetic_page <= 1) : true))
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics page up`)
				.setEmoji('▶️')
				.setStyle(Discord.ButtonStyle.Primary)
				.setDisabled(this.CosmeticManagerState.cosmetic_keyname ? (this.CosmeticManagerState.variant_page >= this.CosmeticManagerState.num_variant_pages) : (this.CosmeticManagerState.cosmetic_type ? (this.CosmeticManagerState.cosmetic_page >= this.CosmeticManagerState.num_type_pages) : true))
		)
		
		if (this.CosmeticManagerState.cosmetic_type) {
			row.addComponents(
				new Discord.ButtonBuilder()
					.setCustomId(`!cosmetics page ${this.CosmeticManagerState.cosmetic_type}`)
					.setEmoji(`${shopTrackerController.cosmeticTypeEmojiMap[this.CosmeticManagerState.cosmetic_type]}`)
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(!this.CosmeticManagerState.cosmetic_keyname)
					//.setDisabled(this.CosmeticManagerState.cosmetic_keyname ? false : true)
			)
		}
		
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics home`)
				.setLabel(`\u200b${padStringToWidth('Home',this.CosmeticManagerState.cosmetic_type ? 128 : 197,"center")}\u200b`)
				.setEmoji('🏠')
				.setStyle(Discord.ButtonStyle.Secondary)
				.setDisabled(!this.CosmeticManagerState.cosmetic_type)
				//.setDisabled(this.CosmeticManagerState.cosmetic_type ? false : true)
		)
		
		row.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!cosmetics about`)
				.setLabel(`\u200b${padStringToWidth('About',58,"center")}\u200b`)
				.setEmoji('<:OSLCorgo:1114817237317075025>')
				.setStyle(Discord.ButtonStyle.Secondary)
		)
			
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
					.setMinValues(1)
					.setMaxValues(1)
			);
			
		for (const typeKey of Object.keys(this.CosmeticLibrary)) {
			if (typeKey === this.CosmeticManagerState.cosmetic_type) {
				row.components[0].addOptions(
					new Discord.StringSelectMenuOptionBuilder()
						.setLabel(shopTrackerController.cosmeticTypeNameMap[typeKey])
						.setValue(typeKey)
						.setEmoji(shopTrackerController.cosmeticTypeEmojiMap[typeKey])
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(shopTrackerController.cosmeticTypeNameMap[typeKey])
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
					.setMinValues(1)
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
						.setLabel(cosmeticList[i].name)
						.setValue(cosmeticKeyname)
						.setEmoji(shopTrackerController.cosmeticRarityEmojiMap[cosmeticList[i].rarity_rank])
						.setDefault(true)
				);
				continue;
			}
			row.components[0].addOptions(
				new Discord.StringSelectMenuOptionBuilder()
					.setLabel(cosmeticList[i].name)
					.setValue(cosmeticKeyname)
					.setEmoji(shopTrackerController.cosmeticRarityEmojiMap[cosmeticList[i].rarity_rank])
					.setDefault(false)
			);
		}
		
		return row;
	}
}

export default cosmetics;
