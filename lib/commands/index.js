//import version from './version.js';
import register from './register.js';
import leaderboard from './leaderboard.js';
import { rating, ratingCareer } from './rating.js';
import { versus, versusCareer } from './versus.js';
import seasonSummary from './summary.js';
import { queue, kickFromQueue, idleReset } from './queue.js';
import draftPlayer from './draftPlayer.js';
import { reportMatch, adminReportMatch } from './reportMatch.js';
import listDrafts from './listDrafts.js';
import activeMatches from './activeMatches.js';
import forceRemoveDraft from './forceRemoveDraft.js';
import seasonRoll from './playerRolls.js';
//import role from './role.js';
import { info, infoSub, cmdList } from './info.js';
import role from './subscription.js';
import { slap, coinToss, rollDice, rollNumber, playingCardDraw, hiDad, inspQuote } from './funnies.js';
import softReset from './softReset.js';
import teamsReset from './teamsReset.js';
import refreshList from './refreshList.js';
import { callServerTip } from './serverTip.js';
import about from './about.js';
import playerList from './playerList.js';
import teamList from './teamList.js';
import echo from './echo.js';

export {
	//version,
	register,
	leaderboard,
	rating,
	ratingCareer,
	versus,
	versusCareer,
	seasonSummary,
	queue,
	kickFromQueue,
	idleReset,
	draftPlayer,
    reportMatch,
	adminReportMatch,
	listDrafts,
	activeMatches,
    forceRemoveDraft,
	seasonRoll,
    role,
	info,
	infoSub,
	cmdList,
	slap,
	coinToss,
	rollDice,
	rollNumber,
	playingCardDraw,
	softReset,
	teamsReset,
	hiDad,
	inspQuote,
	refreshList,
	callServerTip,
	about,
	playerList,
	teamList,
	echo,
};
