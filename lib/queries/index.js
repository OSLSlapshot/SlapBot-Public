/* ==========================================
*  Dependencies
/* ========================================== */

//import Bluebird from 'bluebird';
//import _ from 'lodash';
import cfg from '../../config';
import fs from 'fs';
import { max } from 'mathjs';
import stripUsername from '../utls/stripUsername';
import { getDirectories } from '../scripts/initDatabase';
import { GoogleSpreadsheet } from "google-spreadsheet";
import async from "async";

/* ==========================================
*  Functions
/* ========================================== */
/*
function getCurrentIsoDate() {
    const date = new Date();
    return date.toISOString();
}
*/

const dataPath = './Database/data/';
const tempsPath = './Database/templates/';
const temps = ['Players.txt','Matches.txt','RatingChanges.txt'];

function Player(playerID,discordId, username, casualRating, casualSigma, twosRating, twosSigma, NOMW, NOML, NPMW, NPML, LPO, LPP) {
	this.playerID = playerID;
    this.discordId = discordId;
    this.username = username;
    this.casualRating = casualRating;
    this.casualSigma = casualSigma;
	this.twosRating = twosRating;
	this.twosSigma = twosSigma;
	this.casualWins = NOMW;
	this.casualLosses = NOML;
	this.twosWins = NPMW;
	this.twosLosses = NPML;
	this.casualLastPlayed = LPO;
	this.twosLastPlayed = LPP;
}

function LeaguePlayer(discordID, username, league, teamName) {
	this.discordID = discordID;
	this.username = username;
	this.league = league;
	this.teamName = teamName;
}

function LeagueTeam(teamID, teamName, teamLeague, teamRating, teamSigma, NTMW,NTML,TLP, players) {
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

function RatingUpdate(ratingID, matchID, playerID, oldRating, ratingChange, sigmaChange, mode) {
    this.ratingID = ratingID;
	this.matchID = matchID;
	this.playerID = playerID;
	this.oldRating = oldRating;
	this.ratingChange = ratingChange;
	this.sigmaChange = sigmaChange;
	this.mode = mode;
}

function getCol(arr,idx) {
	//get column with index idx
	return arr.map(x => x[idx]);
	//console.log(PlayerData.map(x => x[1]).slice(1));
}

function findMaxID(identifier,arr) {
	//find the largest ID number in input array
	const arrInt = arr.map(x => parseInt(x.replace(identifier,"")));
	return arrInt.reduce(function(a, b) {
		return Math.max(a, b);
		});
}

function getCurrentDataPath() {
	const datesDirs = getDirectories(dataPath);
	const searchStr = '(current)';
	for (const dir of datesDirs) {
		if (dir.slice(-searchStr.length) === searchStr) {
			return dataPath+dir;
		}
	}
	return false
}

/**
 * Removes certain query-dangerous characters from usernames
 * @param {*} username
 */
function sanitize(username) {
    return username
        .split(' ').join('')
        .split('"').join('')
        .split("'").join('')
        .split('\\').join('');
}

/* ==========================================
*  Functional Query Helpers
/* ========================================== */

/**
 * Queries the GraphQL Database to find existing entries
 * @param {String} node - Name of the node to query
 * @param {Array.<String>} properties - List of properties to query for
 */
 
 
const queryPlayerDatabase = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let PlayerData = readDatabase(currDataPath+'/Players.txt');
	
	PlayerData = PlayerData.slice(1);
	
	return PlayerData.map(player => new Player(player[0],player[1],player[2],parseInt(player[3]),parseFloat(player[4]),parseInt(player[5]),parseFloat(player[6]),parseInt(player[7]),parseInt(player[8]),parseInt(player[9]),parseInt(player[10]),player[11],player[12]));
};

const queryTeamDatabase = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let TeamData = readDatabase(currDataPath+'/Teams.txt');
	
	TeamData = TeamData.slice(2);
	return TeamData.map(team => new LeagueTeam(team[0],team[1],team[2],parseInt(team[3]),parseFloat(team[4]),parseInt(team[5]),parseInt(team[6]),team[7],[]));
};

/* ==========================================
*  Maps
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
*  Queries
/* ========================================== */

