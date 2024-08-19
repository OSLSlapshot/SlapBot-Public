/* ==========================================
*	Dependencies
/* ========================================== */

//import Bluebird from 'bluebird';
//import _ from 'lodash';
import cfg from '../../config.js';
import fs from 'fs';
import { min,max } from 'mathjs';
import stripUsername from '../utls/stripUsername.js';
import { getDirectories, initDatabase } from '../scripts/initDatabase.js';
import { GoogleSpreadsheet } from "google-spreadsheet";
import async from "async";
import Chart from 'chart.js/auto/auto.js';
//import { cmdChannels } from '../index.js';
import mergeImages from 'merge-images';
import { Canvas, Image } from 'canvas';
import { ChartJSNodeCanvas, ChartCallback, CanvasRenderService } from 'chartjs-node-canvas';
import capitaliseFirstLetter from '../utls/capitaliseFirstLetter.js';
import { pieSortBy } from '../utls/sortBy.js';

/*
import {
	ChartJSNodeCanvas,
	ChartCallback,
	CanvasRenderService,
} from "chartjs-node-canvas";
import mergeImages from "merge-images";
import { Canvas, Image } from "canvas";
*/

/* ==========================================
*	Functions
/* ========================================== */
/*
function getCurrentIsoDate() {
		const date = new Date();
		return date.toISOString();
}
*/

const databasePath = "./Database/";
const dataPath = "./Database/data/";
const tempsPath = "./Database/templates/";
const temps = ["Players.txt", "Matches.txt", "RatingChanges.txt"];

/*
function setDefaults(options, defaults) {	//from: https://www.codereadability.com/what-are-javascript-options-objects/#:~:text=An%20options%20object%20is%20a,all%20of%20which%20are%20optional
    return _.defaults({}, _.clone(options), defaults);
}
*/
function Player(options) {
	this.playerId = options.playerId || '-';
	this.discordId = options.discordId || '-';
	this.username = options.username || '-';
}

function ModeRating(options) {
	this.playerId = options.playerId || '-';
	this.rating = options.rating || '-';
	this.sigma = options.sigma || '-';
	this.wins = options.wins || (options.wins === 0 ? 0 : '-');
	this.losses = options.losses || (options.losses === 0 ? 0 : '-');
	this.lastPlayed = options.lastPlayed || '-';
}

function Team(options) {
	this.teamId = options.teamId || '-';
	//this.discordId = options.discordId || '-';
	this.teamName = options.teamName || '-';
	this.league = options.league || '-';
	this.players = options.players || [];
}

function LeaguePlayer(options) {
	this.discordId = options.discordId || '-';
	this.username = options.username || '-';
	this.league = options.league || '-';
	this.teamName = options.teamName || '-';
}

function LeagueTeam(options) {
	this.teamId = options.teamId || '-';
	this.teamName = options.teamName || '-';
	this.teamLeague = options.teamLeague || '-';
	this.teamRating = options.teamRating || '-';
	this.teamSigma = options.teamSigma || '-';
	this.teamWins = options.wins || (options.wins === 0 ? 0 : '-');
	this.teamLosses = options.losses || (options.losses === 0 ? 0 : '-');
	this.teamLastPlayed = options.lastPlayed || '-';
	this.players = options.players || [];
}

function Match(options) {
	this.matchId = options.matchId || '-';
	this.time = options.time || '-';
	this.playerIds = options.playerIds || '-';
	this.winners = options.winners || '-';
	this.losers = options.losers || '-';
	this.mode = options.mode || '-';
}

function RatingUpdate(options) {
	this.ratingId = options.ratingId || '-';
	this.matchId = options.matchId || '-';
	this.playerId = options.playerId || '-';
	this.oldRating = options.oldRating || '-';
	this.ratingChange = options.ratingChange || '-';
	this.sigmaChange = options.sigmaChange || '-';
	this.mode = options.mode || '-';
}


function getColNameIdx(arr,search) {
	//return column name index for list of strings
	//returns first instance of the string found, null if not found

	let ColIdx;
	
	for (const s of search) {
		ColIdx = arr.indexOf(s);
		if (ColIdx !== -1) {
			return ColIdx;
		}
	}
	
	return null;
}


function getCol(arr, idx) {
	//get column with index idx
	return arr.map((x) => x[idx]);
}

function findMaxId(identifier, arr) {
	//find the largest ID number in input array
	const arrInt = arr.map((x) => getIdNum(x));
	return arrInt.reduce(function (a, b) {
		return Math.max(a, b);
	});
}

function getIdNum(str) {
	//returns the Id number by removing all non-numeric characters
	return parseInt(str.replace(/\D/g, ""));
}

function getIdType(str) {
	//returns the Id type by removing all numeric characters
	return str.replace(/\d/g, "");
}

function makeIdStr(identifier,idNum) {
	return `${identifier}${idNum}`;
}

function getCurrentDataPath() {
	const datesDirs = getDirectories(dataPath);
	const searchStr = "(current)";
	for (const dir of datesDirs) {
		if (dir.slice(-searchStr.length) === searchStr) {
			return dataPath + dir;
		}
	}
	return false;
}

function getSeasonDataPath(season) {
	const datesDirs = getDirectories(dataPath);
	/*
	if (datesDirs.includes(season)) {
		return dataPath + season + '/';
	}
	*/
	for (const d of datesDirs) {
		if (d.includes(season)) {
			return dataPath + d + '/';
		}
	}
	return false;
}

function getSeasonModesQuery(season) {
	let seasonPath;
	switch (season) {
		case 'career':
			let modesList = [];
			for (const m of [...cfg.modes, ...cfg.retiredModes]) {
				modesList.push(m.modeName);
			}
			return modesList;
		case 'current':
			seasonPath = getCurrentDataPath();
			break;
		default:
			seasonPath = getSeasonDataPath(season);
	}
	return getDirectories(seasonPath + '/Modes/');
}

function getSeasonListQuery() {
	return getDirectories(dataPath);
}

/**
 * Removes certain query-dangerous characters from usernames
 * @param {*} username
 */
function sanitize(username) {
	return username
		.split(" ")
		.join("")
		.split('"')
		.join("")
		.split("'")
		.join("")
		.split("\\")
		.join("");
}

function getModeInfo(mode) {
	for (const m of [...cfg.modes,...cfg.retiredModes]) {
		if (mode === m.modeName.toLowerCase()) {
			return m;
		}
	}
	
	return null;
}

function getFeaturedModeQuery() {
	const currDataPath = getCurrentDataPath();
	const FeaturedModeDataPath = currDataPath + "/Modes/FeautedModesTrack.txt";
	const FeaturedModeData = readDatabase(FeaturedModeDataPath);
	
	const FeaturedModeDataHeader = FeaturedModeData.shift();
	FeaturedModeData.shift(); //dump empty row
	
	let currTime = new Date(); //UTC
	const lastRowIdx = FeaturedModeData.length - 1;
	
	const pouchStateStr = FeaturedModeData[lastRowIdx][getColNameIdx(FeaturedModeDataHeader,['Pouch'])];
	let pouchState = pouchStateStr === '' ? [] : pouchStateStr.split(',');
	
	//let nextRollDate;
	if (lastRowIdx > -1) {	//non-empty file- a mode roll date exists
		
		const latestWeekDate = new Date(FeaturedModeData[lastRowIdx][getColNameIdx(FeaturedModeDataHeader,['Week'])]); //AEST
		
		//offset both times by 4 hours to reduce programming complexity- the intention is to roll the featured mode on a Monday after a restart, and since the bot restarts at 4 AM AEST, it would be easier to offset times to 12 AM and compare days rather than checking the day and the time without offsetting
		currTime.setHours(currTime.getHours() + 10 - 4); //AEST - 4 hours
		latestWeekDate.setHours(latestWeekDate.getHours() - 4);
		
		//const timeSafetyMargin = 5*60*1000; //5 minute safety margin, just incase the bot starts a little bit early (i.e. *just* before Monday)
		//if it is more than 7 days since last date, OR [if it is a Monday (12 AM, since the 4 hour offset was applied above) and the latest date isn't today], then roll now and write to file
		//the following if statement is the converse of the above
		if (((currTime - latestWeekDate) < (7*24*60*60*1000)) && (!((currTime.getDay() === 1) && (currTime.getDate() !== latestWeekDate.getDate())))) {
			return {
				mode: FeaturedModeData[lastRowIdx][getColNameIdx(FeaturedModeDataHeader,['Mode'])].toLowerCase(),
				rolled: false,
				pouch: pouchState
			};
		}	
	}
	//A roll is needed because either 1) No roll exists in the file, or 2) It is Monday (and the latest date in the file is not today), or 3) It has been 7 days since the latest date in the file)
	
	//roll and write to file
	currTime.setHours(currTime.getHours() + 4); //set back to AEST to write to file

	if (pouchState.length === 0) {
		for (const m of cfg.modes) {
			if ((m.enabled) && (m.featured)) {
				pouchState.push(m.modeName);
			}
		}
	}
	else {
		//check pouchState modes are still enabled
		for (const m of pouchState) {
			const modeInfo = getModeInfo(m.toLowerCase());
			if ((!(modeInfo.enabled)) || (!(modeInfo.featured))) {
				pouchState = pouchState.filter(v => v !== m);
			}
		}
	}
	
	const rolledMode = pouchState[Math.floor(Math.random() * pouchState.length)];
	pouchState = pouchState.filter(v => v !== rolledMode);
	const fileStr = `\n${currTime.toISOString()}\t${rolledMode}\t${pouchState.join(',')}`;
	
	fs.appendFileSync(FeaturedModeDataPath, fileStr);
	
	return {
		mode: rolledMode.toLowerCase(),
		rolled: true,
		pouch: pouchState,
	};
}

/* ==========================================
*	Functional Query Helpers
/* ========================================== */

/**
 * Queries the GraphQL Database to find existing entries
 * @param {String} node - Name of the node to query
 * @param {Array.<String>} properties - List of properties to query for
 */

/*
const queryPlayerDatabase = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let PlayerData = readDatabase(currDataPath + "/Players.txt");

	PlayerData = PlayerData.slice(1);

	return PlayerData.map(
		(player) =>
			new Player(
				player[0],
				player[1],
				player[2],
				parseInt(player[3]),
				parseFloat(player[4]),
				parseInt(player[5]),
				parseFloat(player[6]),
				parseInt(player[7]),
				parseFloat(player[8]),
				parseInt(player[9]),
				parseInt(player[10]),
				parseInt(player[11]),
				parseInt(player[12]),
				parseInt(player[13]),
				parseInt(player[14]),
				player[15],
				player[16],
				player[17]
			)
	);
};
*/
const queryPlayerList = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let PlayerData = readDatabase(currDataPath + "/Players.txt");

	const PlayerDataHeader = PlayerData.shift();
	
	const playerIdCol = getColNameIdx(PlayerDataHeader,['ID']);
	const discordIdCol = getColNameIdx(PlayerDataHeader,['DiscordID']);
	const usernameCol = getColNameIdx(PlayerDataHeader,['Username']);
	
	return PlayerData.map(
		(player) =>
			new Player({
				playerId: player[playerIdCol],
				discordId: player[discordIdCol],
				username: player[usernameCol],
			})
	);
};

const queryPlayerIdMap = (season) => {
	//read database
	//const currDataPath = getCurrentDataPath();
	const currDataPath = getSeasonDataPath(season);
	let PlayerData = readDatabase(currDataPath + "/Players.txt");

	const PlayerDataHeader = PlayerData.shift();
	
	const playerIdCol = getColNameIdx(PlayerDataHeader,['ID']);
	const discordIdCol = getColNameIdx(PlayerDataHeader,['DiscordID']);
	const usernameCol = getColNameIdx(PlayerDataHeader,['Username']);
	
	let PlayerDataObj = {};
	
	for (const p of PlayerData) {
		PlayerDataObj[p[playerIdCol]] = new Player({
			playerId: p[playerIdCol],
			discordId: p[discordIdCol],
			username: p[usernameCol],
		})
	}
	return PlayerDataObj;
};

const queryTeamIdMap = (season) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	let TeamData = readDatabase(currDataPath + "/Teams.txt");

	const TeamDataHeader = TeamData.shift();
	
	const teamIdCol = getColNameIdx(TeamDataHeader,['ID']);
	const teamNameCol = getColNameIdx(TeamDataHeader,['TeamName']);
	const leagueCol = getColNameIdx(TeamDataHeader,['League']);
	//const playersCol = getColNameIdx(TeamDataHeader,['Players']);
	
	let TeamDataObj = {};
	
	for (const t of TeamData) {
		TeamDataObj[t[teamIdCol]] = new Team({
			teamId: t[teamIdCol],
			teamName: t[teamNameCol],
			league: t[leagueCol],
		})
	}
	return TeamDataObj;
};

const genPlayerListQuery = async () => {
	const playerList = await queryPlayerList();
	
	let playerListStr = '';
	
	for (const p of playerList) {
		playerListStr += `\n${p.playerId}\t${p.discordId}\t${p.username}`;
	}
	
	const currDataPath = getCurrentDataPath();
	fs.appendFileSync(currDataPath + "/Players2.txt", playerListStr);
	
	return true;
}

