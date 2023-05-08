/* ==========================================
*	Dependencies
/* ========================================== */

//import Bluebird from 'bluebird';
//import _ from 'lodash';
import cfg from '../../config.js';
import fs from 'fs';
import { min,max } from 'mathjs';
import stripUsername from '../utls/stripUsername.js';
import { getDirectories } from '../scripts/initDatabase.js';
import { GoogleSpreadsheet } from "google-spreadsheet";
import async from "async";
import Chart from 'chart.js/auto/auto.js';
import { cmdChannels } from '../index.js';
import mergeImages from 'merge-images';
import { Canvas, Image } from 'canvas';
import { ChartJSNodeCanvas, ChartCallback, CanvasRenderService } from 'chartjs-node-canvas';
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

const dataPath = "./Database/data/";
const tempsPath = "./Database/templates/";
const temps = ["Players.txt", "Matches.txt", "RatingChanges.txt"];

function Player(
	playerID,
	discordId,
	username,
	casualRating,
	casualSigma,
	twosRating,
	twosSigma,
	foursRating,
	foursSigma,
	NOMW,
	NOML,
	NPMW,
	NPML,
	NFMW,
	NFML,
	LPO,
	LPP,
	LPF
) {
	this.playerID = playerID;
	this.discordId = discordId;
	this.username = username;
	this.casualRating = casualRating;
	this.casualSigma = casualSigma;
	this.twosRating = twosRating;
	this.twosSigma = twosSigma;
	this.foursRating = foursRating;
	this.foursSigma = foursSigma;
	this.casualWins = NOMW;
	this.casualLosses = NOML;
	this.twosWins = NPMW;
	this.twosLosses = NPML;
	this.foursWins = NFMW;
	this.foursLosses = NFML;
	this.casualLastPlayed = LPO;
	this.twosLastPlayed = LPP;
	this.foursLastPlayed = LPF;
}

function LeaguePlayer(discordID, username, league, teamName) {
	this.discordID = discordID;
	this.username = username;
	this.league = league;
	this.teamName = teamName;
}

function LeagueTeam(
	teamID,
	teamName,
	teamLeague,
	teamRating,
	teamSigma,
	NTMW,
	NTML,
	TLP,
	players
) {
	this.teamID = teamID;
	this.teamName = teamName;
	this.teamLeague = teamLeague;
	this.teamRating = teamRating;
	this.teamSigma = teamSigma;
	this.teamWins = NTMW;
	this.teamLosses = NTML;
	this.teamLastPlayed = TLP;
	this.playerList = players;
}

function Match(matchID, time, playerIDs, winners, losers, mode) {
	this.matchID = matchID;
	this.time = time;
	this.playerIDs = playerIDs;
	this.winners = winners;
	this.losers = losers;
	this.mode = mode;
}

function RatingUpdate(
	ratingID,
	matchID,
	playerID,
	oldRating,
	ratingChange,
	sigmaChange,
	mode
) {
	this.ratingID = ratingID;
	this.matchID = matchID;
	this.playerID = playerID;
	this.oldRating = oldRating;
	this.ratingChange = ratingChange;
	this.sigmaChange = sigmaChange;
	this.mode = mode;
}

function getCol(arr, idx) {
	//get column with index idx
	return arr.map((x) => x[idx]);
	//console.log(PlayerData.map(x => x[1]).slice(1));
}

