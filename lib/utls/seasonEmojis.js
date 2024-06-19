const seasonEmojis = {
	summer: '☀️',
	autumn: '🍂',
	winter: '❄️',
	spring: '🌱'
};

function getSeasonEmojiFromMonth(month) {
	const monthInt = parseInt(month);
	switch (monthInt) {
		case 12:
		case 1:
		case 2:
			return seasonEmojis.summer;
		case 3:
		case 4:
		case 5:
			return seasonEmojis.autumn;
		case 6:
		case 7:
		case 8:
			return seasonEmojis.winter;
		case 9:
		case 10:
		case 11:
			return seasonEmojis.spring;
		
	}
}

export default getSeasonEmojiFromMonth;