function readDatabase(fileLoc) {
	try {
		var data = fs.readFileSync(fileLoc, 'utf8');
		data = data.split('\n');
		data = data.map(line => line.split('\t'));
	}
	catch (e) {
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
	const PlayerData = readDatabase(currDataPath+'/Players.txt');
	
	const checkEnable = 1;
	
	if ((getCol(PlayerData,1).includes(player.discordId)) && checkEnable) {
		throw {name : "DiscordIDExists", message : "Field name = discordId"};
	}
	else if ((getCol(PlayerData,2).map(v => stripUsername(v).toLowerCase()).includes(stripUsername(player.username).toLowerCase())) && checkEnable) {
		const playerFound = await getPlayerFromUsernameQuery(player.username);
		throw {name : "UsernameExists", message : "Field name = username", registered_name: playerFound.username};
	}
	else {
		const lastPlayerID = findMaxID("P",getCol(PlayerData,0).slice(1));
		const newPlayerStr = `\nP${lastPlayerID+1}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t0\t0\t0\t0\t-\t-`;
		
		//append new player to player database
		try {
			fs.appendFileSync(currDataPath+'/Players.txt', newPlayerStr);
			const PlayerFolder = `P${lastPlayerID+1} ${player.username}/`;
			fs.mkdir(currDataPath + '/PlayerData/' + PlayerFolder, err => { 
				if (err) throw err;
				for (const temp of temps) {
					if (!(temp == 'Players.txt')) {
						fs.copyFile(tempsPath+temp, currDataPath +'/PlayerData/' + PlayerFolder + temp, (err) => {
							if (err) throw err;
						});
					}
				}
			});
			
		}
		catch (err) {
			throw err;
		}
	}
};

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
	const MatchData = readDatabase(currDataPath+'/Matches.txt');
	const currentMatchID = findMaxID("M",getCol(MatchData,0).slice(1))+1;
	const currentMatch = new Match(currentMatchID, matchTime, {}, {}, {}, mode);
	const newMatchStr = `\nM${currentMatch.matchID}\t${currentMatch.time}\t-\t-\t-\t${currentMatch.mode}`;
	
	//append new match to match database
	try {
		fs.appendFileSync(currDataPath+'/Matches.txt', newMatchStr);
	} catch (err) {
		throw err;
	}
	
    return currentMatch;
};