function findMaxID(identifier, arr) {
	//find the largest ID number in input array
	const arrInt = arr.map((x) => parseInt(x.replace(identifier, "")));
	return arrInt.reduce(function (a, b) {
		return Math.max(a, b);
	});
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

/* ==========================================
*	Functional Query Helpers
/* ========================================== */

/**
 * Queries the GraphQL Database to find existing entries
 * @param {String} node - Name of the node to query
 * @param {Array.<String>} properties - List of properties to query for
 */

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

/* ==========================================
*	Maps
/* ========================================== */

/**
 * A map is a way of getting X information when you only have Y information
 */
/*
const maps = {
		playerDiscordIdToId: {}
};
*/

/**
 * Fills up data for the specificed map from query response
 * @param {Object} response - GQL query response
 * @param {String} mapName - Name of the map to fill data
 * @param {String} propLeft - The name of the property in the response to be the key of the specified map object
 * @param {String} propRight - The name of the property in the reponse to be the value of the key
 */
/*
function setupMapFromResponse(response, mapName, propLeft, propRight) {
		for (const list of response) {
				for (const key in list) {
						if (list.hasOwnProperty(key)) {
								maps[mapName][list[key][propLeft]] = list[key][propRight];
						}
				}
		}
}

// Maps must be set up at the start for data consistency.
async function setupPlayersMap() {
		const result = await queryExisting('Player', ['discordId']);
		for (const obj of result) {
				maps.playerDiscordIdToId[obj.discordId] = obj.id;
		}
}
// This is an async IFFE that runs immediately
(async function () {
		await setupPlayersMap();
}());
*/

/* ==========================================
*	Queries
/* ========================================== */

function readDatabase(fileLoc) {
	try {
		var data = fs.readFileSync(fileLoc, "utf8");
		data = data.split("\n");
		data = data.map((line) => line.split("\t"));
	} catch (e) {
		console.log(e);
	}

	//implement check for any empty rows and remove from array

	return data;
}

/**
 * Adds a player to the database
 * @param {Object} player - A single player object
 */
async function createPlayer(player) {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const checkEnable = 1;

	if (getCol(PlayerData, 1).includes(player.discordId) && checkEnable) {
		throw { name: "DiscordIDExists", message: "Field name = discordId" };
	} else if (
		getCol(PlayerData, 2)
			.map((v) => stripUsername(v).toLowerCase())
			.includes(stripUsername(player.username).toLowerCase()) &&
		checkEnable
	) {
		const playerFound = await getPlayerFromUsernameQuery(player.username);
		throw {
			name: "UsernameExists",
			message: "Field name = username",
			registered_name: playerFound.username,
		};
	} else {
		const lastPlayerID = findMaxID("P", getCol(PlayerData, 0).slice(1));
		const newPlayerStr = `\nP${lastPlayerID+1}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t0\t0\t0\t0\t0\t0\t-\t-\t-`;

		//append new player to player database
		try {
			fs.appendFileSync(currDataPath + "/Players.txt", newPlayerStr);
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
		} catch (err) {
			throw err;
		}
	}
}

/**
 * Adds a match to the database
 * @param {Object} player - A single player object
 */

const createMatchQuery = async (mode) => {
	//getting current time in good format example
	let matchTime = new Date(); //UTC
	matchTime.setHours(matchTime.getHours() + 10); //AEST
	matchTime = matchTime.toISOString(); //Returns yyyy-mm-ddThh:mm:ss.xxxZ

	const currDataPath = getCurrentDataPath();
	const MatchData = readDatabase(currDataPath + "/Matches.txt");
	const currentMatchID = findMaxID("M", getCol(MatchData, 0).slice(1)) + 1;
	const currentMatch = new Match(currentMatchID, matchTime, {}, {}, {}, mode);
	const newMatchStr = `\nM${currentMatch.matchID}\t${currentMatch.time}\t-\t-\t-\t${currentMatch.mode}`;

	//append new match to match database
	try {
		fs.appendFileSync(currDataPath + "/Matches.txt", newMatchStr);
	} catch (err) {
		throw err;
	}

	return currentMatch;
};

const recordMatchQuery = async (match, winner, loser, ratingsChange, mode) => {
	if (mode === "scrims") {
		var updatedMatchStr = `M${match.matchID}\t${match.time}\t${winner.teamID},${loser.teamID}\t${winner.teamName}(${ratingsChange[winner.teamName].newRating - ratingsChange[winner.teamName].previousRating <=0? "": "+"}${ratingsChange[winner.teamName].newRating - ratingsChange[winner.teamName].previousRating})\t${loser.teamName}(${ratingsChange[loser.teamName].newRating - ratingsChange[loser.teamName].previousRating <=0? "": "+"}${ratingsChange[loser.teamName].newRating - ratingsChange[loser.teamName].previousRating})\t${mode}`;
	} else {
		var updatedMatchStr =
			`M${match.matchID}\t${match.time}\t${winner.map((p) => p.playerID).join()},${loser.map((p) => p.playerID).join()}\t` + winner.map((p) => `${p.username}(${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating <= 0? "": "+"}${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating})`).join() + `\t` + loser.map((p) => `${p.username}(${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating <= 0? "": "+"}${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating})`).join() + `\t${mode}`;
	}

	//find match and replace line with players, winner, loser and ratings
	try {
		const currDataPath = getCurrentDataPath();
		const MatchData = fs.readFileSync(currDataPath + "/Matches.txt", "utf8");
		let searchString = `M${match.matchID}\t${match.time}\t`;
		let re = new RegExp("^.*" + searchString + ".*$", "gm");
		let updatedData = MatchData.replace(re, updatedMatchStr);
		fs.writeFileSync(currDataPath + "/Matches.txt", updatedData);

		if (mode !== "scrims") {
			const winnersAndLosers = [...winner, ...loser];
			for (const player of winnersAndLosers) {
				const PlayerFolder = `${player.playerID} ${player.username}/`;
				try {
					fs.appendFileSync(
						currDataPath + "/PlayerData/" + PlayerFolder + "Matches.txt",
						`\n${updatedMatchStr}`
					);
				} catch (e) {
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
					*/
				}
			}
		}
	} catch (e) {
		console.log(e);
		return false;
	}

	try {
		if (mode === "scrims") {
			updateTeamMatches(winner, loser, mode);
		} else {
			updatePlayerMatches(winner, loser, mode);
		}
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

	for (var matchPlayer of winner) {
		//update player database file
		const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		if (mode == "casual") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
			//var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		} else if (mode == "twos") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins+1}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		} else if (mode == "fours") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins+1}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath + "/Players.txt", "utf8");
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath + "/Players.txt", updatedData);
		} catch (e) {
			console.log(e);
			return e;
		}
	}
	
	for (var matchPlayer of loser) {
		//update player database file
		const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		if (mode == "casual") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses+1}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed
				}`;
		} else if (mode == "twos") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses+1}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		} else if (mode == "fours") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses+1}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath + "/Players.txt", "utf8");
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath + "/Players.txt", updatedData);
		} catch (e) {
			console.log(e);
		}
	}

	return;
};

const updateTeamMatches = async (winner, loser, mode) => {
	//read database
	const currDataPath = getCurrentDataPath();

	//for (var matchTeam of winner) {

	//update player database file
	let team = await getTeamFromTeamNameQuery(winner.teamName);
	/*
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		else if (mode == 'twos') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins+1}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		*/
	var updatedTeamStr = `${team.teamID}\t${team.teamName}\t${team.teamLeague}\t${team.teamRating}\t${team.teamSigma}\t${team.teamWins + 1}\t${team.teamLosses}\t${team.teamLastPlayed}`;

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
	/*
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses+1}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		else if (mode == 'twos') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses+1}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		*/
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

/**
 * Returns information for a Player from their Discord ID
 * @param {String} discordId
 */

const getPlayerFromDiscordIdQuery = async (discordId) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString());

	if (playerIdx !== -1) {
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
	} else {
		return null;
	}
};

const getPlayerFromDiscordIdQueryMoreInfo = async (discordId) => {
	//had to make new function instead of above because getPlayerFromDiscordIdQuery() is used in more than one function

	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString());

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
	}
};

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
	let allCasualMatchRatings = []; //collection of all ratings over all seasons
	let allTwosMatchRatings = []; //collection of all ratings over all seasons
	let allFoursMatchRatings = []; //collection of all ratings over all seasons

	const datesDirs = getDirectories(dataPath);
	for (const dir of datesDirs) {
		const PlayerData = readDatabase(dataPath + dir + "/Players.txt");
		const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString());

		const RatingsData = readDatabase(dataPath + dir + "/RatingChanges.txt");

		if (playerIdx !== -1) {
			if (((PlayerData[0][4] === 'CasualSigma') || (PlayerData[0][4] === 'OpenSigma')) && (parseFloat(PlayerData[playerIdx][4]) !== cfg.trueskill.casualInitTS.initialSigma)) {	//checking to see if any matches played
				carCasualWins += parseInt(PlayerData[playerIdx][9]);
				carCasualLosses += parseInt(PlayerData[playerIdx][10]);
				carCasualEOSRatings.push(parseInt(PlayerData[playerIdx][3])); //EOS rating

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
					allCasualMatchRatings.push(...CasualRatingCol);
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
			if ((PlayerData[0][8] === 'FoursSigma') && (parseFloat(PlayerData[playerIdx][8]) !== cfg.trueskill.foursInitTS.initialSigma)) {	//checking to see if any matches played
				carFoursWins += parseInt(PlayerData[playerIdx][13]);
				carFoursLosses += parseInt(PlayerData[playerIdx][14]);
				
				carFoursEOSRatings.push(parseInt(PlayerData[playerIdx][7])); //EOS rating

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
					allFoursMatchRatings.push(...FoursRatingCol);
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
			//if (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma && parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma / 2) {
			if ((PlayerData[0][6] === 'TwosSigma') && (parseFloat(PlayerData[playerIdx][6]) !== cfg.trueskill.twosInitTS.initialSigma)) {
				carTwosWins += parseInt(PlayerData[playerIdx][11]);
				carTwosLosses += parseInt(PlayerData[playerIdx][12]);
				
				carTwosEOSRatings.push(parseInt(PlayerData[playerIdx][5]));

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
					allTwosMatchRatings.push(...TwosRatingCol);
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
			carCasualLosses ===
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
 * Returns information for a Player from their assigned Username
 * @param {String} username
 */

const getPlayerFromUsernameQuery = async (username) => {
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => stripUsername(x[2]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase());

	if (playerIdx !== -1) {
		return new Player(
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
};

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
	let allCasualMatchRatings = []; //collection of all ratings over all seasons
	let allTwosMatchRatings = []; //collection of all ratings over all seasons
	let allFoursMatchRatings = []; //collection of all ratings over all seasons

	const datesDirs = getDirectories(dataPath);
	for (const dir of datesDirs) {
		const PlayerData = readDatabase(dataPath + dir + "/Players.txt");
		const playerIdx = PlayerData.map((x) =>
			stripUsername(x[2]).toLowerCase()
		).indexOf(stripUsername(username.toString()).toLowerCase());

		const RatingsData = readDatabase(dataPath + dir + "/RatingChanges.txt");

		if (playerIdx !== -1) {
			carCasualWins += parseInt(PlayerData[playerIdx][9]);
			carCasualLosses += parseInt(PlayerData[playerIdx][10]);
			carTwosWins += parseInt(PlayerData[playerIdx][11]);
			carTwosLosses += parseInt(PlayerData[playerIdx][12]);
			carFoursWins += parseInt(PlayerData[playerIdx][13]);
			carFoursLosses += parseInt(PlayerData[playerIdx][14]);

			if (
				parseFloat(PlayerData[playerIdx][6]) !==
				cfg.trueskill.casualInitTS.initialSigma
			) {
				//checking to see if any matches played
				carCasualEOSRatings.push(parseInt(PlayerData[playerIdx][3])); //EOS rating

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
					allCasualMatchRatings.push(...CasualRatingCol);
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
			if (
				parseFloat(PlayerData[playerIdx][8]) !==
					cfg.trueskill.twosInitTS.initialSigma &&
				parseFloat(PlayerData[playerIdx][8]) !==
					cfg.trueskill.twosInitTS.initialSigma / 2
			) {
				carTwosEOSRatings.push(parseInt(PlayerData[playerIdx][5]));

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
					allTwosMatchRatings.push(...TwosRatingCol);
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
			if (
				parseFloat(PlayerData[playerIdx][10]) !==
					cfg.trueskill.foursInitTS.initialSigma &&
				parseFloat(PlayerData[playerIdx][10]) !==
					cfg.trueskill.foursInitTS.initialSigma / 2
			) {
				carFoursEOSRatings.push(parseInt(PlayerData[playerIdx][7]));

				const PlayerFoursRatingChanges = RatingsData.filter(
					(row) => row[2] === PlayerData[playerIdx][0] && row[6] === "fours"
				); //filter Ratings for selected player and fours mode
				const PlayerFoursRatingValues = PlayerFoursRatingChanges.map(
					(row) => parseInt(row[3]) + parseInt(row[4])
				);

				if (PlayerFoursRatingValues.length > 0) {
					carFoursMinMaxRatings.push(Math.min(...PlayerFoursRatingValues));
					carFoursMinMaxRatings.push(Math.max(...PlayerFoursRatingValues));

					let FoursRatingCol = getCol(PlayerFoursRatingChanges, 3);
					FourRatingCol = FoursRatingCol.map((r) => parseInt(r));
					FoursRatingCol.push(
						FoursRatingCol[FoursRatingCol.length - 1] +
							parseInt(PlayerFoursRatingChanges[FoursRatingCol.length - 1][4])
					); //add latest rating to the array
					allFoursMatchRatings.push(...FoursRatingCol);
				}

				//streak extrema
				const FoursRatingChangesCol = getCol(PlayerFoursRatingChanges, 4); //Rating Change column for fours RPUGs for selected player

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

const getVersusInfo = async (discordId, username) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString()); //player running the command
	const player2Idx = PlayerData.map((x) =>
		stripUsername(x[2]).toLowerCase()
	).indexOf(stripUsername(username.toString()).toLowerCase()); //player 2 for versus info

	let player1 = {};
	let player2 = {};
	if (playerIdx !== -1 && player2Idx !== -1) {
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
		player2 = new Player(
			PlayerData[player2Idx][0],
			PlayerData[player2Idx][1],
			PlayerData[player2Idx][2],
			parseInt(PlayerData[player2Idx][3]),
			parseFloat(PlayerData[player2Idx][4]),
			parseInt(PlayerData[player2Idx][5]),
			parseFloat(PlayerData[player2Idx][6]),
			parseInt(PlayerData[player2Idx][7]),
			parseFloat(PlayerData[player2Idx][8]),
			parseInt(PlayerData[player2Idx][9]),
			parseInt(PlayerData[player2Idx][10]),
			parseInt(PlayerData[player2Idx][11]),
			parseInt(PlayerData[player2Idx][12]),
			parseInt(PlayerData[player2Idx][13]),
			parseInt(PlayerData[player2Idx][14]),
			PlayerData[player2Idx][15],
			PlayerData[player2Idx][16],
			PlayerData[player2Idx][17]
		);
	} else {
		return null;
	}

	//use PIDs to filter matches
	const MatchesData = readDatabase(currDataPath + "/Matches.txt");

	const seasonVsData = MatchesData.filter(
		(row) =>
			row[2].split(",").includes(player1.playerID) &&
			row[2].split(",").includes(player2.playerID)
	);
	const seasonVsDataCasual = seasonVsData.filter((row) => row[5] === "casual");
	const seasonVsDataTwos = seasonVsData.filter((row) => row[5] === "twos");
	const seasonVsDataFours = seasonVsData.filter((row) => row[5] === "fours");

	//casual
	let withCWs = 0;
	let withCLs = 0;
	let againstCWs = 0;
	let againstCLs = 0;

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
	let withTWs = 0;
	let withTLs = 0;
	let againstTWs = 0;
	let againstTLs = 0;

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
	let withFWs = 0;
	let withFLs = 0;
	let againstFWs = 0;
	let againstFLs = 0;

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

const getVersusCareerInfo = async (discordId, username) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

	const playerIdx = PlayerData.map((x) => x[1]).indexOf(discordId.toString()); //player running the command
	const player2Idx = PlayerData.map((x) =>
		stripUsername(x[2]).toLowerCase()
	).indexOf(stripUsername(username.toString()).toLowerCase()); //player 2 for versus info

	let player1 = {};
	let player2 = {};
	if (playerIdx !== -1 && player2Idx !== -1) {
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
		player2 = new Player(
			PlayerData[player2Idx][0],
			PlayerData[player2Idx][1],
			PlayerData[player2Idx][2],
			parseInt(PlayerData[player2Idx][3]),
			parseFloat(PlayerData[player2Idx][4]),
			parseInt(PlayerData[player2Idx][5]),
			parseFloat(PlayerData[player2Idx][6]),
			parseInt(PlayerData[player2Idx][7]),
			parseFloat(PlayerData[player2Idx][8]),
			parseInt(PlayerData[player2Idx][9]),
			parseInt(PlayerData[player2Idx][10]),
			parseInt(PlayerData[player2Idx][11]),
			parseInt(PlayerData[player2Idx][12]),
			parseInt(PlayerData[player2Idx][13]),
			parseInt(PlayerData[player2Idx][14]),
			PlayerData[player2Idx][15],
			PlayerData[player2Idx][16],
			PlayerData[player2Idx][17]
		);
	} else {
		return null;
	}

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

/**
 * Returns summary statistics
 * @param {String} username
 */

const getPie = async (mode) => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

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

	//use PID and mode to filter matches
	const MatchesData = readDatabase(currDataPath + "/Matches.txt");
	const filteredMatches = MatchesData.filter(
		(row) => row[2].split(",").includes(player1.playerID) && row[5] === mode
	);

	//map the matches into the stats desired- wins with and against, losses with and against
	let matchPlayers = []; //{playerID, username, stats: {WinsWith,WinsAgainst,LossesWith,LossesAgainst}}
	for (const match of filteredMatches) {
		//deal with PIDs- add them to matchPlayers if not already there
		const playerIDs = match[2].split(",");
		for (const p of playerIDs) {
			if (p !== player1.playerID) {
				//check if player is already part of matchPlayers list, or else add
				let notFound = true;
				for (const mp of matchPlayers) {
					if (mp.playerID === p) {
						notFound = false;
						break;
					}
				}
				if (notFound) {
					const pIdx = PlayerData.map((x) => x[1]).indexOf(
						discordId.toString()
					); //player running the command
					matchPlayers.push({
						playerID: p,
						username: PlayerData[pIdx][2],
						stats: {
							WinsWith: 0,
							WinsAgainst: 0,
							LossesWith: 0,
							LossesAgainst: 0,
						},
					});
				}
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

const getSeasonSummary = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath + "/Players.txt");

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

const getLeaguePlayerFromDiscordIdQuery = async (ID) => {
	//read league list database
	const currDataPath = getCurrentDataPath();
	const LeagueListData = readDatabase(currDataPath + "/leaguePlayerList.txt");

	const playerIdx = LeagueListData.map((x) => x[0]).indexOf(ID.toString());

	if (playerIdx !== -1 && LeagueListData[playerIdx][3] !== "Free_Agent") {
		return new LeaguePlayer(
			ID,
			LeagueListData[playerIdx][1],
			LeagueListData[playerIdx][2],
			LeagueListData[playerIdx][3]
		);
	} else {
		return false;
	}
	/*
	if (getCol(LeagueListData,0).includes(ID)) {
		return true;
	}
	else {
		return false;
	}
	*/
};

/**
 * Returns information for a Team from their assigned TeamName
 * @param {String} username
 */

const getTeamFromTeamNameQuery = async (teamName) => {
	const currDataPath = getCurrentDataPath();
	const TeamData = readDatabase(currDataPath + "/Teams.txt");
	const LeagueListData = readDatabase(currDataPath + "/leaguePlayerList.txt");

	const teamPlayerList = LeagueListData.filter((x) => x[3] === teamName).map(
		(x) => new LeaguePlayer(x[0], x[1], x[2], x[3])
	);

	const teamIdx = TeamData.map((x) => x[1]).indexOf(teamName); //replaces spaces with underscores for teamName

	if (teamIdx !== -1) {
		return new LeagueTeam(
			TeamData[teamIdx][0],
			teamName,
			TeamData[teamIdx][2],
			parseInt(TeamData[teamIdx][3]),
			parseFloat(TeamData[teamIdx][4]),
			parseInt(TeamData[teamIdx][5]),
			parseInt(TeamData[teamIdx][6]),
			TeamData[teamIdx][7],
			teamPlayerList
		);
	} else {
		return null;
	}
};

/**
 * Returns information for a Player from their assigned Username
 * @param {Array.<Object>} players - Array of players to update their ratings
 */

const updatePlayerRatingsQuery = async (match, players, mode) => {
	//read database
	const currDataPath = getCurrentDataPath();

	for (var matchPlayer of players) {
		//update player database file
		const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		if (mode == "casual") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.twosRating}\t${player.twosSigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${match.time}\t${player.twosLastPlayed}\t${player.foursLastPlayed}`;
		} else if (mode == "twos") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.foursRating}\t${player.foursSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${match.time}\t${player.foursLastPlayed}`;
		} else if (mode == "fours") {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.foursWins}\t${player.foursLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}\t${match.time}`;
		}
		
		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath + "/Players.txt", "utf8");
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp("^.*" + searchString + ".*$", "gm");
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath + "/Players.txt", updatedData);
		} catch (e) {
			console.log(e);
		}

		//update rating changes file
		const RatingsData = readDatabase(currDataPath + "/RatingChanges.txt");
		const lastRatingID = findMaxID("R", getCol(RatingsData, 0).slice(1));
		if (mode === "casual") {
			var ratingUpdate = new RatingUpdate(
				lastRatingID + 1,
				match.matchID,
				player.playerID,
				player.casualRating,
				matchPlayer.rating - player.casualRating,
				matchPlayer.sigma - player.casualSigma,
				mode
			);
		} else if (mode === "twos") {
			var ratingUpdate = new RatingUpdate(
				lastRatingID + 1,
				match.matchID,
				player.playerID,
				player.twosRating,
				matchPlayer.rating - player.twosRating,
				matchPlayer.sigma - player.twosSigma,
				mode
			);
		} else if (mode === "fours") {
			var ratingUpdate = new RatingUpdate(
				lastRatingID + 1,
				match.matchID,
				player.playerID,
				player.foursRating,
				matchPlayer.rating - player.foursRating,
				matchPlayer.sigma - player.foursSigma,
				mode
			);
		}
		let posSign = "";
		if (ratingUpdate.ratingChange >= 0) {
			posSign = "+";
		}
		const newRatingChangeStr = `\nR${ratingUpdate.ratingID}\tM${ratingUpdate.matchID}\t${ratingUpdate.playerID}\t${ratingUpdate.oldRating}\t${posSign}${ratingUpdate.ratingChange}\t${ratingUpdate.sigmaChange}\t${mode}`;

		//append new rating change to rating changes database
		try {
			fs.appendFileSync(
				currDataPath + "/RatingChanges.txt",
				newRatingChangeStr
			);
		} catch (err) {
			throw err;
		}

		const PlayerFolder = `${player.playerID} ${player.username}/`;
		try {
			fs.appendFileSync(
				currDataPath + "/PlayerData/" + PlayerFolder + "RatingChanges.txt",
				newRatingChangeStr
			);
		} catch (e) {
			if (e.code == "ENOENT") {
				// no such file or directory. File really does not exist
				fs.mkdir(currDataPath + "/PlayerData/" + PlayerFolder, (err) => {
					if (err) throw err;
				});
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
				fs.appendFileSync(
					currDataPath + "/PlayerData/" + PlayerFolder + "RatingChanges.txt",
					newRatingChangeStr
				);
			} else {
				throw e;
			}
		}
	}
	return;
};