const genNewDataStruct = async (season) => {
	const seasonDataPath = getSeasonDataPath(season);
	if (!seasonDataPath) { return false; }
	
	//read Matches.txt database and find unique values in mode column - this informs which mode stats to get
	//read Players.txt dtb and fetch players and stats
	let MatchData = readDatabase(seasonDataPath + "/Matches.txt");
	const MatchDataHeader = MatchData.shift();
	const modeCol = getCol(MatchData, getColNameIdx(MatchDataHeader, ['League','Mode']));
	const modesPlayed = [...new Set(modeCol)].filter(m => ((m !== '-') && (m !== 'scrims')));
	
	let PlayerData = readDatabase(seasonDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	PlayerData.shift(); //chuck out the blank second line
	const playerIdCol = getColNameIdx(PlayerDataHeader,['ID']);
	const discordIdCol = getColNameIdx(PlayerDataHeader,['DiscordID']);
	const usernameCol = getColNameIdx(PlayerDataHeader,['Username']);
	
	//new database path is './Database/newDataStruct/'
	//create folder called season
	const newDataPath = './Database/newDataStruct/';
	const newSeasonDataPath = newDataPath + season + '/';
	await fs.promises.mkdir(newSeasonDataPath);
	
	//copy over Matches.txt, RatingChanges.txt
	//copy Players.txt template in and then write player list to it
	await fs.promises.copyFile(seasonDataPath + "/Matches.txt", newSeasonDataPath + "/Matches.txt");
	await fs.promises.copyFile(seasonDataPath + "/RatingChanges.txt", newSeasonDataPath + "/RatingChanges.txt");
	await fs.promises.copyFile(tempsPath + '/Players.txt', newSeasonDataPath + "/Players.txt");
	
	const playerListStr = PlayerData.map(
		(player) =>
			genPlayerStr(
				new Player({
					playerId: player[playerIdCol],
					discordId: player[discordIdCol],
					username: player[usernameCol],
				})
			)
		)
		.join('\n');

	await fs.promises.appendFile(newSeasonDataPath + "/Players.txt", '\n' + playerListStr);
	
	//create Modes dir in new season database path
	const modesPath = newSeasonDataPath + '/Modes/';
	await fs.promises.mkdir(modesPath);
	
	//create dir with the modes for the season found earlier
	for (const m of modesPlayed) {
		const capitalisedModeName = capitaliseFirstLetter(m);
		const currModePath = modesPath + capitalisedModeName + '/';
		await fs.promises.mkdir(currModePath);
		
		//copy ModeRatings.txt from templates and rename to Ratings.txt
		await fs.promises.copyFile(tempsPath + '/ModeRatings.txt', currModePath + '/Ratings.txt')
		
		//for each player, for each mode, check if num of matches played for the mode is non-zero... if so, append to a string, and then append the str to the Ratings.txt file for the mode
		const ratingCol = getColNameIdx(PlayerDataHeader,[`${capitalisedModeName}Rating`]);
		const sigmaCol = getColNameIdx(PlayerDataHeader,[`${capitalisedModeName}Sigma`]);
		const winsCol = getColNameIdx(PlayerDataHeader,[`Num${capitalisedModeName}MatchesWon`]);
		const lossesCol = getColNameIdx(PlayerDataHeader,[`Num${capitalisedModeName}MatchesLost`]);
		const lastPlayedCol = getColNameIdx(PlayerDataHeader,[`${capitalisedModeName}LastPlayed`]);
		
		let modeRatingStr = '';
		for (const p of PlayerData) {
			const playerModeRating = new ModeRating({
				playerId: p[playerIdCol],
				rating: parseInt(p[ratingCol]),
				sigma: parseFloat(p[sigmaCol]),
				wins: parseInt(p[winsCol]),
				losses: parseInt(p[lossesCol]),
				lastPlayed: p[lastPlayedCol]
			});
			
			if ((playerModeRating.wins + playerModeRating.losses) > 0) {
				modeRatingStr += `\n${genModeRatingStr(playerModeRating)}`;
			}
		}
		
		await fs.promises.appendFile(currModePath + '/Ratings.txt', modeRatingStr);
	}
	
	return true;
	//deal with scrims data separately, and manually, later
}

const seasonRecoveryRegistrations = async () => {
	const currDataPath = getCurrentDataPath() + '/registrations.json';
	let regos = JSON.parse(fs.readFileSync(currDataPath).toString()).messages;
	//console.log(regos);
	
	let i = 0;
	for (const m of regos) {
		const rego_embed = m.embeds[0];
		
		const player = {
			discordId: i,
			username: rego_embed.fields[1].value
		};
		
		await createPlayer(player);
		console.log(i);
		
		i += 1;
	}
	
	return true;
}

//import recoverySimulate from '../commands/recoverySimulate.js';

const seasonRecoveryMatches = async () => {
	const currDataPath = getCurrentDataPath() + '/matches.json';
	let matches = JSON.parse(fs.readFileSync(currDataPath).toString()).messages;
	
	let haelnorrRatings = '';
	for (const [idx,m] of matches.entries()) {
		const match_embed = m.embeds[0];
		
		/*
		This didn't make a difference
		if ((match_embed.title.includes('reverted.'))) {
			await revertMatchQuery();
			console.log('Match reverted.');
			
			continue;
		}
		*/
		
		//mode
		const mode = match_embed.description.split('```')[1].substring(6).toLowerCase();
		//console.log(mode);
		
		//time
		let matchTime = new Date(m.timestampEdited || m.timestamp);
		matchTime.setHours(matchTime.getHours() + 10); //AEST
		matchTime = matchTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ
		//console.log(matchTime);
		
		//teams
		let teamA = [];
		let teamB = [];
		const teamAStr = match_embed.fields[0].value.split('```');
		const teamBStr = match_embed.fields[1].value.split('```');
		for (const val of teamAStr) {
			if (val) {
				const username_ratings = val.split(' ');
				const username = username_ratings[0];
				teamA.push(username);
				if (username === 'Haelnorr') {
					haelnorrRatings += username_ratings[1] + '\n';
				}
			}
		}
		for (const val of teamBStr) {
			if (val) {
				//teamB.push(val.split(' ')[0]);
				const username_ratings = val.split(' ');
				const username = username_ratings[0];
				teamB.push(username);
				if (username === 'Haelnorr') {
					haelnorrRatings += username_ratings[1] + '\n';
				}
			}
		}
		//console.log(teamA);
		//console.log(teamB);
		
		//winner
		const matchWinner = match_embed.title.slice(-2,-1) === 'A' ? 'teamA' : 'teamB';
		//console.log(matchWinner);
		
		await recoverySimulate(mode, matchTime, teamA, teamB, matchWinner);
		
		await new Promise(r => setTimeout(r, 100));
	}
	
	//console.log(haelnorrRatings);
	
	return true;
}

const queryModeRatings = async (season,mode) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	const currModeInfo = getModeInfo(mode);
	const RatingsData = readDatabase(currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`);
	const RatingsDataHeader = RatingsData.shift(); //first line
	RatingsData.shift(); //throw away second line
	
	return RatingsData.map(
		(player) =>
			new ModeRating({
				playerId: player[getColNameIdx(RatingsDataHeader,['ID'])],
				rating: parseInt(player[getColNameIdx(RatingsDataHeader,['Rating'])]),
				sigma: parseFloat(player[getColNameIdx(RatingsDataHeader,['Sigma'])]),
				wins: parseInt(player[getColNameIdx(RatingsDataHeader,['NumMatchesWon'])]),
				losses: parseInt(player[getColNameIdx(RatingsDataHeader,['NumMatchesLost'])]),
				lastPlayed: player[getColNameIdx(RatingsDataHeader,['LastPlayed'])]
			})
	);
};

const queryTeamList = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let TeamData = readDatabase(currDataPath + "/Teams.txt");

	const TeamDataHeader = TeamData.shift();
	
	const teamIdCol = getColNameIdx(TeamDataHeader,['ID']);
	//const discordIdCol = getColNameIdx(PlayerDataHeader,['DiscordID']);
	const teamNameCol = getColNameIdx(TeamDataHeader,['TeamName']);
	const leagueCol = getColNameIdx(TeamDataHeader,['League']);
	
	return TeamData.map(
		(team) =>
			new Team({
				teamId: parseInt(team[teamIdCol].slice(1)),
				//discordId: player[discordIdCol],
				teamName: team[teamNameCol],
				league: team[leagueCol]
			})
	);
};

/*
const queryTeamDatabase = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let TeamData = readDatabase(currDataPath + "/Teams.txt");

	TeamData = TeamData.slice(2);
	return TeamData.map(
		(team) =>
			new LeagueTeam(
				team[0],
				team[1],
				team[2],
				parseInt(team[3]),
				parseFloat(team[4]),
				parseInt(team[5]),
				parseInt(team[6]),
				team[7],
				[]
			)
	);
};
*/

function readDatabase(fileLoc) {
	try {
		var data = fs.readFileSync(fileLoc, "utf8");
		data = data.replace(/\r/g,'');	//remove all carriage return characters
		data = data.split("\n");
		data = data.map((line) => line.split("\t"));
	}
	catch (e) {
		throw e;
	}

	//implement check for any empty rows and remove from array

	return data;
}

function genPlayerStr(playerObj) {
	return `${playerObj.playerId}\t${playerObj.discordId}\t${playerObj.username}`;
}

function genTeamStr(teamObj) {
	return `${teamObj.teamId}\t${teamObj.teamName}\t${teamObj.league}\t${teamObj.players}`;
}

function genModeRatingStr(modeRatingObj) {
	return `${modeRatingObj.playerId}\t${modeRatingObj.rating}\t${modeRatingObj.sigma}\t${modeRatingObj.wins}\t${modeRatingObj.losses}\t${modeRatingObj.lastPlayed}`;
}

function genMatchStr(matchObj) {
	return `${matchObj.matchId}\t${matchObj.time}\t${matchObj.playerIds}\t${matchObj.winners}\t${matchObj.losers}\t${matchObj.mode}`;
}

function genRatingUpdateStr(ratingUpdateObj) {
	let posSign = "";
	if (ratingUpdateObj.ratingChange >= 0) {
		posSign = "+";
	}
	return `${ratingUpdateObj.ratingId}\t${ratingUpdateObj.matchId}\t${ratingUpdateObj.playerId}\t${ratingUpdateObj.oldRating}\t${posSign}${ratingUpdateObj.ratingChange}\t${ratingUpdateObj.sigmaChange}\t${ratingUpdateObj.mode}`;
}

async function createPlayer(player) {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();

	const checkEnable = true;
	
	const discordIds = getCol(PlayerData, getColNameIdx(PlayerDataHeader, ['DiscordID']));

	if (checkEnable && discordIds.includes(player.discordId)) {
		throw {
			name: "DiscordIDExists",
			message: "Field name = discordId"
		};
	}
	
	const lowerUsernames = getCol(PlayerData, getColNameIdx(PlayerDataHeader, ['Username'])).map((v) => stripUsername(v).toLowerCase());
	const checkUsername = stripUsername(player.username).toLowerCase();
	
	if (checkEnable && lowerUsernames.includes(checkUsername)) {
		const playerFound = await getPlayerQuery(null, player.username, null, null);
		throw {
			name: "UsernameExists",
			message: "Field name = username",
			registered_name: playerFound.username,
		};
	}
	
	const playerIds = getCol(PlayerData, getColNameIdx(PlayerDataHeader, ['ID']));
	
	const lastPlayerID = findMaxId("P", playerIds);
	const newPlayerStr = genPlayerStr(
		new Player({
			playerId: makeIdStr('P',lastPlayerID+1),
			discordId: player.discordId,
			username: player.username
		})
	);
	/* `\nP${lastPlayerID+1}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t0\t0\t0\t0\t0\t0\t-\t-\t-`;
	*/

	//append new player to player database
	try {
		fs.appendFileSync(currDataPath + "/Players.txt", '\n' + newPlayerStr);
		/*
		const PlayerFolder = `P${lastPlayerID + 1} ${player.username}/`;
		fs.mkdir(currDataPath + "/PlayerData/" + PlayerFolder, (err) => {
			if (err) throw err;
			for (const temp of temps) {
				if (!(temp == "Players.txt")) {
					fs.copyFile(
						tempsPath + temp,
						currDataPath + "/PlayerData/" + PlayerFolder + temp,
						(err) => {
							if (err) throw err;
						}
					);
				}
			}
		});
		*/
	}
	catch (err) {
		throw err;
	}
}

const createMatchQuery = async (mode,time = null) => {
	let matchTime;
	if (time) {
		matchTime = time;
	}
	else {
		//getting current time in good format example
		matchTime = new Date(); //UTC
		matchTime.setHours(matchTime.getHours() + 10); //AEST
		matchTime = matchTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ
	}

	const currDataPath = getCurrentDataPath();
	const MatchData = readDatabase(currDataPath + "/Matches.txt");
	const matchIds = getCol(MatchData, 0).slice(1);
	const currentMatchID = findMaxId("M", matchIds) + 1;
	//const currentMatch = new Match(currentMatchID, matchTime, {}, {}, {}, mode);
	const currentMatch = new Match({
		matchId: makeIdStr('M',currentMatchID),
		time: matchTime,
		mode: mode
	});
	const newMatchStr = genMatchStr(currentMatch);
	/*
	`\nM${currentMatch.matchID}\t${currentMatch.time}\t-\t-\t-\t${currentMatch.mode}`;
	*/
	//append new match to match database
	try {
		fs.appendFileSync(currDataPath + "/Matches.txt", '\n' + newMatchStr);
	}
	catch (err) {
		throw err;
	}

	return currentMatch;
};

const recordMatchQuery = async (match, winner, loser, ratingsChange, mode) => {
	let ratingDiffs = {};
	for (const [d,r] of Object.entries(ratingsChange)) {
		const diff = r.newRating - r.previousRating;
		ratingDiffs[d] = `${diff <= 0? "": "+"}${diff}`;
	}
	
	let updatedMatchStr;
	if (mode === "scrims") {
		updatedMatchStr = genMatchStr(
			new Match({
				matchId: match.matchId,
				time: match.time,
				playerIds: `${winner.map((p) => p.teamId).join()},${loser.map((p) => p.teamId).join()}`,
				winners: winner.map((p) => `${p.teamName}(${ratingDiffs[p.teamId]})`).join(),
				losers: loser.map((p) => `${p.teamName}(${ratingDiffs[p.teamId]})`).join(),
				mode: mode
			})
		);
	}
	else {
		updatedMatchStr = genMatchStr(
			new Match({
				matchId: match.matchId,
				time: match.time,
				playerIds: `${winner.map((p) => p.playerId).join()},${loser.map((p) => p.playerId).join()}`,
				winners: winner.map((p) => `${p.username}(${ratingDiffs[p.playerId]})`).join(),
				losers: loser.map((p) => `${p.username}(${ratingDiffs[p.playerId]})`).join(),
				mode: mode
			})
		);
	}

	//find match and replace line with players, winner, loser and ratings
	try {
		const currDataPath = getCurrentDataPath();
		const MatchData = fs.readFileSync(currDataPath + "/Matches.txt", "utf8");
		let searchStr = `${match.matchId}\t${match.time}\t`;
		let re = new RegExp("^.*" + searchStr + ".*$", "gm");
		let updatedData = MatchData.replace(re, updatedMatchStr);
		fs.writeFileSync(currDataPath + "/Matches.txt", updatedData);
		
		/*
		if (mode !== "scrims") {
			const winnersAndLosers = [...winner, ...loser];
			for (const player of winnersAndLosers) {
				const PlayerFolder = `${player.playerID} ${player.username}/`;
				try {
					fs.appendFileSync(currDataPath + "/PlayerData/" + PlayerFolder + "Matches.txt", `\n${updatedMatchStr}`);
				}
				catch (e) {
					throw e;
					/*
					if (e.code == 'ENOENT') { // no such file or directory. File really does not exist
						fs.mkdir(currDataPath + '/PlayerData/' + PlayerFolder, err => { 
							if (err) throw err;
						});
						for (const temp of temps) {
							if (!(temp == 'Players.txt')) {
								fs.copyFile(tempsPath+temp, currDataPath +'/PlayerData/' + PlayerFolder + temp, (err) => {
									if (err) throw err;
								});
							}
						}
						fs.appendFileSync(currDataPath + '/PlayerData/'+ PlayerFolder + 'Matches.txt', `\n${updatedMatchStr}`);
					}
					else {
						throw e;
					}
					
				}
			}
		}
		*/
	}
	catch (e) {
		throw e;
	}

	try {
		updatePlayerMatches(winner, loser, mode);
	} catch (e) {
		console.log(e);
		return false;
	}

	//resolve promise
	return true;
};

const updatePlayerMatches = async (winner, loser, mode) => {
	//read database
	const currDataPath = getCurrentDataPath();
	
	const currModeInfo = getModeInfo(mode);
	
	let RatingsFileStr = fs.readFileSync(currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`, "utf8");
	//let RatingsData = readDatabase(currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`);
	//const RatingsDataHeader = RatingsData.slice(0,2); //first two lines
	//const RatingsDataNoHeader = RatingsData.slice(2);

	for (const matchPlayer of winner) {
		//update player database file
		//const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		const ratingStats = ((getPlayerRatingStatsQuery(matchPlayer.playerId,'current',mode)) || (getPlayerRatingStatsQuery(matchPlayer.teamId,'current',mode)));
		
		if (ratingStats) {
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: ratingStats.playerId,
					rating: ratingStats.rating,
					sigma: ratingStats.sigma,
					wins: ratingStats.wins + 1,
					losses: ratingStats.losses,
					lastPlayed: ratingStats.lastPlayed	//eventually do match.time here... need to improve code structuring here- pointlessly updating the rating+sigma+lastPlayed separately
				})
			);
			
			const searchStr = `${ratingStats.playerId}\t`;
			const re = new RegExp("^.*" + searchStr + ".*$", "gm");
			
			RatingsFileStr = RatingsFileStr.replace(re, updatedPlayerStr);
		}
		else {
			RatingsFileStr.replace(/(\n|\r)+$/, "");	//remove any trailing new lines or carriage returns
			const pid = matchPlayer.playerId || matchPlayer.teamId;
			
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: pid,
					rating: currModeInfo.initialRating,
					sigma: currModeInfo.initialSigma,
					wins: 1,
					losses: 0,
					//lastPlayed: (omission should default to '-')	//eventually do match.time here... need to improve code structuring here- pointlessly updating the rating+sigma+lastPlayed separately
				})
			);
			
			RatingsFileStr += '\n' + updatedPlayerStr;
			
			//sort by player Id
			let RatingsFileStrRows = RatingsFileStr.split(/\r?\n/);
			const RatingsFileStrHeader = RatingsFileStrRows.shift();
			
			RatingsFileStrRows = RatingsFileStrRows.sort((a,b) => a.localeCompare(b, 'en', { numeric: true }));
			RatingsFileStr = RatingsFileStrHeader + RatingsFileStrRows.join('\n');
		}
		
		
		
		/*
		const newRatingsFileStr = RatingsFileStr.replace(re, updatedPlayerStr);
		
		if (newRatingsFileStr === RatingsFileStr) {	//no changes made- i.e. string not found
			//append str to RatingsFileStr
			//sort	https://quickref.me/sort-lines-of-a-text-document-in-the-alphabetical-order.html, combine with https://stackoverflow.com/questions/2802341/natural-sort-of-alphanumerical-strings-in-javascript
			
		}
		else {
			//replace the str with updated string
		}
		
		//probably need a sort function here to insert PIDs in ascending order
		*/
		/*
		let updatedPlayerStr;
		if (mode == "casual") {
			updatedPlayerStr = genPlayerStr(
				new Player({
					playerId: player.playerId,
					discordId: player.discordId,
					username: player.username
				})
			);
			//updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
			//var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		else if (mode == "twos") {
			updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins+1}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}
		else if (mode == "fours") {
			updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins+1}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath + "/Players.txt", "utf8");
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath + "/Players.txt", updatedData);
		}
		catch (e) {
			throw e;
		}
		*/
	}
	
	/*
	for (var matchPlayer of loser) {
		//update player database file
		const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		let updatedPlayerStr;
		if (mode == "casual") {
			updatedPlayerStr = genPlayerStr(
				new Player({
					playerId: player.playerId,
					discordId: player.discordId,
					username: player.username
				})
			);
			//updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses+1}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}
		else if (mode == "twos") {
			updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses+1}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}
		else if (mode == "fours") {
			updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses+1}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath + "/Players.txt", "utf8");
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath + "/Players.txt", updatedData);
		} catch (e) {
			throw e;
		}
	}
	*/
	
	for (const matchPlayer of loser) {
		//update player database file
		//const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		const ratingStats = ((getPlayerRatingStatsQuery(matchPlayer.playerId,'current',mode)) || (getPlayerRatingStatsQuery(matchPlayer.teamId,'current',mode)));
		
		if (ratingStats) {
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: ratingStats.playerId,
					rating: ratingStats.rating,
					sigma: ratingStats.sigma,
					wins: ratingStats.wins,
					losses: ratingStats.losses + 1,
					lastPlayed: ratingStats.lastPlayed	//eventually do match.time here... need to improve code structuring here- pointlessly updating the rating+sigma+lastPlayed separately
				})
			);
			
			const searchStr = `${ratingStats.playerId}\t`;
			const re = new RegExp("^.*" + searchStr + ".*$", "gm");
			
			RatingsFileStr = RatingsFileStr.replace(re, updatedPlayerStr);
		}
		else {
			RatingsFileStr.replace(/(\n|\r)+$/, "");	//remove any trailing new lines or carriage returns
			const pid = matchPlayer.playerId || matchPlayer.teamId;
			
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: pid,
					rating: currModeInfo.initialRating,
					sigma: currModeInfo.initialSigma,
					wins: 0,
					losses: 1,
					//lastPlayed: (omission should default to '-')	//eventually do match.time here... need to improve code structuring here- pointlessly updating the rating+sigma+lastPlayed separately
				})
			);
			
			RatingsFileStr += '\n' + updatedPlayerStr;
			
			//sort by player Id
			let RatingsFileStrRows = RatingsFileStr.split(/\r?\n/);
			const RatingsFileStrHeader = RatingsFileStrRows.shift();
			
			RatingsFileStrRows = RatingsFileStrRows.sort((a,b) => a.localeCompare(b, 'en', { numeric: true }));	//from: https://stackoverflow.com/questions/2802341/natural-sort-of-alphanumerical-strings-in-javascript and https://stackoverflow.com/questions/4340227/sort-mixed-alpha-numeric-array
			RatingsFileStr = RatingsFileStrHeader + RatingsFileStrRows.join('\n');
		}
	}
	
	//write updated player matches to file
	try {
		fs.writeFileSync(currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`, RatingsFileStr);
		return true;
	}
	catch (e) {
		throw e;
	}
	
	return false;
};

const revertMatchQuery = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	
	const MatchData = readDatabase(currDataPath + "/Matches.txt");
	const MatchDataHeader = MatchData.shift();
	MatchData.shift(); //throwaway line
	
	const latestMatchIdx = MatchData.length - 1;
	
	const latestMatch = new Match({
		matchId: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['ID']) ],
		time: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['Timestamp']) ],
		playerIds: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['PlayerIDs']) ],
		winners: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['Winners']) ],
		losers: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['Losers']) ],
		mode: MatchData[latestMatchIdx][ getColNameIdx(MatchDataHeader,['Mode']) ],
	});
	
	//const currModeInfo = getModeInfo(mode);
	let MatchesFileStr = fs.readFileSync(currDataPath + "/Matches.txt", "utf8");
	let searchStr = `${latestMatch.matchId}\t${latestMatch.time}\t`;
	let re = new RegExp("^.*" + searchStr + ".*$", "gm");
	let updatedMatchesFileStr = MatchesFileStr.replace(re, '').replace(/\n+$/, "");
	fs.writeFileSync(currDataPath + "/Matches.txt", updatedMatchesFileStr);
	
	const RatingChangesData = readDatabase(currDataPath + "/RatingChanges.txt");
	const RatingChangesDataHeader = RatingChangesData.shift();
	RatingChangesData.shift(); //throwaway line
	
	const latestMatchRatingChangesData = RatingChangesData.filter( m => m[1] === latestMatch.matchId );
	
	//const currModeInfo = getModeInfo(mode);
	let RatingChangesFileStr = fs.readFileSync(currDataPath + "/RatingChanges.txt", "utf8");
	
	let latestRatingChanges = [];
	for (const r of latestMatchRatingChangesData) {
		const currRatingId = r[ getColNameIdx(RatingChangesDataHeader,['ID']) ];
		latestRatingChanges.push(
			new RatingUpdate({
				ratingId: currRatingId,
				matchId: latestMatch.matchId,
				playerId: r[ getColNameIdx(RatingChangesDataHeader,['PlayerID']) ],
				oldRating: parseInt(r[ getColNameIdx(RatingChangesDataHeader,['OldRating']) ]),
				ratingChange: parseInt(r[ getColNameIdx(RatingChangesDataHeader,['RatingChange']) ]),
				sigmaChange: parseFloat(r[ getColNameIdx(RatingChangesDataHeader,['SigmaChange']) ]),
				mode: latestMatch.mode
			})
		);
		
		let searchStr = `${currRatingId}\t${latestMatch.matchId}\t`;
		let re = new RegExp("^.*" + searchStr + ".*$", "gm");
		RatingChangesFileStr = RatingChangesFileStr.replace(re, '');
	}
	
	RatingChangesFileStr = RatingChangesFileStr.replace(/\n+$/, "");	//replace all trailing newline characters
	fs.writeFileSync(currDataPath + "/RatingChanges.txt", RatingChangesFileStr);
	
	//update the player's ratings
	let RatingsFileStr = fs.readFileSync(currDataPath + `/Modes/${capitaliseFirstLetter(latestMatch.mode)}/Ratings.txt`, "utf8");
	
	for (const p of latestRatingChanges) {
		//update player database file
		//const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		//console.log(p);
		const ratingStats = ((getPlayerRatingStatsQuery(p.playerId,'current',latestMatch.mode)) || (getPlayerRatingStatsQuery(p.teamId,'current',latestMatch.mode)));
		
		const playerWinCount = p.ratingChange > 0 ? (ratingStats.wins - 1) : ratingStats.wins;
		const playerLossCount = p.ratingChange > 0 ? ratingStats.losses : (ratingStats.losses - 1);
		
		const updatedPlayerStr = genModeRatingStr(
			new ModeRating({
				playerId: ratingStats.playerId,
				rating: p.oldRating,
				sigma: ratingStats.sigma - p.sigmaChange,
				wins: playerWinCount,
				losses: playerLossCount,
				lastPlayed: ratingStats.lastPlayed
			})
		);
		
		const searchStr = `${ratingStats.playerId}\t`;
		const re = new RegExp("^.*" + searchStr + ".*$", "gm");
		
		RatingsFileStr = RatingsFileStr.replace(re, updatedPlayerStr);
	}
	
	try {
		fs.writeFileSync(currDataPath + `/Modes/${capitaliseFirstLetter(latestMatch.mode)}/Ratings.txt`, RatingsFileStr);
		
		console.log('Match Reverted:');
		console.log(latestMatch);
		console.log(latestRatingChanges);
		console.log('----------------------------------------------------');
		return true;
	}
	catch (e) {
		throw e;
	}
	
	return false;
}

/*
const updateTeamMatches = async (winner, loser, mode) => {
	//read database
	const currDataPath = getCurrentDataPath();

	//for (var matchTeam of winner) {

	//update player database file
	let team = await getTeamFromTeamNameQuery(winner.teamName);
	var updatedTeamStr = `${team.teamId}\t${team.teamName}\t${team.teamLeague}\t${team.teamRating}\t${team.teamSigma}\t${team.teamWins + 1}\t${team.teamLosses}\t${team.teamLastPlayed}`;

	//find player and replace line with latest ratings
	try {
		const TeamData = fs.readFileSync(currDataPath + "/Teams.txt", "utf8");
		let searchString = `${team.teamID}\t${team.teamName}\t`;
		let re = new RegExp("^.*" + searchString + ".*$", "gm");
		let updatedData = TeamData.replace(re, updatedTeamStr);
		fs.writeFileSync(currDataPath + "/Teams.txt", updatedData);
	} catch (e) {
		console.log(e);
		return e;
	}
	//}

	//for (var matchPlayer of loser) {

	//update player database file
	team = await getTeamFromTeamNameQuery(loser.teamName);
	updatedTeamStr = `${team.teamID}\t${team.teamName}\t${team.teamLeague}\t${team.teamRating}\t${team.teamSigma}\t${team.teamWins}\t${team.teamLosses + 1}\t${team.teamLastPlayed}`;

	//find player and replace line with latest ratings
	try {
		const TeamData = fs.readFileSync(currDataPath + "/Teams.txt", "utf8");
		let searchString = `${team.teamID}\t${team.teamName}\t`;
		let re = new RegExp("^.*" + searchString + ".*$", "gm");
		let updatedData = TeamData.replace(re, updatedTeamStr);
		fs.writeFileSync(currDataPath + "/Teams.txt", updatedData);
	} catch (e) {
		console.log(e);
		return e;
	}
	//}

	return;
};
*/

const getPlayerRatingStatsQuery = (playerId,season,mode) => {
	if (season === 'career') {
		return getPlayerCareerRatingStats(playerId,mode);
	}
	return getPlayerSeasonRatingStats(playerId,season,mode);	
}

const getPlayerSeasonRatingStats = (playerId,season,mode) => {
	//const currDataPath = getCurrentDataPath();
	const currDataPath = getSeasonDataPath(season);
	const currModeInfo = getModeInfo(mode);
	const RatingsData = readDatabase(currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`);
	const RatingsDataHeader = RatingsData.shift(); //first line
	
	const playerIdx = RatingsData.map((x) => x[ getColNameIdx(RatingsDataHeader,['ID']) ]).indexOf(`${playerId}`);

	if (playerIdx === -1) {
		return null;
	}
	
	return new ModeRating({
		playerId: playerId,
		rating: parseInt(RatingsData[playerIdx][getColNameIdx(RatingsDataHeader,['Rating'])]),
		sigma: parseFloat(RatingsData[playerIdx][getColNameIdx(RatingsDataHeader,['Sigma'])]),
		wins: parseInt(RatingsData[playerIdx][getColNameIdx(RatingsDataHeader,['NumMatchesWon'])]),
		losses: parseInt(RatingsData[playerIdx][getColNameIdx(RatingsDataHeader,['NumMatchesLost'])]),
		lastPlayed: RatingsData[playerIdx][getColNameIdx(RatingsDataHeader,['LastPlayed'])]
	});
}

const getPlayerCareerRatingStats = (playerId,mode) => {
	const seasonList = getSeasonListQuery().sort().reverse();	//reverse chronological
	
	let wins = 0;
	let losses = 0;
	
	for (const s of seasonList) {
		//const seasonDataPath = getSeasonDataPath(s);
		const seasonModesList = getSeasonModesQuery(s);
		if (!(seasonModesList.includes(capitaliseFirstLetter(mode)))) {
			continue;
		}
		if (!getPlayerQuery(null, null, playerId, s)) {
			break;	//player was not registered at this point (so they won't be in past seasons either)
		}
		
		const seasonRatingStats = getPlayerSeasonRatingStats(playerId,s,mode);
		if (seasonRatingStats) {
			wins += seasonRatingStats.wins;
			losses += seasonRatingStats.losses;
		}
	}
	
	if ((wins + losses) > 0 ) {
		return new ModeRating({
			playerId: playerId,
			wins: wins,
			losses: losses
		});
	}
	return null;
}

const genNewPlayerRatingStatsQuery = (playerId,mode) => {
	const currModeInfo = getModeInfo(mode);
	
	return new ModeRating({
		playerId: playerId,
		rating: currModeInfo.trueskill.initialRating,
		sigma: currModeInfo.trueskill.initialSigma,
		wins: 0,
		losses: 0,
	});
}