const recordMatchQuery = async (match, winner, loser, ratingsChange, mode) => {
	
	if (mode === 'scrims') {
		var updatedMatchStr = `M${match.matchID}\t${match.time}\t${winner.teamID},${loser.teamID}\t${winner.teamName}(${(ratingsChange[winner.teamName].newRating - ratingsChange[winner.teamName].previousRating<=0?"":"+")}${ratingsChange[winner.teamName].newRating - ratingsChange[winner.teamName].previousRating})\t${loser.teamName}(${(ratingsChange[loser.teamName].newRating - ratingsChange[loser.teamName].previousRating<=0?"":"+")}${ratingsChange[loser.teamName].newRating - ratingsChange[loser.teamName].previousRating})\t${mode}`;
	}
	else {
		var updatedMatchStr = `M${match.matchID}\t${match.time}\t${(winner.map(p => p.playerID)).join()},${(loser.map(p => p.playerID)).join()}\t` + (winner.map(p => `${p.username}(${(ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating<=0?"":"+")}${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating})`)).join() + `\t` + (loser.map(p => `${p.username}(${(ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating<=0?"":"+")}${ratingsChange[p.discordId].newRating - ratingsChange[p.discordId].previousRating})`)).join() + `\t${mode}`;
	}

	//find match and replace line with players, winner, loser and ratings
	try {
		const currDataPath = getCurrentDataPath();
		const MatchData = fs.readFileSync(currDataPath+'/Matches.txt', 'utf8');
		let searchString = `M${match.matchID}\t${match.time}\t`;
		let re = new RegExp('^.*' + searchString + '.*$', 'gm');
		let updatedData = MatchData.replace(re, updatedMatchStr);
		fs.writeFileSync(currDataPath+'/Matches.txt',updatedData);
		
		if (mode !== 'scrims') {
			const winnersAndLosers = [...winner,...loser];
			for (const player of winnersAndLosers) {
				const PlayerFolder = `${player.playerID} ${player.username}/`;
				try  {
					fs.appendFileSync(currDataPath + '/PlayerData/'+ PlayerFolder + 'Matches.txt', `\n${updatedMatchStr}`);
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
					*/
				}
			}
		}
	}
	catch (e) {
		console.log(e);
		return false;
	}
	
	try {
		if (mode === 'scrims') {
			updateTeamMatches(winner,loser,mode);
		}
		else {
			updatePlayerMatches(winner,loser,mode);
		}
	}
	catch (e) {
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
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins+1}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		else if (mode == 'twos') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins+1}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath+'/Players.txt', 'utf8');
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp('^.*' + searchString + '.*$', 'gm');
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath+'/Players.txt',updatedData);
		}
		catch (e) {
		console.log(e);
		return e;
		}
	}
	
	for (var matchPlayer of loser) {
		
		//update player database file
		const player = await getPlayerFromDiscordIdQuery(matchPlayer.discordId);
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses+1}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}
		else if (mode == 'twos') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses+1}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath+'/Players.txt', 'utf8');
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp('^.*' + searchString + '.*$', 'gm');
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath+'/Players.txt',updatedData);
		}
		catch (e) {
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
	var updatedTeamStr = `${team.teamID}\t${team.teamName}\t${team.teamLeague}\t${team.teamRating}\t${team.teamSigma}\t${team.teamWins+1}\t${team.teamLosses}\t${team.teamLastPlayed}`;

		//find player and replace line with latest ratings
	try {
		const TeamData = fs.readFileSync(currDataPath+'/Teams.txt', 'utf8');
		let searchString = `${team.teamID}\t${team.teamName}\t`;
		let re = new RegExp('^.*' + searchString + '.*$', 'gm');
		let updatedData = TeamData.replace(re, updatedTeamStr);
		fs.writeFileSync(currDataPath+'/Teams.txt',updatedData);
	}
	catch (e) {
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
	updatedTeamStr = `${team.teamID}\t${team.teamName}\t${team.teamLeague}\t${team.teamRating}\t${team.teamSigma}\t${team.teamWins}\t${team.teamLosses+1}\t${team.teamLastPlayed}`;

		//find player and replace line with latest ratings
	try {
		const TeamData = fs.readFileSync(currDataPath+'/Teams.txt', 'utf8');
		let searchString = `${team.teamID}\t${team.teamName}\t`;
		let re = new RegExp('^.*' + searchString + '.*$', 'gm');
		let updatedData = TeamData.replace(re, updatedTeamStr);
		fs.writeFileSync(currDataPath+'/Teams.txt',updatedData);
	}
	catch (e) {
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
	const PlayerData = readDatabase(currDataPath+'/Players.txt');

	const playerIdx = PlayerData.map(x => x[1]).indexOf(discordId.toString());
	
	if (playerIdx !== -1) {
		return new Player(PlayerData[playerIdx][0],discordId,PlayerData[playerIdx][2],parseInt(PlayerData[playerIdx][3]),parseFloat(PlayerData[playerIdx][4]),parseInt(PlayerData[playerIdx][5]),parseFloat(PlayerData[playerIdx][6]),parseInt(PlayerData[playerIdx][7]),parseInt(PlayerData[playerIdx][8]),parseInt(PlayerData[playerIdx][9]),parseInt(PlayerData[playerIdx][10]),PlayerData[playerIdx][11],PlayerData[playerIdx][12]);
	}
	else {
		return null;
	}
};

/**
 * Returns information for a Player from their assigned Username
 * @param {String} username
 */
 
const getPlayerFromUsernameQuery = async (username) => {
	
	const currDataPath = getCurrentDataPath();
	const PlayerData = readDatabase(currDataPath+'/Players.txt');
	
	const playerIdx = PlayerData.map(x => stripUsername(x[2]).toLowerCase()).indexOf(stripUsername(username.toString()).toLowerCase());
	
	if (playerIdx !== -1) {
		return new Player(PlayerData[playerIdx][0],PlayerData[playerIdx][1],PlayerData[playerIdx][2],parseInt(PlayerData[playerIdx][3]),parseFloat(PlayerData[playerIdx][4]),parseInt(PlayerData[playerIdx][5]),parseFloat(PlayerData[playerIdx][6]),parseInt(PlayerData[playerIdx][7]),parseInt(PlayerData[playerIdx][8]),parseInt(PlayerData[playerIdx][9]),parseInt(PlayerData[playerIdx][10]),PlayerData[playerIdx][11],PlayerData[playerIdx][12]);
	}
	else {
		return null;
	}
};

/**
 * Returns information for a League player from their assigned discsord ID
 * @param {String} username
 */

const getLeaguePlayerFromDiscordIdQuery = async (ID) => {
	//read league list database
	const currDataPath = getCurrentDataPath();
	const LeagueListData = readDatabase(currDataPath+'/leaguePlayerList.txt');

	const playerIdx = (LeagueListData.map(x => x[0])).indexOf(ID.toString());

	if ((playerIdx !== -1) && (LeagueListData[playerIdx][3] !== 'Free_Agent')) {
		return new LeaguePlayer(ID,LeagueListData[playerIdx][1],LeagueListData[playerIdx][2],LeagueListData[playerIdx][3]);
	}
	else {
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
}

/**
 * Returns information for a Team from their assigned TeamName
 * @param {String} username
 */
 
const getTeamFromTeamNameQuery = async (teamName) => {
	
	const currDataPath = getCurrentDataPath();
	const TeamData = readDatabase(currDataPath+'/Teams.txt');
	const LeagueListData = readDatabase(currDataPath+'/leaguePlayerList.txt');
	
	const teamPlayerList = (LeagueListData.filter(x => x[3] === teamName)).map(x => new LeaguePlayer(x[0],x[1],x[2],x[3]));
	
	const teamIdx = TeamData.map(x => x[1]).indexOf(teamName);	//replaces spaces with underscores for teamName
	
	if (teamIdx !== -1) {
		return new LeagueTeam(TeamData[teamIdx][0],teamName,TeamData[teamIdx][2],parseInt(TeamData[teamIdx][3]),parseFloat(TeamData[teamIdx][4]),parseInt(TeamData[teamIdx][5]),parseInt(TeamData[teamIdx][6]),TeamData[teamIdx][7],teamPlayerList);
	}
	else {
		return null;
	}
}

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
		if (mode == 'casual') {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${match.time}\t${player.twosLastPlayed}`;
		}
		else {
			var updatedPlayerStr = `${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${matchPlayer.rating}\t${matchPlayer.sigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${match.time}`;
		}

		//find player and replace line with latest ratings
		try {
			const PlayerData = fs.readFileSync(currDataPath+'/Players.txt', 'utf8');
			let searchString = `\t${player.discordId}\t${player.username}\t`;
			let re = new RegExp('^.*' + searchString + '.*$', 'gm');
			let updatedData = PlayerData.replace(re, updatedPlayerStr);
			fs.writeFileSync(currDataPath+'/Players.txt',updatedData);
		}
		catch (e) {
		console.log(e);
		}
		
		//update rating changes file
		const RatingsData = readDatabase(currDataPath+'/RatingChanges.txt');
		const lastRatingID = findMaxID("R",getCol(RatingsData,0).slice(1));
		if (mode === 'casual') {
			var ratingUpdate = new RatingUpdate(lastRatingID+1,match.matchID,player.playerID,player.casualRating,matchPlayer.rating - player.casualRating,matchPlayer.sigma - player.casualSigma, mode);
		}
		else {
			var ratingUpdate = new RatingUpdate(lastRatingID+1,match.matchID,player.playerID,player.twosRating,matchPlayer.rating - player.twosRating,matchPlayer.sigma - player.twosSigma, mode);
		}
		let posSign = "";
		if (ratingUpdate.ratingChange >= 0) { posSign = "+" }
		const newRatingChangeStr = `\nR${ratingUpdate.ratingID}\tM${ratingUpdate.matchID}\t${ratingUpdate.playerID}\t${ratingUpdate.oldRating}\t${posSign}${ratingUpdate.ratingChange}\t${ratingUpdate.sigmaChange}\t${mode}`;
			
		//append new rating change to rating changes database
		try {
			fs.appendFileSync(currDataPath+'/RatingChanges.txt', newRatingChangeStr);
		}
		catch (err) {
			throw err;
		}
		
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
			const TeamData = fs.readFileSync(currDataPath+'/Teams.txt', 'utf8');
			let searchString = `${team.teamID}\t${team.teamName}\t`;
			let re = new RegExp('^.*' + searchString + '.*$', 'gm');
			let updatedData = TeamData.replace(re, updatedTeamStr);
			fs.writeFileSync(currDataPath+'/Teams.txt',updatedData);
		}
		catch (e) {
			console.log(e);
		}
		
		
		//update rating changes file
		const RatingsData = readDatabase(currDataPath+'/RatingChanges.txt');
		const lastRatingID = findMaxID("R",getCol(RatingsData,0).slice(1));
		var ratingUpdate = new RatingUpdate(lastRatingID+1,match.matchID,team.teamID,team.teamRating,matchTeam.rating - team.teamRating,matchTeam.sigma - team.teamSigma, 'scrims');
		let posSign = "";
		if (ratingUpdate.ratingChange >= 0) { posSign = "+" }
		const newRatingChangeStr = `\nR${ratingUpdate.ratingID}\tM${ratingUpdate.matchID}\t${ratingUpdate.playerID}\t${ratingUpdate.oldRating}\t${posSign}${ratingUpdate.ratingChange}\t${ratingUpdate.sigmaChange}\t${ratingUpdate.mode}`;
			
		//append new rating change to rating changes database
		try {
			fs.appendFileSync(currDataPath+'/RatingChanges.txt', newRatingChangeStr);
		}
		catch (err) {
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
}

const softResetDatabaseQuery = async () => {
	//read database
	const currDataPath = getCurrentDataPath();
	let PlayerData = readDatabase(currDataPath+'/Players.txt');
	PlayerData = PlayerData.slice(2);
	
	const resetPlayerData = PlayerData.map(player => new Player(player[0],player[1],player[2],cfg.trueskill.casualInitTS.initialRating,cfg.trueskill.casualInitTS.initialSigma,cfg.trueskill.twosInitTS.initialRating,cfg.trueskill.twosInitTS.initialSigma,0,0,0,0,'-','-'));
	fs.copyFileSync(tempsPath+'Players.txt', currDataPath +'/Players.txt');
	
	for (const player of resetPlayerData) {
		const updatedPlayerStr = `\n${player.playerID}\t${player.discordId}\t${player.username}\t${player.casualRating}\t${player.casualSigma}\t${player.twosRating}\t${player.twosSigma}\t${player.casualWins}\t${player.casualLosses}\t${player.twosWins}\t${player.twosLosses}\t${player.casualLastPlayed}\t${player.twosLastPlayed}`;
		
		try {
			fs.appendFileSync(currDataPath+'/Players.txt', updatedPlayerStr);
			const PlayerFolder = `${player.playerID} ${player.username}/`;
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
		}
		catch (err) {
			throw err;
		}
	}
	
	return;
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
		leagueListData += `\n${player['Discord ID']}\t${sanitize(player['Primary Username'])}\t${player['League']}\t${player['Team'].replace(/\s+/g,'_')}`;
	}

	fs.writeFileSync(currDataPath + '/leaguePlayerList.txt',leagueListData);
	
	await refreshTeamsList();
	
	return;
}

async function refreshTeamsList() {
	const currDataPath = getCurrentDataPath();
	let leagueListData = readDatabase(currDataPath+'/leaguePlayerList.txt');
	let TeamData = readDatabase(currDataPath+'/Teams.txt');
	
	let leagueTeams = []
	
	for (const player of leagueListData) {
		let leagueListTeamNames = leagueTeams.map(x => x.teamName.toLowerCase());
		if ((!(leagueListTeamNames.includes(player[3].toLowerCase()))) && (player[3] !== 'Team') && (player[3].toLowerCase() !== 'Free_Agent'.toLowerCase())) {
			leagueTeams.push({
				teamName: player[3],
				teamLeague: player[2]
			});
		}
	}
	
	const lastTeamID = findMaxID("T",getCol(TeamData,0).slice(1));
	let newTeamStr = ''
	let counter = 0;
	leagueTeams.forEach(team => {
		if (!(getCol(TeamData,1).includes(team.teamName))) {
			counter += 1;
			newTeamStr += `\nT${lastTeamID+counter}\t${team.teamName}\t${team.teamLeague}\t1500\t3.626\t0\t0\t-`;
		}
	});
	
	if (newTeamStr !== '') {
		try {
			fs.appendFileSync(currDataPath+'/Teams.txt', newTeamStr);
			}
		catch (err) {
			throw err;
		}
	}
	
	return;
}

async function writeBanList() {
	
	const sheet = await importGSheet(cfg.rpugsSheet.sheetNames.banPlayers);
	
	const rows = (await sheet.getRows()).filter(player => (player['Discord ID'] != '[used]'));
	let banListData = '';

	for (const player of rows) {
		banListData += `${player['Discord ID']}\n`;
	}

	fs.writeFileSync('./Database/banned.txt',banListData);
	
	return;
}

async function writeTipList() {
	
	const sheet = await importGSheet(cfg.rpugsSheet.sheetNames.tipList);
	
	const rows = await sheet.getRows();
	let tipListData = '';

	for (const tip of rows) {
		tipListData += `${tip['Tip']}\n`;
	}

	tipListData = tipListData.slice(0, -1);

	fs.writeFileSync('./Database/serverTips.txt',tipListData);
	
	return;
}

export {
	queryPlayerDatabase,
	queryTeamDatabase,
	createPlayer,
	getPlayerFromDiscordIdQuery,
	getPlayerFromUsernameQuery,
	createMatchQuery,
	recordMatchQuery,
	updatePlayerRatingsQuery,
	updateTeamRatingsQuery,
	softResetDatabaseQuery,
	writeLeagueList,
	getLeaguePlayerFromDiscordIdQuery,
	writeBanList,
	writeTipList,
	getTeamFromTeamNameQuery
};