const updateTeamRatingsQuery = async (match, teams) => {
	//read database
	const currDataPath = getCurrentDataPath();

	for (var matchTeam of teams) {
		//update player database file
		const team = await getTeamFromTeamNameQuery(matchTeam.teamName);
		/*
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${match.time}\t${player.twosLastPlayed}`;
		}
		else {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${match.time}`;
		}
		*/
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
		const lastRatingID = findMaxID("R", getCol(RatingsData, 0).slice(1));
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

		/* No team folders for now
		const PlayerFolder = `${player.playerID} ${player.username}/`;
		try {
			fs.appendFileSync(currDataPath + '/PlayerData/'+ PlayerFolder + 'RatingChanges.txt', newRatingChangeStr);
		}
		catch (e) {
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
				fs.appendFileSync(currDataPath + '/PlayerData/'+ PlayerFolder + 'RatingChanges.txt', newRatingChangeStr);
			}
			else {
				throw e;
			}
		}
		*/
	}
	return;
};

const softResetDatabaseQuery = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
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
	fs.copyFileSync(tempsPath + "Players.txt", currDataPath + "/Players.txt");

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
	
	return;
};

const seasonRollQuery = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let PlayerData = readDatabase(currDataPath + "/Players.txt");
	PlayerData = PlayerData.slice(2);

	const activePlayers = PlayerData.filter(
		(row) =>
			parseInt(row[9]) +
				parseInt(row[10]) +
				parseInt(row[11]) +
				parseInt(row[12]) +
				parseInt(row[13]) +
				parseInt(row[14]) !==
			0
	); //Players with atleast 1 match
	const numActivePlayers = activePlayers.length; //return this result

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
		0: {
			min: 1,
			max: 19,
		},
		1: {
			min: 20,
			max: 39,
		},
		2: {
			min: 40,
			max: 99,
		},
		3: {
			min: 100,
		},
	};

	let drawWinner;
	let count = 0;

	while (!drawWinner) {
		count += 1;
		//console.log('count');
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

	return {
		PoolSize: numActivePlayers,
		Winner: drawWinner,
	};
};

