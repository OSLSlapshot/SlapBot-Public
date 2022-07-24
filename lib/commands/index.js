import version from './version';
import register from './register';
import leaderboard from './leaderboard';
import rating from './rating';
import { queue, kickFromQueue, idleReset } from './queue';
import draftPlayer from './draftPlayer';
import { reportMatch, adminReportMatch } from './reportMatch';
import listDrafts from './listDrafts';
import activeMatches from './activeMatches';
import forceRemoveDraft from './forceRemoveDraft';
import { info, infoSub, cmdList } from './info';
import role from './subscription';
import { slap, coinToss, rollDice, rollNumber, playingCardDraw, hiDad, inspQuote } from './funnies';
import softReset from './softReset';
import teamsReset from './teamsReset';
import refreshList from './refreshList';
import { callServerTip } from './serverTip';
import about from './about';
import playerList from './playerList';
import teamList from './teamList';

export {
	version,
	register,
	leaderboard,
	rating,
	queue,
	kickFromQueue,
	idleReset,
	draftPlayer,
    reportMatch,
	adminReportMatch,
	listDrafts,
	activeMatches,
    forceRemoveDraft,
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
};
