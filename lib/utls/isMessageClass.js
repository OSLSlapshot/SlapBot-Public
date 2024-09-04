import Discord from 'discord.js';

function isMessageClass(cmd_call) {
	return cmd_call instanceof Discord.Message;
}

export default isMessageClass