const getPlayerQuery = (discordId = null, username = null, playerId = null, season = null) => {
	let currDataPath;
	if (season) {
		currDataPath = getSeasonDataPath(season);
	}
	else {
		currDataPath = getCurrentDataPath();
	}
	
	//read database
	//const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	
	const PlayerIDColIdx = getColNameIdx(PlayerDataHeader,['ID'])
	const DiscordIDColIdx = getColNameIdx(PlayerDataHeader,['DiscordID']);
	const UsernameColIdx = getColNameIdx(PlayerDataHeader,['Username']);
	
	let playerIdx;
	if (discordId) {
		playerIdx = PlayerData.map((x) => x[ DiscordIDColIdx ]).indexOf(discordId.toString());
	}
	else if (username) {
		playerIdx = PlayerData.map((x) => stripUsername(x[ UsernameColIdx ]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase());
	}
	else {
		playerIdx = PlayerData.map((x) => x[ PlayerIDColIdx ]).indexOf(playerId.toString());
	}

	if (playerIdx === -1) {
		return null;
	}
	
	/*
	return new Player(
		PlayerData[playerIdx][0],
		discordId,
		PlayerData[playerIdx][2],
		parseInt(PlayerData[playerIdx][3]),
		parseFloat(PlayerData[playerIdx][4]),
		parseInt(PlayerData[playerIdx][5]),
		parseFloat(PlayerData[playerIdx][6]),
		parseInt(PlayerData[playerIdx][7]),
		parseFloat(PlayerData[playerIdx][8]),
		parseInt(PlayerData[playerIdx][9]),
		parseInt(PlayerData[playerIdx][10]),
		parseInt(PlayerData[playerIdx][11]),
		parseInt(PlayerData[playerIdx][12]),
		parseInt(PlayerData[playerIdx][13]),
		parseInt(PlayerData[playerIdx][14]),
		PlayerData[playerIdx][15],
		PlayerData[playerIdx][16],
		PlayerData[playerIdx][17]
	);
	*/
	return new Player({
		playerId: PlayerData[playerIdx][ PlayerIDColIdx ],
		discordId: PlayerData[playerIdx][ DiscordIDColIdx ],
		username: PlayerData[playerIdx][ UsernameColIdx ]
	});
};

/*
const getPlayerFromUsernameQuery = async (username) => {
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();

	const playerIdx = PlayerData.map((x) => stripUsername(x[2]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase());

	if (playerIdx !== -1) {
		return new Player({
			playerId: PlayerData[playerIdx][getColNameIdx(PlayerDataHeader,['ID'])],
			discordId: PlayerData[playerIdx][getColNameIdx(PlayerDataHeader,['DiscordID'])],
			username: PlayerData[playerIdx][getColNameIdx(PlayerDataHeader,['Username'])]
		});
	}
	
	return null;
};
*/
	
const getPlayerRatingChangeStatsQuery = async (playerId,season,mode) => {
	let ratingChangeStats;
	if (season === 'career') {
		ratingChangeStats = getPlayerCareerRatingChangeStats(playerId,mode);
	}
	else {
		ratingChangeStats = getPlayerSeasonRatingChangeStats(playerId,season,mode);
	}
	
	if (ratingChangeStats.wormVals.length === 0) {
		ratingChangeStats.worm = await getRatingWorm([], season, mode);
	}
	else {
		ratingChangeStats.worm = await getRatingWorm(ratingChangeStats.wormVals,season,mode);
	}
	delete ratingChangeStats.wormVals;
	//console.log(ratingChangeStats);
	
	if (ratingChangeStats.streakVals.length === 0) {
		ratingChangeStats.streakstepline = await getStreakStepLine([], season, mode);
	}
	else {
		ratingChangeStats.streakstepline = await getStreakStepLine(ratingChangeStats.streakVals,season,mode);
	}
	delete ratingChangeStats.streakVals;
	
	return ratingChangeStats;
}

const getPlayerSeasonRatingChangeStats = (playerId,season,mode) => {
	//read database
	const currModeInfo = getModeInfo(mode);
	//const currDataPath = getCurrentDataPath();
	const currDataPath = getSeasonDataPath(season);
	let RatingsData = readDatabase(currDataPath + "/RatingChanges.txt");
	const RatingsDataHeader = RatingsData.shift();
	
	const SelPlayerRatingsData = RatingsData.filter( (r) => ((r[ getColNameIdx(RatingsDataHeader,['PlayerID']) ] === playerId) && (r[ getColNameIdx(RatingsDataHeader,['Mode']) ] === mode)));

	let RatingChangeStats = {
		rating: {
			curr: currModeInfo.trueskill.initialRating,
			min: '-',
			max: '-',
		},
		streak: {
			curr: '-',
			min: '-',
			max: '-'
		},
	};
	
	const RatingChangeColIdx = getColNameIdx(RatingsDataHeader,['RatingChange']);
	const OldRatingColIdx = getColNameIdx(RatingsDataHeader,['OldRating']);
	
	
	//might be able to change the following to === 0 and then get an empty rating worm chart, and return the RatitngChangeStats object
	if (SelPlayerRatingsData.length === 0) {
		//RatingChangeStats.worm = await getRatingWorm([], season, currModeInfo.modeName);
		RatingChangeStats.wormVals = [];
		RatingChangeStats.streakVals = [];
		return RatingChangeStats;
	}
	
	//Rating Change data found for input mode
	const RatingChangeCol = getCol(SelPlayerRatingsData, RatingChangeColIdx);
	
	//rating extrema
	const RatingValues = SelPlayerRatingsData.map((row) => parseInt(row[ OldRatingColIdx ]) + parseInt(row[ RatingChangeColIdx ]));		
	RatingValues.unshift(currModeInfo.trueskill.initialRating);
	
	RatingChangeStats.rating.min = Math.min(...RatingValues);
	RatingChangeStats.rating.max = Math.max(...RatingValues);
	
	//latest streak
	const lastSign = RatingChangeCol[RatingChangeCol.length - 1][0]; //starting sign to check
	let count = 0;
	for (const changeVal of RatingChangeCol.slice().reverse()) {	//slice() creates a shallow copy of RatingChangeCol
		if (changeVal[0] === lastSign) {
			count += 1;
		} else {
			break;
		}
	}
	
	RatingChangeStats.streak.curr = lastSign + count.toString();

	//streak extrema
	let minStreak = 0;
	let maxStreak = 0;
	let prevSign = RatingChangeCol[0][0]; //starting sign to check
	count = 0;
	
	let streakTrack = [];

	for (const changeVal of RatingChangeCol) {
		if (parseInt(changeVal) === 0) {} //just incase there is a 0 rating change
		else if (changeVal[0] === prevSign) {
			count += 1;
			if (prevSign === "+") {
				if (count > maxStreak) {
					maxStreak = count;
				}
			}
			else if (prevSign === "-") {
				//explicitly checking just incase
				if (count > minStreak) {
					minStreak = count;
				}
			}
		}
		else {
			if (prevSign === "+") {
				streakTrack.push({
						x: streakTrack.length/2,
						y: count
					},
					{
						x: streakTrack.length/2 + 1,
						y: count
					}
				);
			}
			else {
				streakTrack.push({
						x: streakTrack.length/2,
						y: -count
					},
					{
						x: streakTrack.length/2 + 1,
						y: -count
					}
				);
			}
			count = 1;
			if (prevSign === "+") {
				if (count > maxStreak) {
					maxStreak = count;
				}
			}
			else if (prevSign === "-") {
				//explicitly checking just incase
				if (count > minStreak) {
					minStreak = count;
				}
			}
			/* pretty sure the following is wrong, and the above is correct... will need to double check
			if (prevSign === "+") {
				if (count > minStreak) {
					minStreak = count;
				}
			}
			else if (prevSign === "-") {
				//explicitly checking just incase
				if (count > maxStreak) {
					maxStreak = count;
				}
			}
			*/
			prevSign = changeVal[0];
		}
	}
	
	streakTrack.push({
			x: streakTrack.length/2,
			y: parseInt(RatingChangeStats.streak.curr)
		},
		{
			x: streakTrack.length/2 + 1,
			y: parseInt(RatingChangeStats.streak.curr)
		}
	);
	
	RatingChangeStats.streak.min = minStreak === 0 ? '-' : '-' + minStreak.toString();
	RatingChangeStats.streak.max = maxStreak === 0 ? '-' : '+' + maxStreak.toString();
	
	RatingChangeStats.wormVals = RatingValues;
	RatingChangeStats.streakVals = streakTrack;
	
	return RatingChangeStats;
}

const getPlayerCareerRatingChangeStats = (playerId,mode) => {
	const seasonList = getSeasonListQuery().sort();	//reverse chronological
	const currModeInfo = getModeInfo(mode);
	//console.log(seasonList);
	
	let careerRatingChangeStats = {
		rating: {
			min: '-',
			max: '-',
		},
		streak: {
			min: '-',
			max: '-'
		},
		wormVals: [],
		streakVals: [],
	}
	let minRating = currModeInfo.trueskill.initialRating;
	let maxRating = 0;
	let minStreak = 0;
	let maxStreak = 0;
	let numSeasons = 0;
	let matchCount = 0;
	
	for (const s of seasonList) {
		//const seasonDataPath = getSeasonDataPath(s);
		if (!getPlayerQuery(null, null, playerId, s)) {
			continue;	//player was not registered at this point (so they won't be in past seasons either)
		}
		
		const seasonRatingChangeStats = getPlayerSeasonRatingChangeStats(playerId,s,mode);
		if ((seasonRatingChangeStats.rating.min !== '-') && (seasonRatingChangeStats.rating.min < minRating)) {
			minRating = seasonRatingChangeStats.rating.min;
		}
		if ((seasonRatingChangeStats.rating.max !== '-') && (seasonRatingChangeStats.rating.max > maxRating)) {
			maxRating = seasonRatingChangeStats.rating.max;
		}
		if ((seasonRatingChangeStats.streak.min !== '-') && (parseInt(seasonRatingChangeStats.streak.min) < minStreak)) {
			minStreak = seasonRatingChangeStats.streak.min;
		}
		if ((seasonRatingChangeStats.streak.max !== '-') && (parseInt(seasonRatingChangeStats.streak.max) > maxStreak)) {
			maxStreak = seasonRatingChangeStats.streak.max;
		}
		for (const sv of seasonRatingChangeStats.streakVals) {
			careerRatingChangeStats.streakVals.push({
					x: careerRatingChangeStats.streakVals.length/2,
					y: sv.y
				},
				{
					x: careerRatingChangeStats.streakVals.length/2 + 1,
					y: sv.y
				}
			);
		}
		const seasonWormValsLength = seasonRatingChangeStats.wormVals.length;
		if (seasonWormValsLength > 0) {
			numSeasons += 1;
			for (let i = 0; i < seasonWormValsLength; i++) {
				careerRatingChangeStats.wormVals.push({
					x: matchCount+i,
					y: seasonRatingChangeStats.wormVals[i]
				});
			}
			matchCount = matchCount + seasonWormValsLength - 1;
			//careerRatingChangeStats.wormVals = [...careerRatingChangeStats.wormVals, ...seasonRatingChangeStats.wormVals];
		}
	}
	
	careerRatingChangeStats.streak.min = minStreak === 0 ? '-' : '-' + minStreak.toString();
	careerRatingChangeStats.streak.max = maxStreak === 0 ? '-' : '+' + maxStreak.toString();
	
	if (minRating !== 0) {
		careerRatingChangeStats.rating.min = minRating;
	}
	if (maxRating !== 0) {
		careerRatingChangeStats.rating.max = maxRating;
	}
	if (minStreak !== 0) {
		careerRatingChangeStats.streak.min = minStreak;
	}
	if (maxStreak !== 0) {
		careerRatingChangeStats.streak.max = maxStreak;
	}
	const careerWormValsLength = careerRatingChangeStats.wormVals.length;
	if (careerWormValsLength > 0) {
		//careerRatingChangeStats.wormVals.reverse();	//mutates the original array
		//for (const dataPoint of careerRatingChangeStats.wormVals) {
		//	dataPoint.x = matchCount + dataPoint
		//}
		const wormVals = careerRatingChangeStats.wormVals.map(val => val.y);
		careerRatingChangeStats.rating.avg = Math.round(wormVals.reduce((a, b) => a + b, 0) / wormVals.length);
	}
	careerRatingChangeStats.numSeasons = numSeasons;	
	
	return careerRatingChangeStats;
}

const getRatingWorm = async (ratingChanges,season,mode) => {
	//Charts
	const width = 1000;
	const height = 400;
	const xAxisLength = Math.ceil(ratingChanges.length / 5) * 5;
	
	const modeLabel = capitaliseFirstLetter(mode);
	const seasonLabel = `${capitaliseFirstLetter(season)}${season === 'career'? '' : ' Season'}`
	
	const configuration = {
		type: "line",
		data: {
			labels: Array.from({ length: xAxisLength }, (x, i) => i),
			datasets: [
				{
					label: modeLabel,
					data: ratingChanges,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 6,
					borderColor: "yellow",
				},
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: `Rating Worm - ${seasonLabel} - ${modeLabel}`,
					color: "white",
					font: {
						family: "Arial",
						size: 24,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)",
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					display: false,
					//labels: {
					//	boxHeight: 0,
					//	color: "white",
					//	font: {
					//		family: "Arial",
					//		size: 20,
					//	},
					//},
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Match Number",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					min: 0,
					max: xAxisLength,
					ticks: {
						stepSize: xAxisLength / 5,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					type: "linear",
					display: true,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.8)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
	
	return buffer;
}

const getStreakStepLine = async (streakVals,season,mode) => {
	//Charts
	const width = 1000;
	const height = 400;
	//const xAxisLength = Math.ceil(streakVals.length / 5) * 5;
	const xAxisLength = streakVals.length/2;
	
	const modeLabel = capitaliseFirstLetter(mode);
	const seasonLabel = `${capitaliseFirstLetter(season)}${season === 'career'? '' : ' Season'}`;
	
	const streakValsY = streakVals.map(coord => coord.y);
	
	const streakValsMin = Math.min(...streakValsY);
	const yAxisMin = streakValsMin > 0 ? -2 : 2*Math.floor(streakValsMin/2.0);
	
	const streakValsMax = Math.max(...streakValsY);
	const yAxisMax = streakValsMax < 0 ? 2 : 2*Math.ceil(streakValsMax/2.0);
	
	//const streakTicks = Array.from({ length: (yAxisMax - yAxisMin) / 2 + 1 }, (_, i) => yAxisMin + i*2);	// Sequence generator from here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
	
	const configuration = {
		type: "line",
		data: {
			//labels: Array.from({ length: xAxisLength }, (x, i) => i),
			datasets: [
				{
					label: modeLabel,
					data: streakVals,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 6,
					//borderWidth: 300/streakVals.length,
					//borderColor: (ctx) => (ctx.parsed.y < 0 ? "rgba(255,0,0,0.95)" : "rgba(0,255,0,0.95)"),
					//borderColor: (ctx) => "rgba(0,255,0,0.95)",
					//segment: {
					//	borderColor: (ctx) => (ctx.p0.parsed.y < 0 ? "rgba(255,0,0,0.95)" : "rgba(0,255,0,0.95)"),
						//borderColor: (ctx) => console.log(ctx)
					//}
				},
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: `Streak Step Line - ${seasonLabel} - ${modeLabel}`,
					color: "white",
					font: {
						family: "Arial",
						size: 24,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)",
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					display: false,
					//labels: {
					//	boxHeight: 0,
					//	color: "white",
					//	font: {
					//		family: "Arial",
					//		size: 20,
					//	},
					//},
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					//title: {
						//display: false,
						//text: "Match Number",
						//color: "white",
						//font: {
						//	family: "Arial",
						//	size: 20,
						//},
					//},
					id: "x",
					type: "linear",
					display: true,
					min: 0,
					max: xAxisLength,
					//ticks: {
						//stepSize: xAxisLength / 5,
						//color: "white",
						//font: {
							//family: "Arial",
							//size: 20,
						//},
					//},
					//grid: {
						//borderDash: [4, 2],
						//color: "rgb(192,192,192,0.8)",
					//},
				},
				y: {
					title: {
						display: true,
						text: "Streak",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					type: "linear",
					display: true,
					//beginAtZero: true,
					min: yAxisMin,
					max: yAxisMax,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 2,
						//beginAtZero: true,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
						autoSkip: false,
					},
					//afterBuildTicks: axis => axis.ticks = streakTicks.map(v => ({value: v})),
					grid: {
						lineWidth: (ctx) => (ctx.tick.value === 0 ? 3 : 1),
						borderDash: (ctx) => (ctx.tick.value === 0 ? [] : [4, 2]),
						color: (ctx) => (ctx.tick.value === 0 ? "rgb(220,220,220,1)" : "rgb(220,220,220,0.8)"),
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
			{	//following code is from here: https://stackoverflow.com/questions/72193266/changing-line-color-below-specific-value-in-chart-js/72229358#72229358
				afterLayout: chart => {
					let ctx = chart.ctx;
					ctx.save();
					let yAxis = chart.scales.y;
					let yThreshold = yAxis.getPixelForValue(0);	//threshold is 0          
					let gradient = ctx.createLinearGradient(0, yAxis.top, 0, yAxis.bottom);   
					gradient.addColorStop(0, "rgba(0,255,0,0.95)"); 
					//let offset = 1 / yAxis.bottom * yThreshold;
					let offset = (yThreshold - yAxis.top) / (yAxis.bottom - yAxis.top);
					gradient.addColorStop(offset, "rgba(0,255,0,0.95)"); 
					gradient.addColorStop(offset, "rgba(255,0,0,0.95)"); 
					gradient.addColorStop(1, "rgba(255,0,0,0.95)");           
					chart.data.datasets[0].borderColor = gradient;
					ctx.restore();
				}
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
	
	return buffer;
}

//can be deleted- no longer used
const getPlayerFromDiscordIdQueryMoreInfo = async (discordId) => {
	//had to make new function instead of above because getPlayerFromDiscordIdQuery() is used in more than one function

	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	/*
	const playerIdx = PlayerData.map((x) => x[ getColNameIdx(PlayerDataHeader,['DiscordID']) ]).indexOf(discordId.toString());	
	if (playerIdx === -1) {
		return null;
	}
	*/
	const selPlayer = getPlayerQuery(discordId);
	if (selPlayer === -1) {
		return null;
	}
	
	/*
	const PlayerPath =
		currDataPath +
		`/PlayerData/${PlayerData[playerIdx][0]} ${PlayerData[playerIdx][2]}/`;

	const SelPlayerRatingsData = readDatabase(
		PlayerPath + "/RatingChanges.txt"
	);
	*/
	let RatingsData = readDatabase(currDataPath + "/RatingChanges.txt");
	const RatingsDataHeader = RatingsData.shift();
	
	const SelPlayerRatingsData = RatingsData.filter( (r) => r[2] === selPlayer.playerId);

	//casual RPUGs
	const SelPlayerCasualRatingsData = SelPlayerRatingsData.filter(
		(row) => row[6] === "casual"
	);
	let SelPlayerCasualStreak = "-";
	let highestCLStreak = "-";
	let highestCWStreak = "-";
	let minCasualRating = "-";
	let maxCasualRating = "-";

	if (SelPlayerCasualRatingsData.length !== 0) {
		const CasualRatingChangesCol = getCol(SelPlayerCasualRatingsData, 4); //Rating Change column for casual RPUGs

		//rating extrema
		const CasualRatingValues = SelPlayerCasualRatingsData.map(
			(row) => parseInt(row[3]) + parseInt(row[4])
		);

		if (CasualRatingValues.length > 0) {
			CasualRatingValues.unshift(cfg.trueskill.casualInitTS.initialRating);
			minCasualRating = Math.min(...CasualRatingValues);
			maxCasualRating = Math.max(...CasualRatingValues);
		}

		//latest streak
		const lastSign =
			CasualRatingChangesCol[CasualRatingChangesCol.length - 1][0]; //starting sign to check
		let count = 0;

		for (const changeVal of CasualRatingChangesCol.slice().reverse()) {
			if (changeVal[0] === lastSign) {
				count += 1;
			} else {
				break;
			}
		}

		SelPlayerCasualStreak = lastSign + count.toString();

		//streak extrema
		highestCLStreak = 0;
		highestCWStreak = 0;
		let prevSign = CasualRatingChangesCol[0][0]; //starting sign to check
		count = 0;

		for (const changeVal of CasualRatingChangesCol) {
			if (parseInt(changeVal) === 0) {
			} //just incase there is a 0 rating change
			else if (changeVal[0] === prevSign) {
				count += 1;
				if (prevSign === "+") {
					if (count > highestCWStreak) {
						highestCWStreak = count;
					}
				} else if (prevSign === "-") {
					//explicitly checking just incase
					if (count > highestCLStreak) {
						highestCLStreak = count;
					}
				}
			} else {
				count = 1;
				prevSign = changeVal[0];
			}
		}
		/*
		if (highestCLStreak === 0) {
			highestCLStreak = '-';
		}
		else {
			highestCLStreak = '-' + highestCLStreak.toString();
		}
		*/
		highestCLStreak =
			highestCLStreak === 0 ? "-" : "-" + highestCLStreak.toString();
		highestCWStreak =
			highestCWStreak === 0 ? "-" : "+" + highestCWStreak.toString();
	}

	//twos RPUGs
	const SelPlayerTwosRatingsData = SelPlayerRatingsData.filter(
		(row) => row[6] === "twos"
	);
	let SelPlayerTwosStreak = "-";
	let highestTLStreak = "-";
	let highestTWStreak = "-";
	let minTwosRating = "-";
	let maxTwosRating = "-";

	if (SelPlayerTwosRatingsData.length !== 0) {
		const TwosRatingChangesCol = getCol(SelPlayerTwosRatingsData, 4); //Rating Change column for twos RPUGs

		//rating extrema
		const TwosRatingValues = SelPlayerTwosRatingsData.map(
			(row) => parseInt(row[3]) + parseInt(row[4])
		);

		if (TwosRatingValues.length > 0) {
			TwosRatingValues.unshift(cfg.trueskill.twosInitTS.initialRating);
			minTwosRating = Math.min(...TwosRatingValues);
			maxTwosRating = Math.max(...TwosRatingValues);
		}

		//current streak
		const lastSign = TwosRatingChangesCol[TwosRatingChangesCol.length - 1][0]; //starting sign to check
		let count = 0;

		for (const changeVal of TwosRatingChangesCol.slice().reverse()) {
			if (changeVal[0] === lastSign) {
				count += 1;
			} else {
				break;
			}
		}

		SelPlayerTwosStreak = lastSign + count.toString();

		//streak extrema
		highestTLStreak = 0;
		highestTWStreak = 0;
		let prevSign = TwosRatingChangesCol[0][0]; //starting sign to check
		count = 0;

		for (const changeVal of TwosRatingChangesCol) {
			if (parseInt(changeVal) === 0) {
			} //just incase there is a 0 rating change
			else if (changeVal[0] === prevSign) {
				count += 1;
				if (prevSign === "+") {
					if (count > highestTWStreak) {
						highestTWStreak = count;
					}
				} else if (prevSign === "-") {
					//explicitly checking just incase
					if (count > highestTLStreak) {
						highestTLStreak = count;
					}
				}
			} else {
				count = 1;
				prevSign = changeVal[0];
			}
		}
		highestTLStreak =
			highestTLStreak === 0 ? "-" : "-" + highestTLStreak.toString();
		highestTWStreak =
			highestTWStreak === 0 ? "-" : "+" + highestTWStreak.toString();
	}

	//fours RPUGs
	const SelPlayerFoursRatingsData = SelPlayerRatingsData.filter(
		(row) => row[6] === "fours"
	);
	let SelPlayerFoursStreak = "-";
	let highestFLStreak = "-";
	let highestFWStreak = "-";
	let minFoursRating = "-";
	let maxFoursRating = "-";

	if (SelPlayerFoursRatingsData.length !== 0) {
		const FoursRatingChangesCol = getCol(SelPlayerFoursRatingsData, 4); //Rating Change column for fours RPUGs

		//rating extrema
		const FoursRatingValues = SelPlayerFoursRatingsData.map(
			(row) => parseInt(row[3]) + parseInt(row[4])
		);

		if (FoursRatingValues.length > 0) {
			FoursRatingValues.unshift(cfg.trueskill.foursInitTS.initialRating);
			minFoursRating = Math.min(...FoursRatingValues);
			maxFoursRating = Math.max(...FoursRatingValues);
		}

		//current streak
		const lastSign =
			FoursRatingChangesCol[FoursRatingChangesCol.length - 1][0]; //starting sign to check
		let count = 0;

		for (const changeVal of FoursRatingChangesCol.slice().reverse()) {
			if (changeVal[0] === lastSign) {
				count += 1;
			} else {
				break;
			}
		}

		SelPlayerFoursStreak = lastSign + count.toString();

		//streak extrema
		highestFLStreak = 0;
		highestFWStreak = 0;
		let prevSign = FoursRatingChangesCol[0][0]; //starting sign to check
		count = 0;

		for (const changeVal of FoursRatingChangesCol) {
			if (parseInt(changeVal) === 0) {
			} //just incase there is a 0 rating change
			else if (changeVal[0] === prevSign) {
				count += 1;
				if (prevSign === "+") {
					if (count > highestFWStreak) {
						highestFWStreak = count;
					}
				} else if (prevSign === "-") {
					//explicitly checking just incase
					if (count > highestFLStreak) {
						highestFLStreak = count;
					}
				}
			} else {
				count = 1;
				prevSign = changeVal[0];
			}
		}
		highestFLStreak =
			highestFLStreak === 0 ? "-" : "-" + highestFLStreak.toString();
		highestFWStreak =
			highestFWStreak === 0 ? "-" : "+" + highestFWStreak.toString();
	}

	//Charts
	const width = 1000;
	const height = 400;
	let CasualRatingCol = [];
	let TwosRatingCol = [];
	let FoursRatingCol = [];

	if (SelPlayerCasualRatingsData.length !== 0) {
		CasualRatingCol = getCol(SelPlayerCasualRatingsData, 3);
		CasualRatingCol = CasualRatingCol.map((r) => parseInt(r));
		CasualRatingCol.push(
			CasualRatingCol[CasualRatingCol.length - 1] +
				parseInt(SelPlayerCasualRatingsData[CasualRatingCol.length - 1][4])
		); //add latest rating to the array
	}
	if (SelPlayerTwosRatingsData.length !== 0) {
		TwosRatingCol = getCol(SelPlayerTwosRatingsData, 3);
		TwosRatingCol = TwosRatingCol.map((r) => parseInt(r));
		TwosRatingCol.push(
			TwosRatingCol[TwosRatingCol.length - 1] +
				parseInt(SelPlayerTwosRatingsData[TwosRatingCol.length - 1][4])
		); //add latest rating to the array
	}
	if (SelPlayerFoursRatingsData.length !== 0) {
		FoursRatingCol = getCol(SelPlayerFoursRatingsData, 3);
		FoursRatingCol = FoursRatingCol.map((r) => parseInt(r));
		FoursRatingCol.push(
			FoursRatingCol[FoursRatingCol.length - 1] +
				parseInt(SelPlayerFoursRatingsData[FoursRatingCol.length - 1][4])
		); //add latest rating to the array
	}
	/*
	const xAxisLength =
		CasualRatingCol.length > TwosRatingCol.length
			? Math.ceil(CasualRatingCol.length / 5) * 5
			: Math.ceil(TwosRatingCol.length / 5) * 5;
	*/
	const xAxisLength = Math.ceil(Math.max(CasualRatingCol.length,TwosRatingCol.length,FoursRatingCol.length) / 5) * 5;

	//console.log(Array.from({length: 6}, (x, i) => i*(xAxisLength/5)));

	const configuration = {
		type: "line",
		data: {
			labels: Array.from({ length: xAxisLength }, (x, i) => i),
			datasets: [
				{
					label: "Casual",
					data: CasualRatingCol,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 6,
					borderColor: "yellow",
				},
				{
					label: "Twos",
					data: TwosRatingCol,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 6,
					borderColor: "rgb(0,255,255,1)",
				},
				{
					label: "Fours",
					data: FoursRatingCol,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 6,
					borderColor: "rgb(213,128,255,1)",
				},
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Rating Worm",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					labels: {
						boxHeight: 0,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Match Number",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					min: 0,
					max: xAxisLength,
					ticks: {
						stepSize: xAxisLength / 5,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					type: "linear",
					display: true,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.8)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

	return {
		CasualRating: {
			min: minCasualRating,
			max: maxCasualRating,
		},
		TwosRating: {
			min: minTwosRating,
			max: maxTwosRating,
		},
		FoursRating: {
			min: minFoursRating,
			max: maxFoursRating,
		},
		CasualStreak: {
			currStreak: SelPlayerCasualStreak,
			minStreak: highestCLStreak,
			maxStreak: highestCWStreak,
		},
		TwosStreak: {
			currStreak: SelPlayerTwosStreak,
			minStreak: highestTLStreak,
			maxStreak: highestTWStreak,
		},
		FoursStreak: {
			currStreak: SelPlayerFoursStreak,
			minStreak: highestFLStreak,
			maxStreak: highestFWStreak,
		},
		RatingWorms: buffer,
	};
};

//can be deleted- no longer used
const getPlayerCareerFromDiscordIdQuery = async (discordId) => {
	//read database
	//const currDataPath = getCurrentDataPath();
	let carCasualRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carTwosRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carFoursRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carCasualEOSRatings = []; //End of season ratings
	let carCasualMinMaxRatings = []; //Min-max ratings for each season
	let carCasualWins = 0;
	let carCasualLosses = 0;
	let carTwosEOSRatings = []; //End of season ratings
	let carTwosMinMaxRatings = []; //Min-max ratings for each season
	let carTwosWins = 0;
	let carTwosLosses = 0;
	let carFoursEOSRatings = []; //End of season ratings
	let carFoursMinMaxRatings = []; //Min-max ratings for each season
	let carFoursWins = 0;
	let carFoursLosses = 0;
	let highestCLStreak = 0;
	let highestCWStreak = 0;
	let highestTLStreak = 0;
	let highestTWStreak = 0;
	let highestFLStreak = 0;
	let highestFWStreak = 0;
	let casualMatchCount = 0;
	let twosMatchCount = 0;
	let foursMatchCount = 0;
	let allCasualMatchRatings = []; //collection of all ratings over all seasons
	let allTwosMatchRatings = []; //collection of all ratings over all seasons
	let allFoursMatchRatings = []; //collection of all ratings over all seasons

	const datesDirs = getDirectories(dataPath);
	for (const dir of datesDirs) {
		const PlayerData = readDatabase(dataPath + dir + "/Players.txt");
		const PlayerDataColNames = PlayerData[0];
		const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString());

		const RatingsData = readDatabase(dataPath + dir + "/RatingChanges.txt");

		if (playerIdx !== -1) {
			const CasualSigmaColIdx = getColNameIdx(PlayerDataColNames, ['CasualSigma', 'OpenSigma']);
			if ((CasualSigmaColIdx) && (parseFloat(PlayerData[playerIdx][CasualSigmaColIdx]) !== cfg.trueskill.casualInitTS.initialSigma)) {
			//if (((PlayerData[0][4] === 'CasualSigma') || (PlayerData[0][4] === 'OpenSigma')) && (parseFloat(PlayerData[playerIdx][4]) !== cfg.trueskill.casualInitTS.initialSigma)) {	//checking to see if any matches played
				
				const CasualWinsColIdx = getColNameIdx(PlayerDataColNames, ['NumCasualMatchesWon','NumOpenMatchesWon']);
				const CasualLossesColIdx = getColNameIdx(PlayerDataColNames, ['NumCasualMatchesLost','NumOpenMatchesLost']);
				const CasualEOSRatingsColIdx = getColNameIdx(PlayerDataColNames, ['CasualRating','OpenRating']);
			
				carCasualWins += parseInt(PlayerData[playerIdx][CasualWinsColIdx]);
				carCasualLosses += parseInt(PlayerData[playerIdx][CasualLossesColIdx]);
				carCasualEOSRatings.push(parseInt(PlayerData[playerIdx][CasualEOSRatingsColIdx])); //EOS rating

				const PlayerCasualRatingChanges = RatingsData.filter(
					(row) =>
						row[2] === PlayerData[playerIdx][0] &&
						(row[6] === "casual" || row[6] === "open")
				); //filter Ratings for selected player and casual/open mode
				const PlayerCasualRatingValues = PlayerCasualRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerCasualRatingValues.length > 0) {
					carCasualMinMaxRatings.push(Math.min(...PlayerCasualRatingValues));
					carCasualMinMaxRatings.push(Math.max(...PlayerCasualRatingValues));

					let CasualRatingCol = getCol(PlayerCasualRatingChanges, 3);
					CasualRatingCol = CasualRatingCol.map((r) => parseInt(r));
					CasualRatingCol.push(
						CasualRatingCol[CasualRatingCol.length - 1] +
							parseInt(PlayerCasualRatingChanges[CasualRatingCol.length - 1][4])
					); //add latest rating to the array
					//allCasualMatchRatings.push(...CasualRatingCol);
					for (let i = 0; i < CasualRatingCol.length; i++) {
						allCasualMatchRatings.push({
							x: casualMatchCount+i,
							y: CasualRatingCol[i]
						});
					}
					casualMatchCount = casualMatchCount + CasualRatingCol.length - 1;
				}

				//streak extrema
				const CasualRatingChangesCol = getCol(PlayerCasualRatingChanges, 4); //Rating Change column for casual RPUGs for selected player
				let prevSign = CasualRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of CasualRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestCWStreak) {
								highestCWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestCLStreak) {
								highestCLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}

			const FoursSigmaColIdx = getColNameIdx(PlayerDataColNames, ['FoursSigma']);
			if ((FoursSigmaColIdx) && (parseFloat(PlayerData[playerIdx][FoursSigmaColIdx]) !== cfg.trueskill.foursInitTS.initialSigma)) {
			//if ((PlayerData[0][8] === 'FoursSigma') && (parseFloat(PlayerData[playerIdx][8]) !== cfg.trueskill.foursInitTS.initialSigma)) {	//checking to see if any matches played
			
				const FoursWinsColIdx = PlayerDataColNames.indexOf('NumFoursMatchesWon');
				const FoursLossesColIdx = PlayerDataColNames.indexOf('NumFoursMatchesLost');
				const FoursEOSRatingsColIdx = PlayerDataColNames.indexOf('FoursRating');
			
				carFoursWins += parseInt(PlayerData[playerIdx][FoursWinsColIdx]);
				carFoursLosses += parseInt(PlayerData[playerIdx][FoursLossesColIdx]);
				
				carFoursEOSRatings.push(parseInt(PlayerData[playerIdx][FoursEOSRatingsColIdx])); //EOS rating

				const PlayerFoursRatingChanges = RatingsData.filter(
					(row) => row[2] === PlayerData[playerIdx][0] && row[6] === "fours"
				); //filter Ratings for selected player and casual/open mode
				const PlayerFoursRatingValues = PlayerFoursRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerFoursRatingValues.length > 0) {
					carFoursMinMaxRatings.push(Math.min(...PlayerFoursRatingValues));
					carFoursMinMaxRatings.push(Math.max(...PlayerFoursRatingValues));

					let FoursRatingCol = getCol(PlayerFoursRatingChanges, 3);
					FoursRatingCol = FoursRatingCol.map((r) => parseInt(r));
					FoursRatingCol.push(
						FoursRatingCol[FoursRatingCol.length - 1] +
							parseInt(PlayerFoursRatingChanges[FoursRatingCol.length - 1][4])
					); //add latest rating to the array
					//allFoursMatchRatings.push(...FoursRatingCol);
					for (let i = 0; i < FoursRatingCol.length; i++) {
						allFoursMatchRatings.push({
							x: foursMatchCount+i,
							y: FoursRatingCol[i]
						});
					}
					foursMatchCount = foursMatchCount + FoursRatingCol.length - 1;
				}

				//streak extrema
				const FoursRatingChangesCol = getCol(PlayerFoursRatingChanges, 4); //Rating Change column for casual RPUGs for selected player

				let prevSign = FoursRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of FoursRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestFWStreak) {
								highestFWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestFLStreak) {
								highestFLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}
			
			const TwosSigmaColIdx = getColNameIdx(PlayerDataColNames, ['TwosSigma']);
			if ((TwosSigmaColIdx) && (parseFloat(PlayerData[playerIdx][TwosSigmaColIdx]) !== cfg.trueskill.twosInitTS.initialSigma)) {
			//if (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma && parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma / 2) {
			//if ((PlayerData[0][6] === 'TwosSigma') && (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma)) {
				
				const TwosWinsColIdx = PlayerDataColNames.indexOf('NumTwosMatchesWon');
				const TwosLossesColIdx = PlayerDataColNames.indexOf('NumTwosMatchesLost');
				const TwosEOSRatingsColIdx = PlayerDataColNames.indexOf('TwosRating');
				
				carTwosWins += parseInt(PlayerData[playerIdx][TwosWinsColIdx]);
				carTwosLosses += parseInt(PlayerData[playerIdx][TwosLossesColIdx]);
				
				carTwosEOSRatings.push(parseInt(PlayerData[playerIdx][TwosEOSRatingsColIdx]));

				const PlayerTwosRatingChanges = RatingsData.filter(
					(row) => row[2] === PlayerData[playerIdx][0] && row[6] === "twos"
				); //filter Ratings for selected player and twos mode
				const PlayerTwosRatingValues = PlayerTwosRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerTwosRatingValues.length > 0) {
					carTwosMinMaxRatings.push(Math.min(...PlayerTwosRatingValues));
					carTwosMinMaxRatings.push(Math.max(...PlayerTwosRatingValues));

					let TwosRatingCol = getCol(PlayerTwosRatingChanges, 3);
					TwosRatingCol = TwosRatingCol.map((r) => parseInt(r));
					TwosRatingCol.push(
						TwosRatingCol[TwosRatingCol.length - 1] +
							parseInt(PlayerTwosRatingChanges[TwosRatingCol.length - 1][4])
					); //add latest rating to the array
					//allTwosMatchRatings.push(...TwosRatingCol);
					for (let i = 0; i < TwosRatingCol.length; i++) {
						allTwosMatchRatings.push({
							x: twosMatchCount+i,
							y: TwosRatingCol[i]
						});
					}
					twosMatchCount = twosMatchCount + TwosRatingCol.length - 1;
				}

				//streak extrema
				const TwosRatingChangesCol = getCol(PlayerTwosRatingChanges, 4); //Rating Change column for twos RPUGs for selected player

				let prevSign = TwosRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of TwosRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestTWStreak) {
								highestTWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestTLStreak) {
								highestTLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}
		}
	}

	highestCLStreak =
		highestCLStreak === 0 ? "-" : "-" + highestCLStreak.toString();
	highestCWStreak =
		highestCWStreak === 0 ? "-" : "+" + highestCWStreak.toString();
	highestTLStreak =
		highestTLStreak === 0 ? "-" : "-" + highestTLStreak.toString();
	highestTWStreak =
		highestTWStreak === 0 ? "-" : "+" + highestTWStreak.toString();
	highestFLStreak =
		highestFLStreak === 0 ? "-" : "-" + highestFLStreak.toString();
	highestFWStreak =
		highestFWStreak === 0 ? "-" : "+" + highestFWStreak.toString();

	if (
		carCasualWins +
			carCasualLosses +
			carTwosWins +
			carTwosLosses +
			carFoursWins +
			carFoursLosses ===
		0
	) {
		return null;
	}

	carCasualRating.min = Math.min(...carCasualMinMaxRatings);
	carCasualRating.max = Math.max(...carCasualMinMaxRatings);
	carCasualRating.num = carCasualEOSRatings.length;
	carCasualRating.avg =
		carCasualEOSRatings.reduce((a, b) => a + b, 0) / carCasualEOSRatings.length;

	carTwosRating.min = Math.min(...carTwosMinMaxRatings);
	carTwosRating.max = Math.max(...carTwosMinMaxRatings);
	carTwosRating.num = carTwosEOSRatings.length;
	carTwosRating.avg =
		carTwosEOSRatings.reduce((a, b) => a + b, 0) / carTwosEOSRatings.length;

	carFoursRating.min = Math.min(...carFoursMinMaxRatings);
	carFoursRating.max = Math.max(...carFoursMinMaxRatings);
	carFoursRating.num = carFoursEOSRatings.length;
	carFoursRating.avg =
		carFoursEOSRatings.reduce((a, b) => a + b, 0) / carFoursEOSRatings.length;

	//Casual Rating Worm
	/*
	const xAxisLength =
		allCasualMatchRatings.length > allTwosMatchRatings.length
			? Math.ceil(allCasualMatchRatings.length / 5) * 5
			: Math.ceil(allTwosMatchRatings.length / 5) * 5;
	*/
	const xAxisLength = Math.ceil(Math.max(allCasualMatchRatings.length,allTwosMatchRatings.length,allFoursMatchRatings.length)/5) * 5;
	const width = 1000;
	const height = 400;

	const configuration = {
		type: "line",
		data: {
			labels: Array.from({ length: xAxisLength }, (x, i) => i),
			datasets: [
				{
					label: "Casual",
					data: allCasualMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "yellow",
				},
				{
					label: "Twos",
					data: allTwosMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "rgb(0,255,255,1)",
				},
				{
					label: "Fours",
					data: allFoursMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "rgb(213,128,255,1)",
				},
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Career Rating Worm",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					labels: {
						boxHeight: 0,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Match Number",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					min: 0,
					max: xAxisLength,
					ticks: {
						stepSize: xAxisLength / 5,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					type: "linear",
					display: true,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.8)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

	return {
		CareerCasualRating: carCasualRating,
		CareerCasualWins: carCasualWins,
		CareerCasualLosses: carCasualLosses,
		CareerCasualMinStreak: highestCLStreak,
		CareerCasualMaxStreak: highestCWStreak,
		CareerTwosRating: carTwosRating,
		CareerTwosWins: carTwosWins,
		CareerTwosLosses: carTwosLosses,
		CareerTwosMinStreak: highestTLStreak,
		CareerTwosMaxStreak: highestTWStreak,
		CareerFoursRating: carFoursRating,
		CareerFoursWins: carFoursWins,
		CareerFoursLosses: carFoursLosses,
		CareerFoursMinStreak: highestFLStreak,
		CareerFoursMaxStreak: highestFWStreak,
		CareerRatingWorm: buffer,
	};
};

//can be deleted- no longer used
const getPlayerFromUsernameQueryMoreInfo = async (username) => {
	//had to make new function instead of above because getPlayerFromDiscordIdQuery() is used in more than one function

	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => stripUsername(x[2]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase());

	if (playerIdx !== -1) {
		const PlayerPath =
			currDataPath +
			`/PlayerData/${PlayerData[playerIdx][0]} ${PlayerData[playerIdx][2]}/`;

		const SelPlayerRatingsData = readDatabase(
			PlayerPath + "/RatingChanges.txt"
		);

		//casual RPUGs
		const SelPlayerCasualRatingsData = SelPlayerRatingsData.filter(
			(row) => row[6] === "casual"
		);
		let SelPlayerCasualStreak = "-";
		let highestCLStreak = "-";
		let highestCWStreak = "-";
		let minCasualRating = "-";
		let maxCasualRating = "-";

		if (SelPlayerCasualRatingsData.length !== 0) {
			const CasualRatingChangesCol = getCol(SelPlayerCasualRatingsData, 4); //Rating Change column for casual RPUGs

			//rating extrema
			const CasualRatingValues = SelPlayerCasualRatingsData.map(
				(row) => parseInt(row[3]) + parseInt(row[4])
			);

			if (CasualRatingValues.length > 0) {
				CasualRatingValues.unshift(cfg.trueskill.casualInitTS.initialRating);
				minCasualRating = Math.min(...CasualRatingValues);
				maxCasualRating = Math.max(...CasualRatingValues);
			}

			//latest streak
			const lastSign =
				CasualRatingChangesCol[CasualRatingChangesCol.length - 1][0]; //starting sign to check
			let count = 0;

			for (const changeVal of CasualRatingChangesCol.slice().reverse()) {
				if (changeVal[0] === lastSign) {
					count += 1;
				} else {
					break;
				}
			}

			SelPlayerCasualStreak = lastSign + count.toString();

			//streak extrema
			highestCLStreak = 0;
			highestCWStreak = 0;
			let prevSign = CasualRatingChangesCol[0][0]; //starting sign to check
			count = 0;

			for (const changeVal of CasualRatingChangesCol) {
				if (parseInt(changeVal) === 0) {
				} //just incase there is a 0 rating change
				else if (changeVal[0] === prevSign) {
					count += 1;
					if (prevSign === "+") {
						if (count > highestCWStreak) {
							highestCWStreak = count;
						}
					} else if (prevSign === "-") {
						//explicitly checking just incase
						if (count > highestCLStreak) {
							highestCLStreak = count;
						}
					}
				} else {
					count = 1;
					prevSign = changeVal[0];
				}
			}
			/*
			if (highestCLStreak === 0) {
				highestCLStreak = '-';
			}
			else {
				highestCLStreak = '-' + highestCLStreak.toString();
			}
			*/
			highestCLStreak =
				highestCLStreak === 0 ? "-" : "-" + highestCLStreak.toString();
			highestCWStreak =
				highestCWStreak === 0 ? "-" : "+" + highestCWStreak.toString();
		}

		//twos RPUGs
		const SelPlayerTwosRatingsData = SelPlayerRatingsData.filter(
			(row) => row[6] === "twos"
		);
		let SelPlayerTwosStreak = "-";
		let highestTLStreak = "-";
		let highestTWStreak = "-";
		let minTwosRating = "-";
		let maxTwosRating = "-";

		if (SelPlayerTwosRatingsData.length !== 0) {
			const TwosRatingChangesCol = getCol(SelPlayerTwosRatingsData, 4); //Rating Change column for twos RPUGs

			//rating extrema
			const TwosRatingValues = SelPlayerTwosRatingsData.map(
				(row) => parseInt(row[3]) + parseInt(row[4])
			);

			if (TwosRatingValues.length > 0) {
				TwosRatingValues.unshift(cfg.trueskill.twosInitTS.initialRating);
				minTwosRating = Math.min(...TwosRatingValues);
				maxTwosRating = Math.max(...TwosRatingValues);
			}

			//current streak
			const lastSign = TwosRatingChangesCol[TwosRatingChangesCol.length - 1][0]; //starting sign to check
			let count = 0;

			for (const changeVal of TwosRatingChangesCol.slice().reverse()) {
				if (changeVal[0] === lastSign) {
					count += 1;
				} else {
					break;
				}
			}

			SelPlayerTwosStreak = lastSign + count.toString();

			//streak extrema
			highestTLStreak = 0;
			highestTWStreak = 0;
			let prevSign = TwosRatingChangesCol[0][0]; //starting sign to check
			count = 0;

			for (const changeVal of TwosRatingChangesCol) {
				if (parseInt(changeVal) === 0) {
				} //just incase there is a 0 rating change
				else if (changeVal[0] === prevSign) {
					count += 1;
					if (prevSign === "+") {
						if (count > highestTWStreak) {
							highestTWStreak = count;
						}
					} else if (prevSign === "-") {
						//explicitly checking just incase
						if (count > highestTLStreak) {
							highestTLStreak = count;
						}
					}
				} else {
					count = 1;
					prevSign = changeVal[0];
				}
			}
			highestTLStreak =
				highestTLStreak === 0 ? "-" : "-" + highestTLStreak.toString();
			highestTWStreak =
				highestTWStreak === 0 ? "-" : "+" + highestTWStreak.toString();
		}

		//fours RPUGs
		const SelPlayerFoursRatingsData = SelPlayerRatingsData.filter(
			(row) => row[6] === "fours"
		);
		let SelPlayerFoursStreak = "-";
		let highestFLStreak = "-";
		let highestFWStreak = "-";
		let minFoursRating = "-";
		let maxFoursRating = "-";

		if (SelPlayerFoursRatingsData.length !== 0) {
			const FoursRatingChangesCol = getCol(SelPlayerFoursRatingsData, 4); //Rating Change column for twos RPUGs

			//rating extrema
			const FoursRatingValues = SelPlayerFoursRatingsData.map(
				(row) => parseInt(row[3]) + parseInt(row[4])
			);

			if (FoursRatingValues.length > 0) {
				FoursRatingValues.unshift(cfg.trueskill.foursInitTS.initialRating);
				minFoursRating = Math.min(...FoursRatingValues);
				maxFoursRating = Math.max(...FoursRatingValues);
			}

			//current streak
			const lastSign =
				FoursRatingChangesCol[FoursRatingChangesCol.length - 1][0]; //starting sign to check
			let count = 0;

			for (const changeVal of FoursRatingChangesCol.slice().reverse()) {
				if (changeVal[0] === lastSign) {
					count += 1;
				} else {
					break;
				}
			}

			SelPlayerFoursStreak = lastSign + count.toString();

			//streak extrema
			highestFLStreak = 0;
			highestFWStreak = 0;
			let prevSign = FoursRatingChangesCol[0][0]; //starting sign to check
			count = 0;

			for (const changeVal of FoursRatingChangesCol) {
				if (parseInt(changeVal) === 0) {
				} //just incase there is a 0 rating change
				else if (changeVal[0] === prevSign) {
					count += 1;
					if (prevSign === "+") {
						if (count > highestFWStreak) {
							highestFWStreak = count;
						}
					} else if (prevSign === "-") {
						//explicitly checking just incase
						if (count > highestFLStreak) {
							highestFLStreak = count;
						}
					}
				} else {
					count = 1;
					prevSign = changeVal[0];
				}
			}
			highestFLStreak =
				highestFLStreak === 0 ? "-" : "-" + highestFLStreak.toString();
			highestFWStreak =
				highestFWStreak === 0 ? "-" : "+" + highestFWStreak.toString();
		}

		//Charts
		const width = 1000;
		const height = 400;
		let CasualRatingCol = [];
		let TwosRatingCol = [];
		let FoursRatingCol = [];

		if (SelPlayerCasualRatingsData.length !== 0) {
			CasualRatingCol = getCol(SelPlayerCasualRatingsData, 3);
			CasualRatingCol = CasualRatingCol.map((r) => parseInt(r));
			CasualRatingCol.push(
				CasualRatingCol[CasualRatingCol.length - 1] +
					parseInt(SelPlayerCasualRatingsData[CasualRatingCol.length - 1][4])
			); //add latest rating to the array
		}
		if (SelPlayerTwosRatingsData.length !== 0) {
			TwosRatingCol = getCol(SelPlayerTwosRatingsData, 3);
			TwosRatingCol = TwosRatingCol.map((r) => parseInt(r));
			TwosRatingCol.push(
				TwosRatingCol[TwosRatingCol.length - 1] +
					parseInt(SelPlayerTwosRatingsData[TwosRatingCol.length - 1][4])
			); //add latest rating to the array
		}
		if (SelPlayerFoursRatingsData.length !== 0) {
			FoursRatingCol = getCol(SelPlayerFoursRatingsData, 3);
			FoursRatingCol = FoursRatingCol.map((r) => parseInt(r));
			FoursRatingCol.push(
				FoursRatingCol[FoursRatingCol.length - 1] +
					parseInt(SelPlayerFoursRatingsData[FoursRatingCol.length - 1][4])
			); //add latest rating to the array
		}
		/*
		const xAxisLength =
			CasualRatingCol.length > TwosRatingCol.length
				? Math.ceil(CasualRatingCol.length / 5) * 5
				: Math.ceil(TwosRatingCol.length / 5) * 5;
		*/
		const xAxisLength = Math.ceil(Math.max(CasualRatingCol.length,TwosRatingCol.length,FoursRatingCol.length)/5) * 5;

		//console.log(Array.from({length: 6}, (x, i) => i*(xAxisLength/5)));

		const configuration = {
			type: "line",
			data: {
				labels: Array.from({ length: xAxisLength }, (x, i) => i),
				datasets: [
					{
						label: "Casual",
						data: CasualRatingCol,
						fill: false,
						pointRadius: 0,
						//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
						//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
						//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
						xAxisID: "x",
						borderWidth: 6,
						borderColor: "yellow",
					},
					{
						label: "Twos",
						data: TwosRatingCol,
						fill: false,
						pointRadius: 0,
						//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
						//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
						//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
						xAxisID: "x",
						borderWidth: 6,
						borderColor: "rgb(0,255,255,1)",
					},
					{
						label: "Fours",
						data: FoursRatingCol,
						fill: false,
						pointRadius: 0,
						//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
						//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
						//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
						xAxisID: "x",
						borderWidth: 6,
						borderColor: "rgb(213,128,255,1)",
					},
				],
			},
			options: {
				//locale: 'fr', // Uncomment this line for "wrong" options
				plugins: {
					title: {
						display: true,
						text: "RPUGs Rating Worm",
						color: "white", //change to white later
						font: {
							family: "Arial",
							size: 20,
						},
					},
					"background-color": {
						color: "rgba(0,0,0,0.9)", //temporarily white
						//color: 'rgba(255,255,255,0.9)'
					},
					legend: {
						labels: {
							boxHeight: 0,
							color: "white",
							font: {
								family: "Arial",
								size: 20,
							},
						},
					},
				},
				layout: {
					padding: 20,
				},
				scales: {
					x: {
						title: {
							display: true,
							text: "Match Number",
							color: "white",
							font: {
								family: "Arial",
								size: 20,
							},
						},
						id: "x",
						type: "linear",
						display: true,
						min: 0,
						max: xAxisLength,
						ticks: {
							stepSize: xAxisLength / 5,
							color: "white",
							font: {
								family: "Arial",
								size: 20,
							},
						},
						grid: {
							borderDash: [4, 2],
							color: "rgb(192,192,192,0.8)",
						},
					},
					y: {
						title: {
							display: true,
							text: "Rating",
							color: "white",
							font: {
								family: "Arial",
								size: 20,
							},
						},
						type: "linear",
						display: true,
						ticks: {
							callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
							stepSize: 100,
							color: "white",
							font: {
								family: "Arial",
								size: 20,
							},
						},
						grid: {
							borderDash: [4, 2],
							color: "rgb(220,220,220,0.8)",
						},
					},
				},
			},
			plugins: [
				{
					id: "background-color",
					beforeDraw: (chart, args, options) => {
						const ctx = chart.ctx;
						ctx.save();
						ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
						ctx.fillRect(0, 0, width, height);
						ctx.restore();
					},
				},
			],
		};

		const chartCallback = (ChartJS) => {
			ChartJS.defaults.responsive = true;
			ChartJS.defaults.maintainAspectRatio = false;
			ChartJS.defaults.font = "Arial";
		};
		const chartJSNodeCanvas = new ChartJSNodeCanvas({
			width,
			height,
			chartCallback,
		});
		chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
		const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

		return {
			CasualRating: {
				min: minCasualRating,
				max: maxCasualRating,
			},
			TwosRating: {
				min: minTwosRating,
				max: maxTwosRating,
			},
			FoursRating: {
				min: minFoursRating,
				max: maxFoursRating,
			},
			CasualStreak: {
				currStreak: SelPlayerCasualStreak,
				minStreak: highestCLStreak,
				maxStreak: highestCWStreak,
			},
			TwosStreak: {
				currStreak: SelPlayerTwosStreak,
				minStreak: highestTLStreak,
				maxStreak: highestTWStreak,
			},
			FoursStreak: {
				currStreak: SelPlayerFoursStreak,
				minStreak: highestFLStreak,
				maxStreak: highestFWStreak,
			},
			RatingWorms: buffer,
		};
	}
};

//can be deleted- no longer used
const getPlayerCareerFromUsernameQuery = async (username) => {
	//read database
	//const currDataPath = getCurrentDataPath();
	let carCasualRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carTwosRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carFoursRating = {
		min: null,
		max: null,
		avg: null,
		num: null,
	};
	let carCasualEOSRatings = []; //End of season ratings
	let carCasualMinMaxRatings = []; //Min-max ratings for each season
	let carCasualWins = 0;
	let carCasualLosses = 0;
	let carTwosEOSRatings = []; //End of season ratings
	let carTwosMinMaxRatings = []; //Min-max ratings for each season
	let carTwosWins = 0;
	let carTwosLosses = 0;
	let carFoursEOSRatings = []; //End of season ratings
	let carFoursMinMaxRatings = []; //Min-max ratings for each season
	let carFoursWins = 0;
	let carFoursLosses = 0;
	let highestCLStreak = 0;
	let highestCWStreak = 0;
	let highestTLStreak = 0;
	let highestTWStreak = 0;
	let highestFLStreak = 0;
	let highestFWStreak = 0;
	let casualMatchCount = 0;
	let twosMatchCount = 0;
	let foursMatchCount = 0;
	let allCasualMatchRatings = []; //collection of all ratings over all seasons
	let allTwosMatchRatings = []; //collection of all ratings over all seasons
	let allFoursMatchRatings = []; //collection of all ratings over all seasons

	const datesDirs = getDirectories(dataPath);		
	for (const dir of datesDirs) {
		const PlayerData = readDatabase(dataPath + dir + "/Players.txt");
		const PlayerDataColNames = PlayerData[0];
		const playerIdx = PlayerData.map((x) =>
			stripUsername(x[2]).toLowerCase()
		).indexOf(stripUsername(username.toString()).toLowerCase());

		const RatingsData = readDatabase(dataPath + dir + "/RatingChanges.txt");

		if (playerIdx !== -1) {
			const CasualSigmaColIdx = getColNameIdx(PlayerDataColNames, ['CasualSigma', 'OpenSigma']);
			if ((CasualSigmaColIdx) && (parseFloat(PlayerData[playerIdx][CasualSigmaColIdx]) !== cfg.trueskill.casualInitTS.initialSigma)) {
			//if (((PlayerData[0][4] === 'CasualSigma') || (PlayerData[0][4] === 'OpenSigma')) && (parseFloat(PlayerData[playerIdx][4]) !== cfg.trueskill.casualInitTS.initialSigma)) {	//checking to see if any matches played
				
				const CasualWinsColIdx = getColNameIdx(PlayerDataColNames, ['NumCasualMatchesWon','NumOpenMatchesWon']);
				const CasualLossesColIdx = getColNameIdx(PlayerDataColNames, ['NumCasualMatchesLost','NumOpenMatchesLost']);
				const CasualEOSRatingsColIdx = getColNameIdx(PlayerDataColNames, ['CasualRating','OpenRating']);
			
				carCasualWins += parseInt(PlayerData[playerIdx][CasualWinsColIdx]);
				carCasualLosses += parseInt(PlayerData[playerIdx][CasualLossesColIdx]);
				carCasualEOSRatings.push(parseInt(PlayerData[playerIdx][CasualEOSRatingsColIdx])); //EOS rating

				const PlayerCasualRatingChanges = RatingsData.filter(
					(row) =>
						row[2] === PlayerData[playerIdx][0] &&
						(row[6] === "casual" || row[6] === "open")
				); //filter Ratings for selected player and casual/open mode
				const PlayerCasualRatingValues = PlayerCasualRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerCasualRatingValues.length > 0) {
					carCasualMinMaxRatings.push(Math.min(...PlayerCasualRatingValues));
					carCasualMinMaxRatings.push(Math.max(...PlayerCasualRatingValues));

					let CasualRatingCol = getCol(PlayerCasualRatingChanges, 3);
					CasualRatingCol = CasualRatingCol.map((r) => parseInt(r));
					CasualRatingCol.push(
						CasualRatingCol[CasualRatingCol.length - 1] +
							parseInt(PlayerCasualRatingChanges[CasualRatingCol.length - 1][4])
					); //add latest rating to the array
					//allCasualMatchRatings.push(...CasualRatingCol);
					for (let i = 0; i < CasualRatingCol.length; i++) {
						allCasualMatchRatings.push({
							x: casualMatchCount+i,
							y: CasualRatingCol[i]
						});
					}
					casualMatchCount = casualMatchCount + CasualRatingCol.length - 1;
				}

				//streak extrema
				const CasualRatingChangesCol = getCol(PlayerCasualRatingChanges, 4); //Rating Change column for casual RPUGs for selected player
				let prevSign = CasualRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of CasualRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestCWStreak) {
								highestCWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestCLStreak) {
								highestCLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}

			const FoursSigmaColIdx = getColNameIdx(PlayerDataColNames, ['FoursSigma']);
			if ((FoursSigmaColIdx) && (parseFloat(PlayerData[playerIdx][FoursSigmaColIdx]) !== cfg.trueskill.foursInitTS.initialSigma)) {
			//if ((PlayerData[0][8] === 'FoursSigma') && (parseFloat(PlayerData[playerIdx][8]) !== cfg.trueskill.foursInitTS.initialSigma)) {	//checking to see if any matches played
			
				const FoursWinsColIdx = PlayerDataColNames.indexOf('NumFoursMatchesWon');
				const FoursLossesColIdx = PlayerDataColNames.indexOf('NumFoursMatchesLost');
				const FoursEOSRatingsColIdx = PlayerDataColNames.indexOf('FoursRating');
			
				carFoursWins += parseInt(PlayerData[playerIdx][FoursWinsColIdx]);
				carFoursLosses += parseInt(PlayerData[playerIdx][FoursLossesColIdx]);
				
				carFoursEOSRatings.push(parseInt(PlayerData[playerIdx][FoursEOSRatingsColIdx])); //EOS rating

				const PlayerFoursRatingChanges = RatingsData.filter(
					(row) => row[2] === PlayerData[playerIdx][0] && row[6] === "fours"
				); //filter Ratings for selected player and casual/open mode
				const PlayerFoursRatingValues = PlayerFoursRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerFoursRatingValues.length > 0) {
					carFoursMinMaxRatings.push(Math.min(...PlayerFoursRatingValues));
					carFoursMinMaxRatings.push(Math.max(...PlayerFoursRatingValues));

					let FoursRatingCol = getCol(PlayerFoursRatingChanges, 3);
					FoursRatingCol = FoursRatingCol.map((r) => parseInt(r));
					FoursRatingCol.push(
						FoursRatingCol[FoursRatingCol.length - 1] +
							parseInt(PlayerFoursRatingChanges[FoursRatingCol.length - 1][4])
					); //add latest rating to the array
					//allFoursMatchRatings.push(...FoursRatingCol);
					for (let i = 0; i < FoursRatingCol.length; i++) {
						allFoursMatchRatings.push({
							x: foursMatchCount+i,
							y: FoursRatingCol[i]
						});
					}
					foursMatchCount = foursMatchCount + FoursRatingCol.length - 1;
				}

				//streak extrema
				const FoursRatingChangesCol = getCol(PlayerFoursRatingChanges, 4); //Rating Change column for casual RPUGs for selected player

				let prevSign = FoursRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of FoursRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestFWStreak) {
								highestFWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestFLStreak) {
								highestFLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}
			
			const TwosSigmaColIdx = getColNameIdx(PlayerDataColNames, ['TwosSigma']);
			if ((TwosSigmaColIdx) && (parseFloat(PlayerData[playerIdx][TwosSigmaColIdx]) !== cfg.trueskill.twosInitTS.initialSigma)) {
			//if (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma && parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma / 2) {
			//if ((PlayerData[0][6] === 'TwosSigma') && (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma)) {
				
				const TwosWinsColIdx = PlayerDataColNames.indexOf('NumTwosMatchesWon');
				const TwosLossesColIdx = PlayerDataColNames.indexOf('NumTwosMatchesLost');
				const TwosEOSRatingsColIdx = PlayerDataColNames.indexOf('TwosRating');
				
				carTwosWins += parseInt(PlayerData[playerIdx][TwosWinsColIdx]);
				carTwosLosses += parseInt(PlayerData[playerIdx][TwosLossesColIdx]);
				
				carTwosEOSRatings.push(parseInt(PlayerData[playerIdx][TwosEOSRatingsColIdx]));

				const PlayerTwosRatingChanges = RatingsData.filter(
					(row) => row[2] === PlayerData[playerIdx][0] && row[6] === "twos"
				); //filter Ratings for selected player and twos mode
				const PlayerTwosRatingValues = PlayerTwosRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerTwosRatingValues.length > 0) {
					carTwosMinMaxRatings.push(Math.min(...PlayerTwosRatingValues));
					carTwosMinMaxRatings.push(Math.max(...PlayerTwosRatingValues));

					let TwosRatingCol = getCol(PlayerTwosRatingChanges, 3);
					TwosRatingCol = TwosRatingCol.map((r) => parseInt(r));
					TwosRatingCol.push(
						TwosRatingCol[TwosRatingCol.length - 1] +
							parseInt(PlayerTwosRatingChanges[TwosRatingCol.length - 1][4])
					); //add latest rating to the array
					//allTwosMatchRatings.push(...TwosRatingCol);
					for (let i = 0; i < TwosRatingCol.length; i++) {
						allTwosMatchRatings.push({
							x: twosMatchCount+i,
							y: TwosRatingCol[i]
						});
					}
					twosMatchCount = twosMatchCount + TwosRatingCol.length - 1;
				}

				//streak extrema
				const TwosRatingChangesCol = getCol(PlayerTwosRatingChanges, 4); //Rating Change column for twos RPUGs for selected player

				let prevSign = TwosRatingChangesCol[0][0]; //starting sign to check
				let count = 0;

				for (const changeVal of TwosRatingChangesCol) {
					if (parseInt(changeVal) === 0) {
					} //just incase there is a 0 rating change
					else if (changeVal[0] === prevSign) {
						count += 1;
						if (prevSign === "+") {
							if (count > highestTWStreak) {
								highestTWStreak = count;
							}
						} else if (prevSign === "-") {
							//explicitly checking just incase
							if (count > highestTLStreak) {
								highestTLStreak = count;
							}
						}
					} else {
						count = 1;
						prevSign = changeVal[0];
					}
				}
			}
		}
	}

	highestCLStreak =
		highestCLStreak === 0 ? "-" : "-" + highestCLStreak.toString();
	highestCWStreak =
		highestCWStreak === 0 ? "-" : "+" + highestCWStreak.toString();
	highestTLStreak =
		highestTLStreak === 0 ? "-" : "-" + highestTLStreak.toString();
	highestTWStreak =
		highestTWStreak === 0 ? "-" : "+" + highestTWStreak.toString();
	highestFLStreak =
		highestFLStreak === 0 ? "-" : "-" + highestFLStreak.toString();
	highestFWStreak =
		highestFWStreak === 0 ? "-" : "+" + highestFWStreak.toString();

	if (
		carCasualWins +
			carCasualLosses +
			carTwosWins +
			carTwosLosses +
			carFoursWins +
			carFoursLosses ===
		0
	) {
		return null;
	}

	carCasualRating.min = Math.min(...carCasualMinMaxRatings);
	carCasualRating.max = Math.max(...carCasualMinMaxRatings);
	carCasualRating.num = carCasualEOSRatings.length;
	carCasualRating.avg =
		carCasualEOSRatings.reduce((a, b) => a + b, 0) / carCasualEOSRatings.length;

	carTwosRating.min = Math.min(...carTwosMinMaxRatings);
	carTwosRating.max = Math.max(...carTwosMinMaxRatings);
	carTwosRating.num = carTwosEOSRatings.length;
	carTwosRating.avg =
		carTwosEOSRatings.reduce((a, b) => a + b, 0) / carTwosEOSRatings.length;

	carFoursRating.min = Math.min(...carFoursMinMaxRatings);
	carFoursRating.max = Math.max(...carFoursMinMaxRatings);
	carFoursRating.num = carFoursEOSRatings.length;
	carFoursRating.avg =
		carFoursEOSRatings.reduce((a, b) => a + b, 0) / carFoursEOSRatings.length;

	//Casual Rating Worm
	/*
	const xAxisLength =
		allCasualMatchRatings.length > allTwosMatchRatings.length
			? Math.ceil(allCasualMatchRatings.length / 5) * 5
			: Math.ceil(allTwosMatchRatings.length / 5) * 5;
	*/
	const xAxisLength = Math.ceil(Math.max(allCasualMatchRatings.length,allTwosMatchRatings.length,allFoursMatchRatings.length)/5) * 5;
	const width = 1000;
	const height = 400;

	const configuration = {
		type: "line",
		data: {
			labels: Array.from({ length: xAxisLength }, (x, i) => i),
			datasets: [
				{
					label: "Casual",
					data: allCasualMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(CasualRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(CasualRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(CasualRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "yellow",
				},
				{
					label: "Twos",
					data: allTwosMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "rgb(0,255,255,1)",
				},

				{
					label: "Fours",
					data: allFoursMatchRatings,
					fill: false,
					pointRadius: 0,
					//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
					//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
					//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
					xAxisID: "x",
					borderWidth: 3,
					borderColor: "rgb(213,128,255,1)",
				},
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Career Rating Worm",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					labels: {
						boxHeight: 0,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Match Number",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					min: 0,
					max: xAxisLength,
					ticks: {
						stepSize: xAxisLength / 5,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					type: "linear",
					display: true,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.8)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

	return {
		CareerCasualRating: carCasualRating,
		CareerCasualWins: carCasualWins,
		CareerCasualLosses: carCasualLosses,
		CareerCasualMinStreak: highestCLStreak,
		CareerCasualMaxStreak: highestCWStreak,
		CareerTwosRating: carTwosRating,
		CareerTwosWins: carTwosWins,
		CareerTwosLosses: carTwosLosses,
		CareerTwosMinStreak: highestTLStreak,
		CareerTwosMaxStreak: highestTWStreak,
		CareerFoursRating: carFoursRating,
		CareerFoursWins: carFoursWins,
		CareerFoursLosses: carFoursLosses,
		CareerFoursMinStreak: highestFLStreak,
		CareerFoursMaxStreak: highestFWStreak,
		CareerRatingWorm: buffer,
	};
};

/**
 * Returns information for a versus (head-to-head and same team) between two players
 * @param {String} username
 */

const getVersusStatsQuery = (discordId1,discordId2,season,mode) => {
	if (season === 'career') {
		const player1 = getPlayerQuery(discordId1,null,null,'current');
		const player2 = getPlayerQuery(discordId2,null,null,'current');

		if (!player1 || !player2) {
			return null;
		}
		
		return getCareerVersusStatsQuery(player1,player2,mode);
	}
	
	const player1 = getPlayerQuery(discordId1,null,null,season);
	const player2 = getPlayerQuery(discordId2,null,null,season);

	if (!player1 || !player2) {
		return null;
	}
	
	return getSeasonVersusStatsQuery(player1,player2,season,mode);
};

const getSeasonVersusStatsQuery = (player1,player2,season,mode) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	//const PlayerData = readDatabase(currDataPath + "/Players.txt");
	
	//use PIDs and mode to filter matches
	const MatchesData = readDatabase(currDataPath + "/Matches.txt");
	const MatchesDataHeader = MatchesData.shift();
	MatchesData.shift(); //throwaway row
	
	const PlayerIDsColIdx = getColNameIdx(MatchesDataHeader, ['PlayerIDs']);
	const ModeColIdx = getColNameIdx(MatchesDataHeader, ['Mode']);
	
	const seasonVsData = MatchesData.filter(
		(row) =>
			(row[ ModeColIdx ] === mode) &&
			row[ PlayerIDsColIdx ].split(",").includes(player1.playerId) &&
			row[ PlayerIDsColIdx ].split(",").includes(player2.playerId)
	);
	
	let withW = 0;
	let withL = 0;
	let againstW = 0;
	let againstL = 0;
	
	for (const match of seasonVsData) {
		const numWinners = match[ getColNameIdx(MatchesDataHeader, ['Winners']) ].split(',').length;
		const matchPlayers = match[ PlayerIDsColIdx ].split(',');
		const winners = matchPlayers.slice(0,numWinners);
		const losers = matchPlayers.slice(numWinners);
		
		if (winners.includes(player1.playerId)) {
			if (winners.includes(player2.playerId)) {
				withW += 1;
			} else {
				againstW += 1;
			}
		} else {
			if (winners.includes(player2.playerId)) {
				againstL += 1;
			} else {
				withL += 1;
			}
		}
	}
	
	return {
		players: {
			player1: player1,
			player2: player2,
		},
		stats: {
			With: {	//lowercase with can't be used
				wins: withW,
				losses: withL,
			},
			Against: {
				wins: againstW,
				losses: againstL,
			},
		}
	};
	
	//casual
	//let withCWs = 0;
	//let withCLs = 0;
	//let againstCWs = 0;
	//let againstCLs = 0;

	//for (const match of seasonVsDataCasual) {
	//	const winners = match[3].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
	//	const losers = match[4].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
	//	if (winners.includes(player1.username)) {
	//		if (winners.includes(player2.username)) {
	//			withCWs += 1;
	//		} else {
	//			againstCWs += 1;
	//		}
	//	} else {
	//		if (winners.includes(player2.username)) {
	//			againstCLs += 1;
	//		} else {
	//			withCLs += 1;
	//		}
	//	}
	//}

	/*
	return {
		Players: {
			Player1: player1,
			Player2: player2,
		},
		Casual: {
			With: {
				Wins: withCWs,
				Losses: withCLs,
			},
			Against: {
				Wins: againstCWs,
				Losses: againstCLs,
			},
		},
		Twos: {
			With: {
				Wins: withTWs,
				Losses: withTLs,
			},
			Against: {
				Wins: againstTWs,
				Losses: againstTLs,
			},
		},
		Fours: {
			With: {
				Wins: withFWs,
				Losses: withFLs,
			},
			Against: {
				Wins: againstFWs,
				Losses: againstFLs,
			},
		},
	};
	*/
}

const getCareerVersusStatsQuery = (player1,player2,mode) => {
	const seasonList = getSeasonListQuery().sort().reverse();	//chronological
	//const currModeInfo = getModeInfo(mode);
	//console.log(seasonList);
	
	let withW = 0;
	let withL = 0;
	let againstW = 0;
	let againstL = 0;
	
	for (const s of seasonList) {
		const seasonVsStats = getSeasonVersusStatsQuery(player1,player2,s,mode);
		withW += seasonVsStats.stats.With.wins;
		withL += seasonVsStats.stats.With.losses;
		againstW += seasonVsStats.stats.Against.wins;
		againstL += seasonVsStats.stats.Against.losses;
	}
	
	return {
		players: {
			player1: player1,
			player2: player2,
		},
		stats: {
			With: {	//lowercase with can't be used
				wins: withW,
				losses: withL,
			},
			Against: {
				wins: againstW,
				losses: againstL,
			},
		}
	};
}

//can be deleted- no longer used
const getVersusCareerInfo = async (discordId, username) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const PlayerDataColNames = PlayerData[0];
	const PlayerIDColIdx = PlayerDataColNames.indexOf('ID');
	const DiscordIDColIdx = PlayerDataColNames.indexOf('DiscordID');
	const UsernameColIdx = PlayerDataColNames.indexOf('Username');
	
	/*
	const playerIdx = PlayerData.map((x) => x[DiscordIDColIdx]).indexOf(discordId.toString()); //player running the command
	const player2Idx = PlayerData.map((x) => stripUsername(x[UsernameColIdx]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase()); //player 2 for versus info

	let player1 = {};
	let player2 = {};
	if (playerIdx !== -1 && player2Idx !== -1) {
		//if both players found in database
		player1 = new Player(
			PlayerData[playerIdx][PlayerIDColIdx],
			PlayerData[playerIdx][DiscordIDColIdx],
			PlayerData[playerIdx][UsernameColIdx],
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null
		);
		player2 = new Player(
			PlayerData[player2Idx][PlayerIDColIdx],
			PlayerData[player2Idx][DiscordIDColIdx],
			PlayerData[player2Idx][UsernameColIdx],
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null
		);
	} else {
		return null;
	}
	*/

	//casual
	let withCWs = 0;
	let withCLs = 0;
	let againstCWs = 0;
	let againstCLs = 0;
	//twos
	let withTWs = 0;
	let withTLs = 0;
	let againstTWs = 0;
	let againstTLs = 0;
	//fours
	let withFWs = 0;
	let withFLs = 0;
	let againstFWs = 0;
	let againstFLs = 0;

	const datesDirs = getDirectories(dataPath);
	for (const dir of datesDirs) {
		const MatchesData = readDatabase(dataPath + dir + "/Matches.txt");

		const seasonVsData = MatchesData.filter(
			(row) =>
				row[2].split(",").includes(player1.playerID) &&
				row[2].split(",").includes(player2.playerID)
		);
		const seasonVsDataCasual = seasonVsData.filter(
			(row) => row[5] === "casual" || row[5] === "open"
		);
		const seasonVsDataTwos = seasonVsData.filter((row) => row[5] === "twos");
		const seasonVsDataFours = seasonVsData.filter((row) => row[5] === "fours");

		//casual or open
		for (const match of seasonVsDataCasual) {
			const winners = match[3].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			const losers = match[4].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			if (winners.includes(player1.username)) {
				if (winners.includes(player2.username)) {
					withCWs += 1;
				} else {
					againstCWs += 1;
				}
			} else {
				if (winners.includes(player2.username)) {
					againstCLs += 1;
				} else {
					withCLs += 1;
				}
			}
		}

		//twos
		for (const match of seasonVsDataTwos) {
			const winners = match[3].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			const losers = match[4].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			if (winners.includes(player1.username)) {
				if (winners.includes(player2.username)) {
					withTWs += 1;
				} else {
					againstTWs += 1;
				}
			} else {
				if (winners.includes(player2.username)) {
					againstTLs += 1;
				} else {
					withTLs += 1;
				}
			}
		}

		//fours
		for (const match of seasonVsDataFours) {
			const winners = match[3].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			const losers = match[4].replace(/ *\([^)]*\) */g, "").split(","); //remove rating changes
			if (winners.includes(player1.username)) {
				if (winners.includes(player2.username)) {
					withFWs += 1;
				} else {
					againstFWs += 1;
				}
			} else {
				if (winners.includes(player2.username)) {
					againstFLs += 1;
				} else {
					withFLs += 1;
				}
			}
		}
	}

	return {
		Players: {
			Player1: player1,
			Player2: player2,
		},
		Casual: {
			With: {
				Wins: withCWs,
				Losses: withCLs,
			},
			Against: {
				Wins: againstCWs,
				Losses: againstCLs,
			},
		},
		Twos: {
			With: {
				Wins: withTWs,
				Losses: withTLs,
			},
			Against: {
				Wins: againstTWs,
				Losses: againstTLs,
			},
		},
		Fours: {
			With: {
				Wins: withFWs,
				Losses: withFLs,
			},
			Against: {
				Wins: againstFWs,
				Losses: againstFLs,
			},
		},
	};
};


//not used
const getPie2 = async (playerId,season,mode) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	PlayerData.shift();	//throwaway line

	/* don't need this- player must exist for this function to have been called
	const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString()); //player running the command

	let player1 = {};
	if (playerIdx !== -1) {
		//if both players found in database
		player1 = new Player(
			PlayerData[playerIdx][0],
			PlayerData[playerIdx][1],
			PlayerData[playerIdx][2],
			parseInt(PlayerData[playerIdx][3]),
			parseFloat(PlayerData[playerIdx][4]),
			parseInt(PlayerData[playerIdx][5]),
			parseFloat(PlayerData[playerIdx][6]),
			parseInt(PlayerData[playerIdx][7]),
			parseFloat(PlayerData[playerIdx][8]),
			parseInt(PlayerData[playerIdx][9]),
			parseInt(PlayerData[playerIdx][10]),
			parseInt(PlayerData[playerIdx][11]),
			parseInt(PlayerData[playerIdx][12]),
			parseInt(PlayerData[playerIdx][13]),
			parseInt(PlayerData[playerIdx][14]),
			PlayerData[playerIdx][15],
			PlayerData[playerIdx][16],
			PlayerData[playerIdx][17]
		);
	} else {
		return null;
	}
	*/
	
	//use PID and mode to filter matches
	const MatchesData = readDatabase(currDataPath + "/Matches.txt");
	const MatchesDataHeader = MatchesData.shift();
	MatchesData.shift(); //throwaway row
	
	const PlayerIDsColIdx = getColNameIdx(MatchesDataHeader, ['PlayerIDs']);
	const ModeColIdx = getColNameIdx(MatchesDataHeader, ['Mode']);
	
	const filteredMatches = MatchesData.filter(
		(row) =>
			(row[ ModeColIdx ] === mode) &&
			row[ PlayerIDsColIdx ].split(",").includes(playerId)
	);
	
	//map the matches into the stats desired- wins with and against, losses with and against
	let matchPlayers = []; //{playerID, username, stats: {WinsWith,WinsAgainst,LossesWith,LossesAgainst}}
	for (const match of filteredMatches) {
		//deal with PIDs- add them to matchPlayers if not already there
		const playerIds = match[ PlayerIDsColIdx ].split(",");
		for (const p of playerIds) {
			if (p === playerId) {	//skip the selected player
				continue;
			}
			
			//check if player is already part of matchPlayers list, or else add
			let notFound = true;
			for (const mp of matchPlayers) {
				if (mp.player.playerId === p) {
					notFound = false;
					break;
				}
			}
			if (notFound) {
				/*
				const pIdx = PlayerData.map((x) => x[1]).indexOf(
					discordId.toString()
				); //player running the command
				*/
				const currPlayer = getPlayerQuery(null,null,p,season);
				matchPlayers.push({
					player: currPlayer,
					stats: {
						winsWith: 0,
						winsAgainst: 0,
						lossesWith: 0,
						lossesAgainst: 0,
					},
				});
			}
			
			
		}
		//
		//stats with/against each player
		const matchWinners = match[3].replace(/ *\([^)]*\) */g, "").split(",");
		const matchLosers = match[4].replace(/ *\([^)]*\) */g, "").split(",");

		for (const mw of matchWinners) {
			//Wins with
			if (matchWinners.includes(player1.username)) {
				if (mw !== player1.username) {
					for (const mp of matchPlayers) {
						if (mp.username === mw) {
							mp.WinsWith += 1;
							break;
						}
					}
				}
			} else {
				//Losses Against
				for (const mp of matchPlayers) {
					if (mp.username === mw) {
						mp.LossesAgainst += 1;
						break;
					}
				}
			}
		}
		for (const ml of matchLosers) {
			//Losses with
			if (matchLosers.includes(player1.username)) {
				if (ml !== player1.username) {
					for (const mp of matchPlayers) {
						if (mp.username === ml) {
							mp.LossesWith += 1;
							break;
						}
					}
				}
			} else {
				//Wins against
				for (const mp of matchPlayers) {
					if (mp.username === ml) {
						mp.WinsAgainst += 1;
						break;
					}
				}
			}
		}
	}
	//console.log(matchPlayers);

	//Pie chart (Maybe doughtnut chart with multiple rings)
	//Maybe future implementation: https://chartjs-plugin-datalabels.netlify.app/samples/charts/doughnut.html
	//Pie chart for now
	//Some example code: https://stackoverflow.com/questions/52044013/chartjs-datalabels-show-percentage-value-in-pie-piece
};

const getPiesQuery = async (playerId,season,mode) => {
	if (season === 'career') {
		return getCareerPiesQuery(playerId,mode);
	}
	return getSeasonPiesQuery(playerId,season,mode);
};

const getSeasonPiesQuery = async (playerId,season,mode) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	PlayerData.shift();	//throwaway line
	
	const player = getPlayerQuery(null,null,playerId,season);
	if (!player) {
		return null;
	}
	
	//use PID and mode to filter matches
	const MatchesData = readDatabase(currDataPath + "/Matches.txt");
	const MatchesDataHeader = MatchesData.shift();
	MatchesData.shift(); //throwaway row
	
	const PlayerIDsColIdx = getColNameIdx(MatchesDataHeader, ['PlayerIDs']);
	const ModeColIdx = getColNameIdx(MatchesDataHeader, ['Mode']);
	
	const filteredMatches = MatchesData.filter(
		(row) =>
			(row[ ModeColIdx ] === mode) &&
			row[ PlayerIDsColIdx ].split(",").includes(playerId)
	);
	
	//map the matches into the stats desired- wins with and against, losses with and against
	let opponentPlayerIds = [];
	for (const match of filteredMatches) {
		//deal with PIDs- add them to matchPlayers if not already there
		const playerIds = match[ PlayerIDsColIdx ].split(",");
		for (const p of playerIds) {
			if ((p === playerId) || (opponentPlayerIds.includes(p))) {	//skip the selected player
				continue;
			}
			opponentPlayerIds.push(p);	
		}
	}
	
	let pieStats = [];
	for (const p of opponentPlayerIds) {
		const selPlayer = getPlayerQuery(null,null,p,season);
		const vsStats = getSeasonVersusStatsQuery(player,selPlayer,season,mode);
		
		pieStats.push({
			player: selPlayer,
			stats: vsStats.stats
		});
	}
		
	let topVsStats = {
		With: {
			wins: [],
			losses: []
		},
		Against: {
			wins: [],
			losses: []
		}
	};
	
	for (const t of Object.keys(topVsStats)) {
		for (const s of Object.keys(topVsStats[t])) {
			pieStats.sort(pieSortBy(t,s));
			for (let i = 0; i < 5; i++) {
				if ((i > (pieStats.length - 1)) || (pieStats[i].stats[t][s] === 0)) {
					break;
				}
				topVsStats[t][s].push(pieStats[i]);
			}
		}
	}
	
	return topVsStats;

	//Pie chart (Maybe doughtnut chart with multiple rings)
	//Maybe future implementation: https://chartjs-plugin-datalabels.netlify.app/samples/charts/doughnut.html
	//Pie chart for now
	//Some example code: https://stackoverflow.com/questions/52044013/chartjs-datalabels-show-percentage-value-in-pie-piece
}

const getCareerPiesQuery = async (playerId,mode) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const PlayerDataHeader = PlayerData.shift();
	PlayerData.shift();	//throwaway line
	
	const player = getPlayerQuery(null,null,playerId,'current');
	if (!player) {
		return null;
	}
	
	const seasonList = getSeasonListQuery();	//chronological
	
	//use PID and mode to filter matches
	let opponentPlayerIds = [];
	for (const s of seasonList) {
		const MatchesData = readDatabase(getSeasonDataPath(s) + "/Matches.txt");
		const MatchesDataHeader = MatchesData.shift();
		MatchesData.shift(); //throwaway row
		
		const PlayerIDsColIdx = getColNameIdx(MatchesDataHeader, ['PlayerIDs']);
		const ModeColIdx = getColNameIdx(MatchesDataHeader, ['Mode']);
		
		const filteredMatches = MatchesData.filter(
			(row) =>
				(row[ ModeColIdx ] === mode) &&
				row[ PlayerIDsColIdx ].split(",").includes(playerId)
		);
		
		for (const match of filteredMatches) {
			//deal with PIDs- add them to matchPlayers if not already there
			const playerIds = match[ PlayerIDsColIdx ].split(",");
			for (const p of playerIds) {
				if ((p === playerId) || (opponentPlayerIds.includes(p))) {	//skip the selected player
					continue;
				}
				opponentPlayerIds.push(p);	
			}
		}
	}

	let pieStats = [];
	for (const p of opponentPlayerIds) {
		const selPlayer = getPlayerQuery(null,null,p,'current');
		const vsStats = getCareerVersusStatsQuery(player,selPlayer,mode);
		
		pieStats.push({
			player: selPlayer,
			stats: vsStats.stats
		});
	}
		
	let topVsStats = {
		With: {
			wins: [],
			losses: []
		},
		Against: {
			wins: [],
			losses: []
		}
	};
	
	for (const t of Object.keys(topVsStats)) {
		for (const s of Object.keys(topVsStats[t])) {
			pieStats.sort(pieSortBy(t,s));
			for (let i = 0; i < 5; i++) {
				if ((i > (pieStats.length - 1)) || (pieStats[i].stats[t][s] === 0)) {
					break;
				}
				topVsStats[t][s].push(pieStats[i]);
			}
		}
	}
	
	return topVsStats;

	//Pie chart (Maybe doughtnut chart with multiple rings)
	//Maybe future implementation: https://chartjs-plugin-datalabels.netlify.app/samples/charts/doughnut.html
	//Pie chart for now
	//Some example code: https://stackoverflow.com/questions/52044013/chartjs-datalabels-show-percentage-value-in-pie-piece
}

const getSeasonSummaryQuery = async (season) => {
	//read database
	const currDataPath = getSeasonDataPath(season);
	//const currDataPath = getCurrentDataPath();
	//const PlayerData = readDatabase(currDataPath + "/Players.txt");
	const MatchData = readDatabase(currDataPath + "/Matches.txt");
	const MatchDataHeader = MatchData.shift();
	MatchData.shift(); //throwaway line
	
	/*
	if (MatchData.length === 0) {
		return null;
	}
	*/
	//let modeMatches = {};
	let matchCount = {total: 0};
	
	for (const m of cfg.modes) {
		const modeLowerCase = m.modeName.toLowerCase();
		//modeMatches[modeLowerCase] = MatchData.filter( row => row[ getColNameIdx(MatchDataHeader, ['Mode'])] === modeLowerCase);
		const modeMatches = MatchData.filter( row => row[ getColNameIdx(MatchDataHeader, ['Mode'])] === modeLowerCase);
		const numModeMatches = modeMatches.length;
		matchCount[modeLowerCase] = numModeMatches;
		matchCount.total += numModeMatches;
	}
	
	return matchCount;

	//following is not used for now
	//filter for players who have played matches
	const CasualPlayerData = PlayerData.filter(
		(row) => row[4] !== cfg.trueskill.casualInitTS.initialSigma.toString()
	); //filter all players who have not played a casual match
	const CasualRatings = getCol(CasualPlayerData, 3); //casual ratings col
	const TwosPlayerData = PlayerData.filter(
		(row) => row[6] !== cfg.trueskill.twosInitTS.initialSigma.toString()
	); //filter all players who have not played a twos match
	const TwosRatings = getCol(TwosPlayerData, 5); //twos ratings col
	const FoursPlayerData = PlayerData.filter(
		(row) => row[8] !== cfg.trueskill.foursInitTS.initialSigma.toString()
	); //filter all players who have not played a fours match
	const FoursRatings = getCol(FoursPlayerData, 7); //fours ratings col

	const x_vals = [
		850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950, 2050,
		2150, 2250, 2350,
	];
	let hist_data_casual = x_vals.map((k, i) => ({ x: k, y: 0 }));
	let hist_data_twos = x_vals.map((k, i) => ({ x: k, y: 0 }));
	let hist_data_fours = x_vals.map((k, i) => ({ x: k, y: 0 }));

	for (const rating of CasualRatings) {
		for (const [i, bin] of x_vals.entries()) {
			if (rating > bin - 50 && rating <= bin + 50) {
				hist_data_casual[i].y += 1;
			}
		}
	}

	for (const rating of TwosRatings) {
		for (const [i, bin] of x_vals.entries()) {
			if (rating > bin - 50 && rating <= bin + 50) {
				hist_data_twos[i].y += 1;
			}
		}
	}

	for (const rating of FoursRatings) {
		for (const [i, bin] of x_vals.entries()) {
			if (rating > bin - 50 && rating <= bin + 50) {
				hist_data_fours[i].y += 1;
			}
		}
	}

	const casual_counts = hist_data_casual.map((val) => val.y);
	const twos_counts = hist_data_twos.map((val) => val.y);
	const fours_counts = hist_data_fours.map((val) => val.y);

	//Charts
	const width = 1000;
	const height = 400;

	const barBackgroundColorCasual = Array(x_vals.length).fill(
		"rgba(255, 255, 0, 0.6)"
	);
	const barBorderColorCasual = Array(x_vals.length).fill(
		"rgba(255, 255, 0, 1)"
	);

	const barBackgroundColorTwos = Array(x_vals.length).fill(
		"rgba(0, 255, 255, 0.6)"
	);
	const barBorderColorTwos = Array(x_vals.length).fill("rgba(0, 255, 255, 1)");

	const barBackgroundColorFours = Array(x_vals.length).fill(
		"rgba(160, 32, 240, 0.6)"
	);
	const barBorderColorFours = Array(x_vals.length).fill(
		"rgba(160, 32, 240, 1)"
	);
	/*
	let CasualRatingCol = [];
	let TwosRatingCol = [];
	
	if (SelPlayerCasualRatingsData.length !== 0) {
		CasualRatingCol = getCol(SelPlayerCasualRatingsData,3);
		CasualRatingCol = CasualRatingCol.map(r => parseInt(r));
		CasualRatingCol.push(CasualRatingCol[(CasualRatingCol.length - 1)] + parseInt(SelPlayerCasualRatingsData[(CasualRatingCol.length - 1)][4])); //add latest rating to the array
	}
	if (SelPlayerTwosRatingsData.length !== 0) {
		TwosRatingCol = getCol(SelPlayerTwosRatingsData,3);
		TwosRatingCol = TwosRatingCol.map(r => parseInt(r));
		TwosRatingCol.push(TwosRatingCol[(TwosRatingCol.length - 1)] + parseInt(SelPlayerTwosRatingsData[(TwosRatingCol.length - 1)][4])); //add latest rating to the array
	}
	const xAxisLength = CasualRatingCol.length > TwosRatingCol.length ? (Math.ceil(CasualRatingCol.length/5)*5) : (Math.ceil(TwosRatingCol.length/5)*5);
	
	//console.log(Array.from({length: 6}, (x, i) => i*(xAxisLength/5)));
	*/

	const configuration = {
		type: "bar",
		data: {
			datasets: [
				{
					label: "Casual",
					data: hist_data_casual,
					backgroundColor: barBackgroundColorCasual,
					borderColor: barBorderColorCasual,
					//xAxisID: 'x',
					borderWidth: 3,
					categoryPercentage: 1,
					barPercentage: 1,
					//borderColor: 'yellow'
				},
				/*
			{
				label: 'Twos',
				data: hist_data_twos,
				backgroundColor: barBackgroundColorTwos,
				borderColor: barBorderColorTwos,
				//xAxisID: 'x',
				borderWidth: 3,
				barPercentage: 1.3,
				//borderColor: 'blue'
			},
			
			{
				label: 'Twos',
				data: TwosRatingCol,
				fill: false,
				pointRadius: 0,
				//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
				//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
				//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
				xAxisID: 'x',
				borderWidth: 6,
				borderColor: 'rgb(0,255,255,1)'
			}*/
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Season Casual Rating Distribution",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					display: false,
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					stacked: true,
					offset: false,
					min: 800,
					max: 2400,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
						autoSkip: false,
						maxRotation: 0,
						minRotation: 0,
					},
					grid: {
						offset: false,
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Count",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},

					//type: 'linear',
					display: true,
					ticks: {
						//callback: (label) => `${label}`,	//from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: Math.ceil(Math.max(...casual_counts, ...twos_counts) / 5),
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.4)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	const chartCallback = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
		ChartJS.defaults.font = "Arial";
	};
	const chartJSNodeCanvas = new ChartJSNodeCanvas({
		width,
		height,
		chartCallback,
	});
	chartJSNodeCanvas.registerFont("./fonts/Arial.ttf", { family: "Arial" });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);

	const configuration2 = {
		type: "bar",
		data: {
			datasets: [
				{
					/*
				label: 'Casual',
				data: hist_data_casual,
				backgroundColor: barBackgroundColorCasual,
				borderColor: barBorderColorCasual,
				//xAxisID: 'x',
				borderWidth: 3,
				barPercentage: 1.3,
				//borderColor: 'yellow'
			},
			
			{
			*/
					label: "Twos",
					data: hist_data_twos,
					backgroundColor: barBackgroundColorTwos,
					borderColor: barBorderColorTwos,
					//xAxisID: 'x',
					borderWidth: 3,
					categoryPercentage: 1,
					barPercentage: 1,
					//borderColor: 'blue'
				},
				/*
			{
				label: 'Twos',
				data: TwosRatingCol,
				fill: false,
				pointRadius: 0,
				//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
				//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
				//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
				xAxisID: 'x',
				borderWidth: 6,
				borderColor: 'rgb(0,255,255,1)'
			}*/
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Season Twos Rating Distribution",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					display: false,
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							//family: 'Arial',
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					stacked: true,
					offset: false,
					min: 800,
					max: 2400,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							//family: 'Arial',
							size: 20,
						},
						autoSkip: false,
						maxRotation: 0,
						minRotation: 0,
					},
					grid: {
						offset: false,
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Count",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},

					//type: 'linear',
					display: true,
					ticks: {
						//callback: (label) => `${label}`,	//from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: Math.ceil(Math.max(...casual_counts, ...twos_counts) / 5),
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.4)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	/*
	const chartCallback2 = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
	};
	*/
	//const chartJSNodeCanvas2 = new ChartJSNodeCanvas({ width, height, chartCallback });
	const buffer2 = await chartJSNodeCanvas.renderToBuffer(configuration2);

	const configuration3 = {
		type: "bar",
		data: {
			datasets: [
				{
					/*
				label: 'Casual',
				data: hist_data_casual,
				backgroundColor: barBackgroundColorCasual,
				borderColor: barBorderColorCasual,
				//xAxisID: 'x',
				borderWidth: 3,
				barPercentage: 1.3,
				//borderColor: 'yellow'
			},
			
			{
			*/
					label: "Fours",
					data: hist_data_fours,
					backgroundColor: barBackgroundColorFours,
					borderColor: barBorderColorFours,
					//xAxisID: 'x',
					borderWidth: 3,
					categoryPercentage: 1,
					barPercentage: 1,
					//borderColor: 'blue'
				},
				/*
			{
				label: 'Twos',
				data: TwosRatingCol,
				fill: false,
				pointRadius: 0,
				//pointRadius: [...Array(TwosRatingCol.length-1).fill(0), 7],
				//pointRotation: [...Array(TwosRatingCol.length-1).fill(0), 90],
				//pointStyle: [...Array(TwosRatingCol.length-1).fill('circle'), 'triangle'],
				xAxisID: 'x',
				borderWidth: 6,
				borderColor: 'rgb(0,255,255,1)'
			}*/
			],
		},
		options: {
			//locale: 'fr', // Uncomment this line for "wrong" options
			plugins: {
				title: {
					display: true,
					text: "RPUGs Season Fours Rating Distribution",
					color: "white", //change to white later
					font: {
						family: "Arial",
						size: 20,
					},
				},
				"background-color": {
					color: "rgba(0,0,0,0.9)", //temporarily white
					//color: 'rgba(255,255,255,0.9)'
				},
				legend: {
					display: false,
				},
			},
			layout: {
				padding: 20,
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Rating",
						color: "white",
						font: {
							//family: 'Arial',
							size: 20,
						},
					},
					id: "x",
					type: "linear",
					display: true,
					stacked: true,
					offset: false,
					min: 800,
					max: 2400,
					ticks: {
						callback: (label) => `${label}`, //from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: 100,
						color: "white",
						font: {
							//family: 'Arial',
							size: 20,
						},
						autoSkip: false,
						maxRotation: 0,
						minRotation: 0,
					},
					grid: {
						offset: false,
						borderDash: [4, 2],
						color: "rgb(192,192,192,0.8)",
					},
				},
				y: {
					title: {
						display: true,
						text: "Count",
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},

					//type: 'linear',
					display: true,
					ticks: {
						//callback: (label) => `${label}`,	//from here: https://stackoverflow.com/questions/20371867/chart-js-formatting-y-axis
						stepSize: Math.ceil(
							Math.max(...casual_counts, ...fours_counts) / 5
						),
						color: "white",
						font: {
							family: "Arial",
							size: 20,
						},
					},
					grid: {
						borderDash: [4, 2],
						color: "rgb(220,220,220,0.4)",
					},
				},
			},
		},
		plugins: [
			{
				id: "background-color",
				beforeDraw: (chart, args, options) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.fillStyle = ctx.fillStyle = options.color || "#99ffff";
					ctx.fillRect(0, 0, width, height);
					ctx.restore();
				},
			},
		],
	};

	/*
	const chartCallback2 = (ChartJS) => {
		ChartJS.defaults.responsive = true;
		ChartJS.defaults.maintainAspectRatio = false;
	};
	*/
	//const chartJSNodeCanvas2 = new ChartJSNodeCanvas({ width, height, chartCallback });
	const buffer3 = await chartJSNodeCanvas.renderToBuffer(configuration3);

	const combinedImgURL = await mergeImages(
		[
			{ src: buffer, x: 0, y: 0 },
			{ src: buffer2, x: 0, y: 400 },
			{ src: buffer3, x: 0, y: 800 },
		],
		{
			Canvas: Canvas,
			Image: Image,
			width: 1000,
			height: 1200,
		}
	);

	const combinedImg = Buffer.from(combinedImgURL.split(",")[1], "base64"); //from: https://stackoverflow.com/questions/11335460/how-do-i-parse-a-data-url-in-node

	return {
		Histogram: combinedImg,
	};
};

/**
 * Returns information for a League player from their assigned discsord ID
 * @param {String} username
 */
/*
const getLeaguePlayerFromDiscordIdQuery = async (ID) => {
	//read league list database
	const currDataPath = getCurrentDataPath();
	const LeagueListData = readDatabase(currDataPath + "/Modes/Scrims/leaguePlayerList.txt");

	const playerIdx = LeagueListData.map((x) => x[0]).indexOf(ID.toString());

	if (playerIdx === -1 || LeagueListData[playerIdx][3] !== "Free_Agent") {
		return null;
	}
	
	return new LeaguePlayer({
		discordId: ID,
		username: LeagueListData[playerIdx][1],
		league: LeagueListData[playerIdx][2],
		teamName: LeagueListData[playerIdx][3]
	});
};
*/
/**
 * Returns information for a Team from their assigned TeamName
 * @param {String} username
 */
/*
const getTeamFromTeamNameQuery = async (teamName) => {
	const currDataPath = getCurrentDataPath();
	const TeamData = readDatabase(currDataPath + "/Teams.txt");
	const TeamDataHeader = TeamData.shift();
	const LeagueListData = readDatabase(currDataPath + "/Modes/Scrims/leaguePlayerList.txt");
	const LeagueListDataHeader = LeagueListData.shift();
	
	const leagueListTeamNameColumnIdx = getColNameIdx(LeagueListDataHeader,['Team'])
	const teamPlayerList = LeagueListData.filter((x) => x[leagueListTeamNameColumnIdx] === teamName).map(
		(x) => new LeaguePlayer({	//eventually change this to registered players (so just playerId, discordId and username- add a function for getting the team using the playerId
			discordId: x[getColNameIdx(LeagueListDataHeader,['DiscordID'])],
			username: x[getColNameIdx(LeagueListDataHeader,['Username'])],
			league: x[getColNameIdx(LeagueListDataHeader,['League'])],
			teamName: x[leagueListTeamNameColumnIdx]
		})
	);
	
	const teamIdx = TeamData.map((x) => x[getColNameIdx(TeamDataHeader,['TeamName'])]).indexOf(teamName); //replaces spaces with underscores for teamName
	
	if (teamIdx === -1) {
		return null;
	}
	
	const inpTeamId = TeamData[teamIdx][getColNameIdx(TeamDataHeader,['ID'])];
	const teamStats = await getPlayerRatingStatsQuery(inpTeamId, 'scrims');
	
	return new LeagueTeam({
		teamId: inpTeamId,
		teamName: teamName,
		teamLeague: TeamData[teamIdx][getColNameIdx(TeamDataHeader,['League'])],
		teamRating: teamStats.rating,
		teamSigma: teamStats.sigma,
		teamWins: teamStats.wins,
		teamLosses: teamStats.losses,
		teamLastPlayed: teamStats.lastPlayed,
		players: teamPlayerList
	});
};
*/
/**
 * Returns information for a Player from their assigned Username
 * @param {Array.<Object>} players - Array of players to update their ratings
 */

const updatePlayerRatingsQuery = async (match, players, mode) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const currModeInfo = getModeInfo(mode);
	
	const ratingsFilePath = currDataPath + `/Modes/${currModeInfo.modeName}/Ratings.txt`;	//convert this to a function - getRatingsPath(season (default of current), mode)
	let RatingsFileStr = fs.readFileSync(ratingsFilePath, "utf8");
	
	let RatingsData = readDatabase(currDataPath + "/RatingChanges.txt");
	const RatingsDataHeader = RatingsData.shift();
	let lastRatingId = findMaxId("R", getCol(RatingsData, getColNameIdx(RatingsDataHeader, ['ID'])));
	let ratingUpdatesStr = "";

	for (const matchPlayer of players) {
		//update player database file
		//const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		const ratingStats = getPlayerRatingStatsQuery(matchPlayer.playerId,'current',mode);
		
		if (ratingStats) {
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: ratingStats.playerId,
					rating: matchPlayer.rating,
					sigma: matchPlayer.sigma,
					wins: ratingStats.wins,
					losses: ratingStats.losses,
					lastPlayed: match.time
				})
			);
		
			const searchStr = `${ratingStats.playerId}\t`;
			const re = new RegExp("^.*" + searchStr + ".*$", "gm");
			
			RatingsFileStr = RatingsFileStr.replace(re, updatedPlayerStr);
			
			lastRatingId += 1; 
		
			ratingUpdatesStr += '\n' + genRatingUpdateStr(
				new RatingUpdate({
					ratingId: makeIdStr("R",lastRatingId),
					matchId: match.matchId,
					playerId: ratingStats.playerId,
					oldRating: ratingStats.rating,
					ratingChange: matchPlayer.rating - ratingStats.rating,
					sigmaChange: matchPlayer.sigma - ratingStats.sigma,
					mode: mode
				})
			);
		}
		else {
			RatingsFileStr.replace(/(\n|\r)+$/, "");	//remove any trailing new lines or carriage returns
			
			const updatedPlayerStr = genModeRatingStr(
				new ModeRating({
					playerId: matchPlayer.playerId,
					rating: matchPlayer.rating,
					sigma: matchPlayer.sigma,
					wins: 0,
					losses: 0,
					lastPlayed: match.time
				})
			);
			
			RatingsFileStr += '\n' + updatedPlayerStr;
			
			//sort by player Id
			let RatingsFileStrRows = RatingsFileStr.split(/\r?\n/);
			const RatingsFileStrHeader = RatingsFileStrRows.shift();
			
			RatingsFileStrRows = RatingsFileStrRows.sort((a,b) => a.localeCompare(b, 'en', { numeric: true }));
			RatingsFileStr = RatingsFileStrHeader + '\n' + RatingsFileStrRows.join('\n');
			
			lastRatingId += 1; 
		
			ratingUpdatesStr += '\n' + genRatingUpdateStr(
				new RatingUpdate({
					ratingId: makeIdStr("R",lastRatingId),
					matchId: match.matchId,
					playerId: matchPlayer.playerId,
					oldRating: currModeInfo.trueskill.initialRating,
					ratingChange: matchPlayer.rating - currModeInfo.trueskill.initialRating,
					sigmaChange: matchPlayer.sigma - currModeInfo.trueskill.initialSigma,
					mode: mode
				})
			);
		}
	}
		
	try {
		fs.writeFileSync(ratingsFilePath, RatingsFileStr);
	}
	catch (e) {
		throw e;
	}

	//append new rating change to rating changes database
	try {
		fs.appendFileSync(currDataPath + "/RatingChanges.txt", ratingUpdatesStr);
		return true;
	}
	catch (e) {
		throw e;
	}
};

/*
const updateTeamRatingsQuery = async (match, teams) => {
	//read database
	const currDataPath = getCurrentDataPath();

	for (var matchTeam of teams) {
		//update player database file
		const team = await getTeamFromTeamNameQuery(matchTeam.teamName);
		var updatedTeamStr = `${team.teamID}\t${team.teamName}\t${team.teamLeague}\t${matchTeam.rating}\t${matchTeam.sigma}\t${team.teamWins}\t${team.teamLosses}\t${match.time}`;

		//find player and replace line with latest ratings
		try {
			const TeamData = fs.readFileSync(currDataPath + "/Teams.txt", "utf8");
			let searchString = `${team.teamID}\t${team.teamName}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = TeamData.replace(re, updatedTeamStr);
			fs.writeFileSync(currDataPath + "/Teams.txt", updatedData);
		} catch (e) {
			console.log(e);
		}

		//update rating changes file
		const RatingsData = readDatabase(currDataPath + "/RatingChanges.txt");
		const lastRatingID = findMaxId("R", getCol(RatingsData, 0).slice(1));
		var ratingUpdate = new RatingUpdate(
			lastRatingID + 1,
			match.matchID,
			team.teamID,
			team.teamRating,
			matchTeam.rating - team.teamRating,
			matchTeam.sigma - team.teamSigma,
			"scrims"
		);
		let posSign = "";
		if (ratingUpdate.ratingChange >= 0) {
			posSign = "+";
		}
		const newRatingChangeStr = `\nR${ratingUpdate.ratingID}\tM${ratingUpdate.matchID}\t${ratingUpdate.playerID}\t${ratingUpdate.oldRating}\t${posSign}${ratingUpdate.ratingChange}\t${ratingUpdate.sigmaChange}\t${ratingUpdate.mode}`;

		//append new rating change to rating changes database
		try {
			fs.appendFileSync(
				currDataPath + "/RatingChanges.txt",
				newRatingChangeStr
			);
		} catch (err) {
			throw err;
		}
	}
	return;
};
*/

const softResetDatabaseQuery = async () => {
	let datesDirs = getDirectories(dataPath);
	const currDataPath = getCurrentDataPath();
	
	const currDataPathTree = currDataPath.split('/');
	
	const currDataDir = currDataPathTree[currDataPathTree.length - 1];
	const prevDataDirPath = dataPath + currDataDir.replace(' (current)','');
	await fs.promises.rename(currDataPath, prevDataDirPath);	//remove " (current)" from current season folder
	
	const newDataDir = await initDatabase();
	if (!newDataDir) {
		return false;
	}
	
	await fs.promises.copyFile(prevDataDirPath + `/Players.txt`, dataPath + newDataDir + `/Players.txt`);
	await fs.promises.copyFile(prevDataDirPath + `/Teams.txt`, dataPath + newDataDir + `/Teams.txt`);
	await fs.promises.copyFile(prevDataDirPath + `/Modes/FeautedModesTrack.txt`, dataPath + newDataDir + `/Modes/FeautedModesTrack.txt`);
	await fs.promises.copyFile(prevDataDirPath + `/Modes/Scrims/leaguePlayerList.txt`, dataPath + newDataDir + `/Modes/Scrims/leaguePlayerList.txt`);
	await fs.promises.copyFile(prevDataDirPath + `/Modes/Select/selectList.txt`, dataPath + newDataDir + `/Modes/Select/selectList.txt`);
	
	/*
	//read database
	let PlayerData = readDatabase(currDataPath + '/Players.txt');
	PlayerData = PlayerData.slice(2);
	
	const resetPlayerData = PlayerData.map(
		(player) =>
			new Player(
				player[0],
				player[1],
				player[2],
				cfg.trueskill.casualInitTS.initialRating,
				cfg.trueskill.casualInitTS.initialSigma,
				cfg.trueskill.twosInitTS.initialRating,
				cfg.trueskill.twosInitTS.initialSigma,
				cfg.trueskill.foursInitTS.initialRating,
				cfg.trueskill.foursInitTS.initialSigma,
				0,
				0,
				0,
				0,
				0,
				0,
				"-",
				"-",
				"-"
			)
	);
	await fs.promises.copyFile(tempsPath + "Players.txt", currDataPath + "/Players.txt");

	for (const player of resetPlayerData) {
		const updatedPlayerStr = `\n${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;

		try {
			fs.appendFileSync(currDataPath+'/Players.txt', updatedPlayerStr);
			const PlayerFolder = `${player.playerID} ${player.username}/`;
			try {
				await fs.promises.mkdir(currDataPath + '/PlayerData/' + PlayerFolder, {recursive: true})
			}
			catch (err) {
				throw err;
			}
			for (const temp of temps) {
				if (!(temp == 'Players.txt')) {
					try {
						await fs.promises.copyFile(tempsPath+temp, currDataPath +'/PlayerData/' + PlayerFolder + temp);
					}
					catch (err) {
						throw err;
					}
				}
			}
		}
		catch (err) {
			throw err;
		}
	}
	*/
	return true;
};

const seasonRollQuery = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	
	let activePlayers = {};
	let totalMatchCount = 0;
	for (const m of cfg.modes) {
		if (m.excludeFromRoll) {
			continue;
		}
		const RatingsData = readDatabase(currDataPath + `/Modes/${m.modeName}/Ratings.txt`);
		const RatingsDataHeader = RatingsData.shift(); //first line
		RatingsData.shift(); //throwaway line
		
		for (const playerData of RatingsData) {
			const playerId = playerData[ getColNameIdx(RatingsDataHeader, ['ID']) ];
			const playerMatchCount = parseInt(playerData[ getColNameIdx(RatingsDataHeader, ['NumMatchesWon']) ]) + parseInt(playerData[ getColNameIdx(RatingsDataHeader, ['NumMatchesLost']) ]);
			totalMatchCount += playerMatchCount / m.numPlayers;
			
			if (playerId in activePlayers) {
				activePlayers[playerId] += playerMatchCount;
			}
			else {
				activePlayers[playerId] = playerMatchCount;
			}
		}
	}
	
	if (totalMatchCount < 100) {
		return 'MatchRequirement';
	}
	
	const numActivePlayers = Object.keys(activePlayers).length; //return this result

	if (numActivePlayers === 0) {
		return null;
	}

	/*
	Game requirements table (3 months):
	0: 1 - 9 = 2%
	1: 10 - 19 = 13%
	2: 20 - 49 = 25%
	3: 50+ = 60%
	*/
	const matchBrackets = {
		1: {
			min: 1,
			max: 9,
		},
		5: {
			min: 10,
			max: 19,
		},
		10: {
			min: 20,
			max: 49,
		},
		20: {
			min: 50,
			max: 99
		},
		25: {
			min: 100,
			max: 199
		},
		40: {
			min: 200
		}
	};

	let drawWinnerPlayerId;
	let count = 0;
	let raffle_entries = [];
	let raffle_size = 0;
	
	while (!drawWinnerPlayerId) {
		count += 1;
		for (const [playerId,numMatches] of Object.entries(activePlayers)) {
			for (const [pts,b] of Object.entries(matchBrackets)) {
				if ((numMatches >= b.min) && (b.max) && (numMatches <= b.max)) {	//not match bracket 3
					raffle_entries.push({
						player: playerId,
						numMatches: numMatches,
						tickets: parseInt(pts)
					});
					raffle_size += parseInt(pts);
					break;
				}
				else if ((numMatches >= b.min) && (!b.max)) {
					raffle_entries.push({
						player: playerId,
						numMatches: numMatches,
						tickets: parseInt(pts)
					});
					raffle_size += parseInt(pts);
					break;
				}
			}
		}

		const raffle_pmf = raffle_entries.map(e => e.tickets/raffle_size);
		const raffle_cdf = raffle_pmf.map((sum => value => sum += value)(0));
		
		const selNum = Math.random();
		
		const winnerIdx = raffle_cdf.findIndex(el => selNum <= el);
		
		drawWinnerPlayerId = raffle_entries[winnerIdx].player;
	}
	
	const drawWinner = getPlayerQuery(null,null,drawWinnerPlayerId,null)
	/*	Group-based draw system- retired
	while (!drawWinner) {
		const groupRoll = Math.random();
		const groupNum =
			groupRoll < 0.02 ? 0 : groupRoll < 0.15 ? 1 : groupRoll < 0.4 ? 2 : 3;
		//const selPlayers = activePlayers.filter(row => (parseInt(row[7]) + parseInt(row[8]) + parseInt(row[9]) + parseInt(row[10])));
		let selPlayers = [];
		for (const p of activePlayers) {
			const pMatches =
				parseInt(p[9]) +
				parseInt(p[10]) +
				parseInt(p[11]) +
				parseInt(p[12]) +
				parseInt(p[13]) +
				parseInt(p[14]);
			if (pMatches >= matchBrackets[groupNum].min) {
				if (matchBrackets[groupNum].max) {
					//not matchBracket 3
					if (pMatches <= matchBrackets[groupNum].max) {
						selPlayers.push(p);
					}
				} else {
					selPlayers.push(p);
				}
			}
		}

		drawWinner = selPlayers[Math.floor(Math.random() * selPlayers.length)];
	}
	*/
	/*
	drawWinner = new Player(
		drawWinner[0],
		drawWinner[1],
		drawWinner[2],
		parseInt(drawWinner[3]),
		parseFloat(drawWinner[4]),
		parseInt(drawWinner[5]),
		parseFloat(drawWinner[6]),
		parseInt(drawWinner[7]),
		parseFloat(drawWinner[8]),
		parseInt(drawWinner[9]),
		parseInt(drawWinner[10]),
		parseInt(drawWinner[11]),
		parseInt(drawWinner[12]),
		parseInt(drawWinner[13]),
		parseInt(drawWinner[14]),
		drawWinner[15],
		drawWinner[16],
		drawWinner[17]
	);
	*/
	
	fs.writeFileSync(currDataPath + "/SeasonRollList.txt", JSON.stringify(raffle_entries));
	
	return {
		PoolSize: numActivePlayers,
		RaffleSize: raffle_size,
		Winner: drawWinner,
	};
};

async function importGSheet(spread_link,sht_name) {
	const doc = new GoogleSpreadsheet(spread_link);

	const creds = require("../../creds.json");
	await doc.useServiceAccountAuth(creds);
	await doc.loadInfo();

	return doc.sheetsByTitle[sht_name];
}

async function writeLeagueList() {
	const currDataPath = getCurrentDataPath();

	const sheet = await importGSheet(cfg.rpugsSheet.linkID,cfg.rpugsSheet.sheetNames.leaguePlayers);

	const rows = await sheet.getRows();
	//const pro_im_Players = rows.filter(player => (((player.League == 'Pro') || (player.League == 'Intermediate')) && (player.Team != 'Free Agent')));
	//const imPlayers = rows.filter(player => player.League == 'Pro');
	//const imPlayers = rows.filter(player => player.League == 'Intermediate');

	let leagueListData = "DiscordID\tUsername\tLeague\tTeam";

	for (const player of rows) {
		leagueListData += `\n${player["Discord ID"]}\t${sanitize(
			player["Primary Username"]
		)}\t${player["League"]}\t${player["Team"].replace(/\s+/g, "_")}`;
	}

	fs.writeFileSync(currDataPath + "/Modes/Scrims/leaguePlayerList.txt", leagueListData);

	await refreshTeamsList();

	return;
}

async function refreshTeamsList() {
	const currDataPath = getCurrentDataPath();
	const LeagueListData = readDatabase(currDataPath + "/Modes/Scrims/leaguePlayerList.txt");
	const LeagueListDataHeader = LeagueListData.shift();
	const TeamData = readDatabase(currDataPath + "/Teams.txt");
	const TeamDataHeader = TeamData.shift();

	const TeamsDataPath = currDataPath + '/Teams.txt';
	let TeamsFileStr = fs.readFileSync(TeamsDataPath, "utf8");
	
	const TeamColIdx = getColNameIdx(LeagueListDataHeader, ['Team']);

	let leagueTeams = [];
	for (const player of LeagueListData) {
		let leagueListTeamNames = leagueTeams.map((x) => x.teamName.toLowerCase());
		const currTeamName = player[TeamColIdx].toLowerCase();
		if ((!leagueListTeamNames.includes(currTeamName)) && (currTeamName !== "Free_Agent".toLowerCase())) {
			leagueTeams.push({
				teamName: player[TeamColIdx],
				teamLeague: player[getColNameIdx(LeagueListDataHeader, ['League'])],
			});
		}
	}
	//const dtbTeamNames = getCol(TeamData, getColNameIdx(TeamDataHeader, ['TeamName']));
	for (const team of TeamData) {
		const teamInfo = {
			teamId: team[getColNameIdx(TeamDataHeader, ['ID'])],
			teamName: team[getColNameIdx(TeamDataHeader, ['TeamName'])],
			teamLeague: team[getColNameIdx(TeamDataHeader, ['League'])],
			players: team[getColNameIdx(TeamDataHeader, ['Players'])],
		};
		
		const teamNameList = leagueTeams.map((x) => x.teamName);
		
		if (!teamNameList.includes(teamInfo.teamName)) {
			const updatedTeamStr = genTeamStr(
				new Team({
					teamId: teamInfo.teamId,
					teamName: teamInfo.teamName,
					league: teamInfo.teamLeague,
					players: '',
				})
			);
			
			let searchStr = `${teamInfo.teamId}\t${teamInfo.teamName}\t${teamInfo.teamLeague}\t`;
			let re = new RegExp("^.*" + searchStr + ".*$", "gm");
			TeamsFileStr = TeamsFileStr.replace(re, updatedTeamStr);
		}
	}
	const lastTeamID = findMaxId("T", getCol(TeamData, getColNameIdx(TeamDataHeader, ['ID'])));
	
	let counter = 0;
	for (const team of leagueTeams) {
		//const leagueListTeamNameColumnIdx = getColNameIdx(LeagueListDataHeader,['Team'])
		const teamPlayerList = LeagueListData.filter((x) => x[TeamColIdx] === team.teamName).map((x) => x[getColNameIdx(LeagueListDataHeader,['DiscordID'])]);	//must use discord IDs instead of player IDs because players on the team may not be registered in RPUGs- using PIDs would unnecessary complexity to the process
		
		if (!getCol(TeamData, getColNameIdx(TeamDataHeader, ['TeamName'])).includes(team.teamName)) {
			counter += 1;

			TeamsFileStr += '\n' + genTeamStr(
				new Team({
					teamId: makeIdStr('T',lastTeamID + counter),
					teamName: team.teamName,
					league: team.teamLeague,
					players: teamPlayerList.join(','),
				})
			);
		}
		else {
			const teamInfo = getTeamFromTeamNameQuery(team.teamName);
			
			const updatedTeamStr = genTeamStr(
				new Team({
					teamId: teamInfo.teamId,
					teamName: teamInfo.teamName,
					league: team.teamLeague,
					players: teamPlayerList.join(','),
				})
			);
			
			let searchStr = `${teamInfo.teamId}\t${teamInfo.teamName}\t${teamInfo.league}\t`;
			let re = new RegExp("^.*" + searchStr + ".*$", "gm");
			TeamsFileStr = TeamsFileStr.replace(re, updatedTeamStr);
		}
	}
	
	try {
		fs.writeFileSync(TeamsDataPath, TeamsFileStr);
	}
	catch (err) {
		throw err;
	}
	
	/*
	if (newTeamStr !== "") {
		try {
			fs.appendFileSync(currDataPath + "/Teams.txt", newTeamStr);
		}
		catch (err) {
			throw err;
		}
	}
	*/

	return;
}

async function writeSelectList() {
	const currDataPath = getCurrentDataPath();

	const sheet = await importGSheet(cfg.rpugsSheet.linkID,cfg.rpugsSheet.sheetNames.selectList);
	const rows = await sheet.getRows();

	let selectListData = "DiscordID\tUsername";

	for (const player of rows) {
		selectListData += `\n${player["Discord ID"]}\t${sanitize(
			player["Username"]
		)}`;
	}

	fs.writeFileSync(currDataPath + "/Modes/Select/selectList.txt", selectListData);

	return;
}

async function isPlayerInSelectGamemodeQuery(discordId) {
	//read database
	const currDataPath = getCurrentDataPath();
	const SelectListData = readDatabase(currDataPath + "/Modes/Select/selectList.txt");
	const SelectListDataHeader = SelectListData.shift();
	const SelectListDiscordIds = getCol(SelectListData,getColNameIdx(SelectListDataHeader,['DiscordID']));
	
	return SelectListDiscordIds.includes(discordId);
}

function getTeamFromTeamNameQuery(teamname) {
	//read database
	const currDataPath = getCurrentDataPath();
	const TeamData = readDatabase(currDataPath + "/Teams.txt");
	const TeamDataHeader = TeamData.shift();
	TeamData.shift(); //throwaway line
	
	const teamIdx = TeamData.map((x) => stripUsername(x[ getColNameIdx(TeamDataHeader, ['TeamName']) ]).toLowerCase()).indexOf(stripUsername(teamname.toString()).toLowerCase());
	
	if (teamIdx === -1) {
		return null;
	}
	
	return new Team({
		teamId: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['ID']) ],
		teamName: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['TeamName']) ],
		league: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['League']) ],
		players: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['Players']) ].split(','),
	});
}