async function importGSheet(sht_name) {
	const doc = new GoogleSpreadsheet(cfg.rpugsSheet.linkID);

	const creds = require("../../creds.json");
	await doc.useServiceAccountAuth(creds);
	await doc.loadInfo();

	return doc.sheetsByTitle[sht_name];
}

async function writeLeagueList() {
	const currDataPath = getCurrentDataPath();

	const sheet = await importGSheet(cfg.rpugsSheet.sheetNames.leaguePlayers);

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

	fs.writeFileSync(currDataPath + "/leaguePlayerList.txt", leagueListData);

	await refreshTeamsList();

	return;
}

async function refreshTeamsList() {
	const currDataPath = getCurrentDataPath();
	let leagueListData = readDatabase(currDataPath + "/leaguePlayerList.txt");
	let TeamData = readDatabase(currDataPath + "/Teams.txt");

	let leagueTeams = [];

	for (const player of leagueListData) {
		let leagueListTeamNames = leagueTeams.map((x) => x.teamName.toLowerCase());
		if (
			!leagueListTeamNames.includes(player[3].toLowerCase()) &&
			player[3] !== "Team" &&
			player[3].toLowerCase() !== "Free_Agent".toLowerCase()
		) {
			leagueTeams.push({
				teamName: player[3],
				teamLeague: player[2],
			});
		}
	}

	const lastTeamID = findMaxID("T", getCol(TeamData, 0).slice(1));
	let newTeamStr = "";
	let counter = 0;
	leagueTeams.forEach((team) => {
		if (!getCol(TeamData, 1).includes(team.teamName)) {
			counter += 1;
			newTeamStr += `\nT${lastTeamID + counter}\t${team.teamName}\t${
				team.teamLeague
			}\t1500\t3.626\t0\t0\t-`;
		}
	});

	if (newTeamStr !== "") {
		try {
			fs.appendFileSync(currDataPath + "/Teams.txt", newTeamStr);
		} catch (err) {
			throw err;
		}
	}

	return;
}

