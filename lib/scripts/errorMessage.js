import Discord from 'discord.js';

function errorMsg(primMsg, secMsg = null,toDMs = null,deleteMsg = false) {
	let embedFilesList = [];
	const embedAuthThumb = new Discord.MessageAttachment('./thumbnails/error.png', 'error.png'); //from: created on MS Word
	embedFilesList.push(embedAuthThumb);

	let errEmbed = {
		color: 0xff1919,
		author: {
			name: 'Error',
			icon_url: 'attachment://' + embedAuthThumb.name
		},
		//title: primMsg,
		fields: [
			{
				name: primMsg,
				value: '\u200b'
			}
		]
	};
	
	if (secMsg) { errEmbed.fields[0].value = secMsg; }
	
	let returnObj = {
		embedMessage: errEmbed,
		embedFiles: embedFilesList,
		deleteSenderMessage: deleteMsg,
	};
	
	if (toDMs) {
		returnObj.sendToDm = toDMs;
	}
	
	if (deleteMsg === true) {
		returnObj[deleteSenderMessage] = deleteMsg;
	}
	
	return returnObj;
}

export default errorMsg;