function isLeaguePlayer(discordId) {
	const currDataPath = getCurrentDataPath();
	const LeagueListData = readDatabase(currDataPath + "/Modes/Scrims/leaguePlayerList.txt");
	const LeagueListDataHeader = LeagueListData.shift();
	
	const playerListIds = getCol(LeagueListData, 0);
	
	if (playerListIds.includes(discordId)) {
		return true;
	}
	
	return false;
}

function getTeamFromDiscordIdQuery(discordId) {
	//read database
	const currDataPath = getCurrentDataPath();
	const TeamData = readDatabase(currDataPath + "/Teams.txt");
	const TeamDataHeader = TeamData.shift();
	TeamData.shift(); //throwaway line
	
	const PlayerListColIdx = getColNameIdx(TeamDataHeader, ['Players']);
	const teamIdx = TeamData.findIndex((x) => x[ PlayerListColIdx ].split(',').includes(discordId));
	
	if (teamIdx === -1) {
		return null;
	}
	
	return new Team({
		teamId: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['ID']) ],
		teamName: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['TeamName']) ],
		league: TeamData[teamIdx][ getColNameIdx(TeamDataHeader, ['League']) ],
		players: TeamData[teamIdx][ PlayerListColIdx ].split(','),
	});
}

async function writeBanList() {
	const sheet = await importGSheet(cfg.rpugsSheet.linkID,cfg.rpugsSheet.sheetNames.banPlayers);

	const rows = (await sheet.getRows()).filter(
		(player) => player["Discord ID"] != "[used]"
	);
	let banListData = "";

	for (const player of rows) {
		banListData += `${player["Discord ID"]}\n`;
	}

	fs.writeFileSync("./Database/banned.txt", banListData);

	return;
}