async function writeBanList() {
	const sheet = await importGSheet(cfg.rpugsSheet.sheetNames.banPlayers);

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
	const sheet = await importGSheet(cfg.rpugsSheet.sheetNames.tipList);

	const rows = await sheet.getRows();
	let tipListData = "";

	for (const tip of rows) {
		tipListData += `${tip["Priority (1 - 50%, 2 - 35%, 3 - 15%)"]}\t${tip["Tip"]}\n`;
	}

	tipListData = tipListData.slice(0, -1);

	fs.writeFileSync("./Database/serverTips.txt", tipListData);

	return;
}

export {
	queryPlayerDatabase,
	queryTeamDatabase,
	createPlayer,
	getPlayerFromDiscordIdQuery,
	getPlayerFromDiscordIdQueryMoreInfo,
	getPlayerCareerFromDiscordIdQuery,
	getPlayerFromUsernameQuery,
	getPlayerFromUsernameQueryMoreInfo,
	getPlayerCareerFromUsernameQuery,
	getVersusInfo,
	getVersusCareerInfo,
	getSeasonSummary,
	createMatchQuery,
	recordMatchQuery,
	updatePlayerRatingsQuery,
	updateTeamRatingsQuery,
	softResetDatabaseQuery,
	seasonRollQuery,
	writeLeagueList,
	getLeaguePlayerFromDiscordIdQuery,
	writeBanList,
	writeTipList,
	getTeamFromTeamNameQuery,
};
