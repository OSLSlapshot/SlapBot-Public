import { cmdChannels } from '../index.js';
import Discord from 'discord.js';
import errorMsg from '../scripts/errorMessage.js';
import { getCosmeticInfoQuery, updateCosmeticLibraryQuery } from '../queries/index.js';
import request from 'request';
import fs from 'fs';
import { spawn } from 'child_process';

const typeMap = {
	1: 'back',
	2: 'eyes_decal',
	3: 'eyes_item',
	4: 'face_decal',
	5: 'facial_hair',
	6: 'facial_hair_color',
	7: 'gloves',
	8: 'goal_horn',
	9: 'hair_color',
	10: 'hairstyle',
	11: 'hat',
	12: 'jersey',
	13: 'mouth_decal',
	14: 'mouth_item',
	15: 'pants',
	16: 'puck',
	17: 'skin_color',
	18: 'stick',
	19: 'stick_base_color',
	20: 'stick_tape_color',
};

async function submitPreview(msg) {
	const commandCalls = ['!submitpreview','!sp'];
	const msgAuthorId = msg.author.id;
	const userMessage = msg.content.trimEnd().match(/\S+/g);
	
    if ((userMessage) && (commandCalls.includes(userMessage[0].toLowerCase()))) {
		if ((msg.channel.name !== cmdChannels.previewSubCh.name)) {
			return errorMsg("You cannot use that command here.");
		}
		
		let cos_type;
		let keyname;
		if (userMessage.length === 3) {
			/*
			if (!/^\d+$/.test(userMessage[1])) {
				return errorMsg('The first input must be a number (representing the type of cosmetic).');
			}
			*/
			cos_type = typeMap[`${userMessage[1]}`];
			if (!cos_type) {
				const returnErr = errorMsg('The first input must be a number between 1 and 19 (representing the type of cosmetic).');
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
			keyname = userMessage[2];
		}
		else if (userMessage.length === 1) {
			const returnErr = errorMsg(
				"Expected 2 inputs for this command"
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		else {
			if ((!userMessage.includes('Key:')) || (!userMessage.includes('Type:'))) {
				const returnErr = errorMsg(
					'Invalid input',
					'Please ensure that the input includes the "Key:" and "Type:" keywords followed by their respective names. Alternatively, you may enter an integer value (representing the type of cosmetic) followed by the cosmetic\'s key name.'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
			const cos_type_inp = userMessage[userMessage.indexOf('Type:') + 1].replace(',','');
			cos_type = Object.values(typeMap).includes(cos_type_inp) ? cos_type_inp : null;
			if (!cos_type) {
				const returnErr = errorMsg('Invalid cosmetic type input');
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
			keyname = userMessage[userMessage.indexOf('Key:') + 1].replace(',','');
		}
		
		let cos_info = await getCosmeticInfoQuery(cos_type,keyname);
		
		if (!cos_info) {
			const returnErr = errorMsg(
				'Could not find cosmetic in the library',
				'Please make sure to input the key name correctly, including any lower/upper case letters.'
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		
		if (cos_info.preview_exists) {
			if (cos_info.has_variants) {
				if (cos_info.variant_preview_exists) {
					const returnErr = errorMsg(
						'Preview exists',
						'Thank you for your submission. The preview for this cosmetic already exists!'
					);
					return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
				}
			}
			else {
				const returnErr = errorMsg(
					'Preview exists',
					'Thank you for your submission. The preview for this cosmetic already exists!'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
		}
		
		//deal with attachments
		const attached_files = msg.attachments.map(a => a);	//https://discord.js.org/#/docs/collection/main/class/Collection
		
		let imgdim;
		if (attached_files.length === 0) {
			const returnErr = errorMsg('Expected at least one attachment');
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		else if (attached_files.length === 1) {
			imgdim = 200;
		}
		else {
			imgdim = 100;
		}
		
		//for (const a of msg.attachments) {
		//	console.log(a);
		//}
		
		//console.log(attached_files.first());
		//console.log(attached_files.get(1));
		for (const attached_file of attached_files) {
			if ((attached_file.contentType !== 'image/png') && (attached_file.contentType !== 'image/jpeg')) {
				const returnErr = errorMsg(
					'Invalid file type',
					'Only PNG or JPEG images are accepted.'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
			
			if ((attached_file.height < imgdim) || (attached_file < imgdim)) {
				const returnErr = errorMsg(
					'Image dimensions too small',
					'The image dimensions seem to be too small. Please ensure that all edges of the preview/s are visible in the screenshot.'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
		}
			
		let count = 1;
		for (const attached_file of attached_files) {
			try {
				const fileWriteStream = request(attached_file.url).pipe(fs.createWriteStream(`./thumbnails/cosmetics/pending_detection/${cos_type},${keyname},${count}.${attached_file.name.slice(-3)}`));
				
				//wait for file to write to server
				await new Promise((resolve, reject) => {
					fileWriteStream.on('finish', () => {
						resolve();  
					}).on('error', err => {
						reject(err);
					});
				});

				
				//await once(fileWriteStream, 'finish');
			}
			catch (err) {
				const returnErr = errorMsg(
					'Could not write file to server',
					'There was an error saving your screenshot to the server. Please try submitting again.'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
			count += 1;
		}
		/*
		if ((attached_file.contentType !== 'image/png') && (attached_file.contentType !== 'image/jpeg')) {
			const returnErr = errorMsg(
				'Invalid file type',
				'Only PNG or JPEG images are accepted.'
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		
		if ((attached_file.height < 200) || (attached_file < 200)) {
			const returnErr = errorMsg(
				'Image dimensions too small',
				'The image dimensions seem to be too small. Please ensure that all edges of the preview/s are visible in the screenshot.'
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		*/
		
		
		
		//save screenshot to server
		/*
		try {
			const fileWriteStream = request(attached_file.url).pipe(fs.createWriteStream(`./thumbnails/cosmetics/pending_detection/${cos_type},${keyname}.${attached_file.name.slice(-3)}`));
			
			//wait for file to write to server
			await new Promise((resolve, reject) => {
				fileWriteStream.on('finish', () => {
					resolve();  
				}).on('error', err => {
					reject(err);
				});
			});

			
			//await once(fileWriteStream, 'finish');
		}
		catch (err) {
			const returnErr = errorMsg(
				'Could not write file to server',
				'There was an error saving your screenshot to the server. Please try submitting again.'
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}
		*/
		//inputs to python script
		//maybe none? Name attachment files to be type,keyname
		//then the python script can convert all files inside a folder and move them to another location
		//let pyProg = spawn('python', ['./lib/scripts/preview_extractor.py'], {stdio: "inherit"});
		
		try {
			const pyOutStr = await getPythonScriptStdout('./lib/scripts/preview_extractor.py');
			const output = pyOutStr.split(':');
			console.log(output);
			if (!output[0].startsWith('Success')) {
				const returnErr = errorMsg(
					'Preview detection script failed',
					'Something went wrong in the preview detection script. Please try a new screenshot, or contact the developer.'
				);
				return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
			}
		}
		catch (err) {
			console.log(err);
			const returnErr = errorMsg(
				'Preview detection script failed',
				'Something went wrong in the preview detection script. Please try a new screenshot, or contact the developer.'
			);
			return await sendMsgAndTypeMap({embeds: [returnErr.embedMessage], files: returnErr.embedFiles});
		}

		//screenshots submitted and preview/s generated successfully
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/puckOfApproval.png', {name: 'puckOfApproval.png'});
		embedFilesList.push(embedThumb);
		
		const tyEmbed = {
			color: 0x00ff00,
			title: 'Preview submitted, pending approval!',
			description: `Thank you for your submission, <@${msgAuthorId}>! The screenshot has been processed and is pending approval.`,
			thumbnail: {
				url: 'attachment://' + embedThumb.name
			},
		};
		
		//send thank you for your submission, it is now pending approval embed
		//await cmdChannels.previewSubCh.send({embeds: [tyEmbed], files: embedFilesList});
		await sendMsgAndTypeMap({embeds: [tyEmbed], files: embedFilesList});
		
		//create collectors for the submission and send to modCh
		const pendingApprovalDir = `./thumbnails/cosmetics/pending_approval/`
		let pendingApprovalFiles = fs.readdirSync(pendingApprovalDir);
		pendingApprovalFiles = pendingApprovalFiles.filter( f => {
			return (new RegExp(cos_type + ',' + keyname + '.*\.(png|jpg)$')).test(f)
		});
		
		let approvalFilesList = [];
		for (const f of pendingApprovalFiles) {
			approvalFilesList.push(new Discord.AttachmentBuilder(`${pendingApprovalDir}${f}`, {name: `${f}`}));
		}
		const approvalEmbed = {
			color: parseInt(cos_info.rarity_color.replace('#','0x'),16),
			title: cos_info.name,
			description: `Key: ${keyname}\nType: ${cos_type}\nRarity: ${cos_info.rarity_name}\nHas variants: ${cos_info.has_variants}\nSubmitted by: <@${msgAuthorId}>\n\nDo the pictures above match the cosmetic information and do the crops look good?\n**Guide:**\nPlease open each preview to view the full image.\nThere should be no extra bits on any side.\nThe default cosmetic preview should be a square-shaped image with the background colour matching this embed's colour on the left. It will sometimes crop into the cosmetic by a little bit.\nAll variants should be fully visible with a small blue border.`
		};
		
		let approvalRow = [new Discord.ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!sp yes`)
				//.setLabel(`\u200b${padStringToWidth('Top',secButtonWidth+4,"center")}\u200b`)
				.setLabel(`Yes`)
				//.setLabel('Top')
				.setEmoji('✅')
				.setStyle(Discord.ButtonStyle.Success)
		)
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(`!sp no`)
				//.setLabel(`\u200b${padStringToWidth('15',secButtonWidth+2,"center")}\u200b`)
				.setLabel(`No`)
				//.setLabel('15')
				.setEmoji('✖️')
				.setStyle(Discord.ButtonStyle.Danger)
		)]
		
		//await cmdChannels.modCh.send({content: `Name: ${cos_info.name}\nKey: ${keyname}\nType: ${cos_type}`
		const approvalMsg = await cmdChannels.modCh.send({embeds: [approvalEmbed], files: approvalFilesList, components: approvalRow});
		
		const libDir = `./thumbnails/cosmetics/library/slapbot/`
		
		const approvalMsgCollector = approvalMsg.createMessageComponentCollector({max: 1});
		approvalMsgCollector.on('collect', async i => {
			const buttonPressed = i.customId;
			const cmdCalled = buttonPressed.slice(4);
			//const cmdCalledArgs = cmdCalled.split(' ');
			
			await i.deferUpdate();
			
			if (cmdCalled === 'yes') {
				let variantsInFiles = false;
				for (const f of pendingApprovalFiles) {
					fs.renameSync(`${pendingApprovalDir}${f}`,`${libDir}${cos_type}/${f.slice(cos_type.length+1)}`);
					if (f.includes('_variants')) {
						variantsInFiles = true;
					}
				}
				
				const ssFiles = fs.readdirSync(`./thumbnails/cosmetics/pending_detection/bin/`)
					.filter( (fn) => {
						return (new RegExp(`${cos_type},${keyname}` + '.*\.(png|jpg)$')).test(fn)
					});
				
				for (const f of ssFiles) {
					fs.renameSync(`./thumbnails/cosmetics/pending_detection/bin/${f}`,`./thumbnails/cosmetics/library/screenshots/${f}`);
				}
				
				cos_info.preview_exists = true;
				if (variantsInFiles) { cos_info.variant_preview_exists = true; }
				await updateCosmeticLibraryQuery({ [keyname] : cos_info });
				
				await i.followUp({content: `:white_check_mark: Thank you <@${i.user.id}>! The cosmetic previews have been added to the library.`});
			}
			else {	//no pressed
				for (const f of pendingApprovalFiles) {
					//fs.renameSync(`${pendingApprovalDir}${f}`,`${pendingApprovalDir}bin/${f}`);
					fs.unlinkSync(`${pendingApprovalDir}${f}`);
				}
				await i.followUp({content: `:x: Thank you <@${i.user.id}>! The cosmetic previews have been rejected.`});
			}
		});
		
		approvalMsgCollector.once('end', async () => {
			await approvalMsg.edit({embeds: [approvalEmbed], files: approvalFilesList, components: []});
		});
		
		//update library
	}
}

async function getPythonScriptStdout(pythonScriptPath) {
	const python = spawn('python', [pythonScriptPath]);	//change to 'python3' for server
	return await new Promise((resolve, reject) => {
		let result = ""
		python.stdout.on('data', (data) => {
			result += data;
		});
		python.on('close', () => {
			resolve(result);
		});
		/*
		python.on('error', (err) => {
			console.log('err');
			reject(err);
		});
		*/
		python.stderr.on('data', (err) => {
			reject(err);
		});
	});
}

async function sendMsgAndTypeMap(msgObjToSend) {
	await cmdChannels.previewSubCh.send(msgObjToSend);
	
	//const typeMapStr = Object.entries(typeMap).map(([k,v]) => `**${k}** ${v}`).join('\n');
	let typeMapStrs = ['', '', ''];
	/*
	for (const [k,v] of Object.entries(typeMap)) {
		switch (k) {
			case 1:
				typeMapStrs[0] += `\n**${k}** ${v}`;
				break;
			case 2:
				typeMapStrs[1] += `\n**${k}** ${v}`;
				break;
			case 0:
				typeMapStrs[2] += `\n**${k}** ${v}`;
				break;
		}
	}
	*/
	for (const [k,v] of Object.entries(typeMap)) {
		if (k<8) {	//1-7
			typeMapStrs[0] += `\n**${k}** ${v}`;
		}
		else if (k>14) {	//14-19
			typeMapStrs[2] += `\n**${k}** ${v}`;
		}
		else {	//8-13
			typeMapStrs[1] += `\n**${k}** ${v}`;
		}
	}
	
	const typeMapEmbed = {
		color: 0xffffff,
		title: 'Slapshop Preview Submission',
		//description: `*This channel is for submitting cosmetic previews to be used in ${cmdChannels.dailyShopCh}. See channel pins for more info.*\n\nCommand syntax:\n` + '(1) `!sp <type number> <key name>` OR\n(2) `!sp ... Key: <key name>, Type: <type name>...`\n\nOne screenshot attachment is also required.',
		description: `Command syntax:\n` + '(1) `!sp <type number> <key name>` OR\n(2) `!sp ... Key: <key name>, Type: <type name>...`\n\nOne screenshot attachment is also required.',
		fields: [
			{
				name: 'Type Map (for syntax 1)',
				value: typeMapStrs[0],
				inline: true
			},
			{
				name: '\u200b',
				value: typeMapStrs[1],
				inline: true
			},
			{
				name: '\u200b',
				value: '\u200b' + typeMapStrs[2],
				inline: true
			},
			{
				name: '\u200b',
				value: `*This channel is for submitting cosmetic previews to be used in ${cmdChannels.dailyShopCh}. See channel pins for more info.*`
			}
		]
	};
	
	await cmdChannels.previewSubCh.send({content: '≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡', embeds: [typeMapEmbed]});
	
	return;
}

export default submitPreview;