async function writeTipList() {
	const sheet = await importGSheet(cfg.rpugsSheet.linkID,cfg.rpugsSheet.sheetNames.tipList);

	const rows = await sheet.getRows();
	let tipListData = "";

	for (const tip of rows) {
		tipListData += `${tip["Priority (1 - 50%, 2 - 35%, 3 - 15%)"]}\t${tip["Tip"]}\n`;
	}

	tipListData = tipListData.slice(0, -1);

	fs.writeFileSync("./Database/serverTips.txt", tipListData);

	return;
}

const all_cosmetics = ['shop.json', 'default.json', 'exclusive.json', 'seasonpass.json'];

async function updateCosmeticLibraryQuery(cosmetics,from_shop = false) {
	const firstCosmetic = Object.values(cosmetics)[0];
	
	if (from_shop) {
		return await updateShopCosmeticLibraryQuery(cosmetics);
	}
	else if (firstCosmetic.is_default) {
		return await updateNonShopCosmeticLibraryQuery(cosmetics,'default.json');
	}
	else if (firstCosmetic.season) {
		return await updateNonShopCosmeticLibraryQuery(cosmetics,'seasonpass.json');
	}
	else if (firstCosmetic.rarity_name === 'Exclusive') {
		return await updateNonShopCosmeticLibraryQuery(cosmetics,'exclusive.json');
	}
}

