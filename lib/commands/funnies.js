import { floor, random } from 'mathjs';
import Discord from 'discord.js';
import * as quote from 'inspirational-quotes';

/**
 * Command to print out the current version of the bot
 *  Syntax: !version
 */

function slap(msg) {
    const userMessage = msg.content.toLowerCase();
    if (userMessage == '!slap') {
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/slapshot.png', {name: 'slapshot.png'}); //from: https://cdn.discordapp.com/emojis/654842872532566041.png?v=1
		embedFilesList.push(embedThumb);
		
		let slapEmbed = {
			color: 0x34baeb,
			title: 'Shot',
			thumbnail: {
				url: 'attachment://' + embedThumb.name,
			},
		};
		
		return {
            embedMessage: slapEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
    }
}

function coinToss(msg) {
	const userMessage = msg.content.toLowerCase();
	
	if (userMessage == '!toss') {
		if (Math.floor(Math.random() * 2)) {
			var toss = 'Heads';
		}
		else {
			var toss = 'Tails';
		}
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/coinToss.png', {name: 'coinToss.png'}); //from: https://www.clipartkey.com/mpngs/m/16-165801_coin-clipart-free-transparent-coins-png.png
		embedFilesList.push(embedThumb);
		
		let tossEmbed = {
			color: 0x34baeb,
			title: 'Toss',
			thumbnail: {
				url: 'attachment://' + embedThumb.name,
			},
			description: toss,
		};
		
		return {
            embedMessage: tossEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
	}
}

function rollDice(msg) {
	const userMessage = msg.content.toLowerCase();
	
	if (userMessage == '!dice') {
		const rollNum = Math.floor(Math.random() * 6) + 1;
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rollDice.png', {name: 'rollDice.png'}); //from: https://lh3.googleusercontent.com/proxy/HJ8MzoXnVcItRvuIC3OM5LolwCiiZCfoBb2BzYv1EJDFScTBQ8rr1ZXxtunyaKBA_ArL6641RD0BIivFdfuiX-xbHKXoUBQaoTe3mYoAmz2
		//const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/dice_rolls/${rollNum}.png`, `${rollNum}.png`);
		embedFilesList.push(embedThumb);
		
		let rollEmbed = {
			color: 0x34baeb,
			title: 'Dice',
			thumbnail: {
				url: 'attachment://' + embedThumb.name,
			},
			description: rollNum,
		};
		
		return {
            embedMessage: rollEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
	}
}

function rollNumber(msg) {
	const userMessage = msg.content.toLowerCase();
	
	if (userMessage == '!roll') {
		const rollNum = Math.floor(Math.random() * 101);
		
		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/rollNumber.png', {name: 'rollNumber.png'}); //from: Created on MS Word
		embedFilesList.push(embedThumb);
		
		let rollEmbed = {
			color: 0x34baeb,
			title: 'Roll',
			thumbnail: {
				url: 'attachment://' + embedThumb.name,
			},
			description: rollNum,
		};
		
		return {
            embedMessage: rollEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
	}
}

function playingCardDraw(msg) {
	const userMessage = msg.content.toLowerCase();
	
	if ((userMessage == '!draw') || (userMessage == '!hitme')) {
		
		const cardNum = "23456789TJQKAL"; //L for Joker
		const cardSuit = "DCHS";
		let card = (cardNum.charAt(Math.floor(Math.random() * 14))).replace('T','10') + cardSuit.charAt(Math.floor(Math.random() * 4));

		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder(`./thumbnails/playing_cards/${card}.png`, {name: `${card}.png`}); //from: http://acbl.mybigcommerce.com/52-playing-cards/
		embedFilesList.push(embedThumb);
		
		let cardEmbed = {
			color: 0x34baeb,
			title: 'Hit',
			thumbnail: {
				url: 'attachment://' + embedThumb.name,
			},
		};
		
		return {
            embedMessage: cardEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
	}
}

function hiDad(msg) {
	const userMessage = msg.content;
	
	if (((userMessage.toLowerCase().startsWith("i'm ")) || (userMessage.toLowerCase().startsWith("im "))) && (Math.floor(Math.random() * 100) < 5)) {
		var replyName = userMessage.substr(userMessage.indexOf(' ')+1);
		const replyMsg = `Hi ${replyName}. Nice to meet you!`;
		
		return {
			msgContent: replyMsg,
			deleteSenderMessage: false
		};

	}
	else if ((userMessage.toLowerCase().startsWith("i am ")) && (Math.floor(Math.random() * 100) < 5)) {
		var replyName = userMessage.substr(userMessage.indexOf(" ", userMessage.indexOf(" ")+1)+1);
		const replyMsg = `Hi ${replyName}. Nice to meet you!`;
		
		return {
			msgContent: replyMsg,
			deleteSenderMessage: false
		};
	}	
}

function inspQuote(msg) {
	const userMessage = msg.content;
	
	if (userMessage == '!quote') {

		let embedFilesList = [];
		const embedThumb = new Discord.AttachmentBuilder('./thumbnails/quote.png', {name: 'quote.png'}); //from: Created on MS Word
		embedFilesList.push(embedThumb);
		
		let quoteEmbed = {
			color: 0x800080,
		};
	
		if (Math.floor(Math.random() * 2)) {
			var Quote = quote.getQuote();
			quoteEmbed.author = {
				name: `${Quote.author}`.substring(0,256),
				icon_url: 'attachment://' + embedThumb.name
			}
			quoteEmbed.description = `${Quote.text}`;
		}
		else {
			var Quote = quote.getRandomQuote();
			quoteEmbed.author = {
				name: `\u200b`,
				icon_url: 'attachment://' + embedThumb.name
			}
			quoteEmbed.description = `${Quote}`
		}
	
		return {
            embedMessage: quoteEmbed,
			embedFiles: embedFilesList,
            deleteSenderMessage: false
        };
	}
}

export { slap, coinToss, rollDice, rollNumber, playingCardDraw, hiDad, inspQuote };