async function updateShopCosmeticLibraryQuery(cosmetics) {
	const cosmetic_dtb_path = databasePath + '/cosmetics/shop.json';
	let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	/*
	const tempdatapath = databasePath + '/cosmetics/cosmetic_log.txt';
	let cos_log = JSON.parse(fs.readFileSync(tempdatapath).toString());
	cosmetics = {};
	for (const cos of cos_log.cosmetics) {
		cosmetics[cos.key] = cos;
	}
	*/
	//cosmetics = {};
	
	for (const cos_info of Object.values(cosmetics)) {
		const cos_type = cos_info.type;
		const cos_key = cos_info.key;
		
		delete cos_info.start_time;
		delete cos_info.seconds_remaining;
		delete cos_info.active;
		delete cos_info.shop_type;
		
		if (!cosmetic_dtb[cos_type]) {
			cosmetic_dtb[cos_type] = {};
		}
		
		if (!cosmetic_dtb[cos_type][cos_key]) {
			cosmetic_dtb[cos_type][cos_key] = {}
		}
		
		let cos_days_seen = cosmetic_dtb[cos_type][cos_key].days_seen;
		
		if (!cos_days_seen) {
			cos_days_seen = [];
		}
		
		if ((cos_info.last_seen) && (!cos_days_seen.includes(cos_info.last_seen))) {
			cos_days_seen.push(cos_info.last_seen);
			if (cos_days_seen.length > 10) {
				cos_days_seen.shift();
			}
		}
		delete cos_info.last_seen;
		if ((cos_info.end_time) && (!cos_days_seen.includes(cos_info.end_time))) {
			cos_days_seen.push(cos_info.end_time);
		}
		delete cos_info.end_time;
		cos_info.days_seen = cos_days_seen;
		
		cos_info.is_default = false;
		cos_info.appears_in_shop  = true;
		
		cosmetic_dtb[cos_type][cos_key] = cos_info;
	}
	
	/*
	let ordered_dtb = cosmetic_dtb;
	
	//sort by type
	ordered_dtb = Object.keys(cosmetic_dtb).sort().reduce(
		(obj, key) => { 
			obj[key] = cosmetic_dtb[key]; 
			return obj;
			}, 
		{}
		);
	
	//sort by cosmetic key names inside each type
	for (const ctype of Object.keys(ordered_dtb)) {
		ordered_dtb[ctype] = Object.keys(cosmetic_dtb[ctype]).sort().reduce(
			(obj, key) => { 
				obj[key] = cosmetic_dtb[ctype][key]; 
				return obj;
				}, 
			{}
			);
	}
	*/
	const ordered_dtb = sortCosmeticDtb(cosmetic_dtb);
	fs.writeFileSync(cosmetic_dtb_path, JSON.stringify(ordered_dtb));
	
	return;
}

async function updateNonShopCosmeticLibraryQuery(cosmetics,file) {
	const cosmetic_dtb_path = databasePath + `/cosmetics/${file}`;
	let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	for (const cos_info of Object.values(cosmetics)) {
		cosmetic_dtb[cos_info.type][cos_info.key] = cos_info;
	}
	
	const ordered_dtb = sortCosmeticDtb(cosmetic_dtb);
	fs.writeFileSync(cosmetic_dtb_path, JSON.stringify(ordered_dtb));
	
	return;
}

function sortCosmeticDtb(dtb) {
	let ordered_dtb = dtb;
	
	//sort by type
	ordered_dtb = Object.keys(dtb).sort().reduce(
		(obj, key) => { 
			obj[key] = dtb[key]; 
			return obj;
			}, 
		{}
		);
	
	//sort by cosmetic key names inside each type
	for (const ctype of Object.keys(ordered_dtb)) {
		ordered_dtb[ctype] = Object.keys(dtb[ctype]).sort().reduce(
			(obj, key) => { 
				obj[key] = dtb[ctype][key]; 
				return obj;
				}, 
			{}
			);
	}
	
	return ordered_dtb;
}

async function getCosmeticInfoQuery(costype,keyname) {
	//const cosmetic_dtb_path = databasePath + '/cosmetics/shop.json';
	//let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	const cosmetic_dtb = await getCosmeticLibraryQuery();
	
	return cosmetic_dtb[costype][keyname];
}

async function getCosmeticLibraryQuery() {
	let cosmetic_dtb = {};
	
	for (const cos_file of all_cosmetics) {
		const cosmetic_data_path = databasePath + `/cosmetics/${cos_file}`;
		const cosmetic_data = JSON.parse(fs.readFileSync(cosmetic_data_path).toString());
		
		for (const cos_type of Object.keys(cosmetic_data)) {
			if (!(cos_type in cosmetic_dtb)) {
				cosmetic_dtb[cos_type] = {};
			}
			cosmetic_dtb[cos_type] = {...cosmetic_dtb[cos_type], ...cosmetic_data[cos_type]};
		}
	}
	
	const ordered_dtb = sortCosmeticDtb(cosmetic_dtb);
	return ordered_dtb;
}

async function getCosmeticNotificationsQuery() {
	const cosmetic_dtb_path = databasePath + '/user_settings/cosmetic_notifications.json';
	let cosmetic_notif_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	return cosmetic_notif_dtb;
}

async function updateCosmeticNotificationsQuery(dtb) {
	const cosmetic_dtb_path = databasePath + '/user_settings/cosmetic_notifications.json';
	fs.writeFileSync(cosmetic_dtb_path, JSON.stringify(dtb));
	
	return;
}
/*
async function getCosmeticLibraryQuery() {
	const cosmetic_dtb_path = databasePath + '/cosmetics/shop.json';
	let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	return cosmetic_dtb;
}
*/
async function refreshCosmeticDtb() {
	//await refreshShopCosmetics();
	await refreshExclusiveDefaultCosmetics();
	await refreshSeasonPassCosmetics();
}

//temp Function
async function refreshShopCosmetics() {
	const cosmetic_dtb_path = databasePath + '/cosmetics/shop.json';
	let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	for (const cos_type of Object.keys(cosmetic_dtb)) {
		const cos_list = cosmetic_dtb[cos_type];
		for (const cos_key of Object.keys(cos_list)) {
			const curr_cos = cosmetic_dtb[cos_type][cos_key];
			curr_cos.is_default = false;
			curr_cos.appears_in_shop = true;
		}
	}
	
	const ordered_dtb = sortCosmeticDtb(cosmetic_dtb);
	fs.writeFileSync(cosmetic_dtb_path, JSON.stringify(ordered_dtb));
}

async function refreshExclusiveDefaultCosmetics() {
	//improve this code
	//have an object to specify filenames, and cosmetic object structure (including season pass)
	
	const excl_cosmetic_dtb_path = databasePath + '/cosmetics/exclusive.json';
	let excl_cosmetic_dtb = JSON.parse(fs.readFileSync(excl_cosmetic_dtb_path).toString());
	
	const def_cosmetic_dtb_path = databasePath + '/cosmetics/default.json';
	let def_cosmetic_dtb = JSON.parse(fs.readFileSync(def_cosmetic_dtb_path).toString());
	
	const sheet = await importGSheet(cfg.cosmeticsSheet.linkID,cfg.cosmeticsSheet.sheetNames.exclusiveDefaultList);
	const rows = await sheet.getRows();
	
	for (const cosmetic of rows) {
		const cos_type = cosmetic["Type Keyname"];
		const cos_key = cosmetic["Key"];
		
		if (!cos_type) {
			continue;
		}
		
		const contains_variants = cosmetic["Has variants"] === "TRUE";
		
		if (cosmetic["Rarity"] === "Common") {
			if (!def_cosmetic_dtb[cos_type]) {
				def_cosmetic_dtb[cos_type] = {};
			}
			/*
			let preview_status = false;
			if (def_cosmetic_dtb[cos_type][cos_key]) {
				preview_status = def_cosmetic_dtb[cos_type][cos_key].preview_exists;
			}
			*/
			const cos_entry = def_cosmetic_dtb[cos_type][cos_key];
			
			const preview_status = cos_entry ? cos_entry.preview_exists : false;
			
			let cos_obj = {
				"name": cosmetic["Name"],
				"type": cos_type,
				"key": cos_key,
				"description": cosmetic["Description"],
				"rarity_name": "Common",
				"rarity_color": "#2D4F67",
				"rarity_rank": 5,
				"has_variants": contains_variants,
				"preview_exists": preview_status,
				"lazp_preview_exists": false,
				"appears_in_shop": false,
				"is_default": true,
			}
			
			if (contains_variants) {
				cos_obj.variant_preview_exists = cos_entry ? cos_entry.variant_preview_exists : false;
			}
			
			def_cosmetic_dtb[cos_type][cos_key] = cos_obj;
			
			const ordered_dtb = sortCosmeticDtb(def_cosmetic_dtb);
			fs.writeFileSync(def_cosmetic_dtb_path, JSON.stringify(ordered_dtb));
		}
		else {	//exclusive
			if (!excl_cosmetic_dtb[cos_type]) {
				excl_cosmetic_dtb[cos_type] = {};
			}
			
			const cos_entry = excl_cosmetic_dtb[cos_type][cos_key];
			
			const preview_status = cos_entry ? cos_entry.preview_exists : false;
		
			let cos_obj = {
				"name": cosmetic["Name"],
				"type": cos_type,
				"key": cos_key,
				"description": cosmetic["Description"],
				"extra_info": cosmetic["Additional Information"],
				"rarity_name": "Exclusive",
				"rarity_color": "#800080",
				"rarity_rank": 0,
				"has_variants": contains_variants,
				"preview_exists": preview_status,
				"lazp_preview_exists": false,
				"appears_in_shop": false,
				"is_default": false,
			}
			
			if (contains_variants) {
				cos_obj.variant_preview_exists = cos_entry ? cos_entry.variant_preview_exists : false;
			}
			
			excl_cosmetic_dtb[cos_type][cos_key] = cos_obj;
			
			const ordered_dtb = sortCosmeticDtb(excl_cosmetic_dtb);
			fs.writeFileSync(excl_cosmetic_dtb_path, JSON.stringify(ordered_dtb));
		}
	}
}

async function refreshSeasonPassCosmetics() {
	const cosmetic_dtb_path = databasePath + '/cosmetics/seasonpass.json';
	let cosmetic_dtb = JSON.parse(fs.readFileSync(cosmetic_dtb_path).toString());
	
	const sheet = await importGSheet(cfg.cosmeticsSheet.linkID,cfg.cosmeticsSheet.sheetNames.seasonPassList);
	const rows = await sheet.getRows();
	
	const rarityColorMap = {
		1: "#FECD4A",
		2: "#D976E8",
		3: "#3BCAFF",
		4: "#88C763",
		5: "#2D4F67",
	};
	
	for (const cosmetic of rows) {
		const cos_type = cosmetic["Type Keyname"];
		const cos_key = cosmetic["Key"];
		
		if (!cos_type) {
			continue;
		}
		if (!cosmetic_dtb[cos_type]) {
			cosmetic_dtb[cos_type] = {};
		}
		
		const contains_variants = cosmetic["Has variants"] === "TRUE";
		const cos_rarity_rank = cosmetic["Rarity Rank"];
		const cos_rarity_color = rarityColorMap[cos_rarity_rank];
		
		const cos_entry = cosmetic_dtb[cos_type][cos_key];
			
		const preview_status = cos_entry ? cos_entry.preview_exists : false;
		
		let cos_obj = {
			"name": cosmetic["Name"],
            "type": cos_type,
            "key": cos_key,
            "description": cosmetic["Description"],
            "rarity_name": cosmetic["Rarity"],
            "rarity_color": cos_rarity_color,
            "rarity_rank": cos_rarity_rank,
            "has_variants": contains_variants,
            "preview_exists": preview_status,
            "lazp_preview_exists": false,
			"appears_in_shop": false,
			"is_default": false,
			"season": cosmetic["Season"],
			"obtained_at_tier": cosmetic["Tier"],
			"track": cosmetic["Track"]
		}
		
		if (contains_variants) {
			cos_obj.variant_preview_exists = cos_entry ? cos_entry.variant_preview_exists : false;
		}
		
		cosmetic_dtb[cos_type][cos_key] = cos_obj;
	}
	
	const ordered_dtb = sortCosmeticDtb(cosmetic_dtb);
	fs.writeFileSync(cosmetic_dtb_path, JSON.stringify(ordered_dtb));
}

export {
	getModeInfo,
	getFeaturedModeQuery,
	getSeasonModesQuery,
	getSeasonListQuery,
	queryPlayerList,
	queryPlayerIdMap,
	queryTeamIdMap,
	genPlayerListQuery,
	//genNewDataStruct,
	//seasonRecoveryRegistrations,
	//seasonRecoveryMatches,
	queryModeRatings,
	createPlayer,
	getPlayerRatingStatsQuery,
	genNewPlayerRatingStatsQuery,
	getPlayerQuery,
	getPlayerRatingChangeStatsQuery,
	getPlayerCareerFromDiscordIdQuery,
	getPlayerCareerFromUsernameQuery,
	getVersusStatsQuery,
	getPiesQuery,
	//getVersusCareerInfo,
	getSeasonSummaryQuery,
	createMatchQuery,
	recordMatchQuery,
	updatePlayerRatingsQuery,
	revertMatchQuery,
	softResetDatabaseQuery,
	seasonRollQuery,
	writeLeagueList,
	writeBanList,
	writeTipList,
	isLeaguePlayer,
	getTeamFromDiscordIdQuery,
	writeSelectList,
	isPlayerInSelectGamemodeQuery,
	updateCosmeticLibraryQuery,
	getCosmeticInfoQuery,
	getCosmeticLibraryQuery,
	getCosmeticNotificationsQuery,
	updateCosmeticNotificationsQuery,
	refreshCosmeticDtb,
};
