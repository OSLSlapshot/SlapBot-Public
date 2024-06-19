import fs from 'fs';
import { writeLeagueList } from '../queries/index.js';
import cfg from '../../config.js';

function getDirectories(path) {
	return fs.readdirSync(path).filter(function (file) {
		return fs.statSync(path + '/' + file).isDirectory();
	});
}

async function createNewDataDir(path, currStr) {
	const now = new Date();
	now.setHours(now.getHours() + 10); //AEST
	const folder_name = `${now.getUTCFullYear()}`+`${now.getUTCMonth()+1}`.padStart(2,"0")+`${now.getUTCDate()}`.padStart(2,"0")+` ${currStr}`;
	try {
		await fs.promises.mkdir(path + folder_name);
	}
	catch (err) {
		throw err;
	}
	/*
	fs.mkdir(path + folder_name+'/PlayerData', err => { 
		if (err) throw err;
	});
	*/
	return folder_name;
}

async function initDatabase() {
	const dataDir = './Database/data/';
	const tempsDir = './Database/templates/';
	const baseTemps = ['Players.txt','Matches.txt','RatingChanges.txt','Teams.txt'];
	
	const datesDirs = getDirectories(dataDir);
	const searchStr = '(current)';
	for (const dir of datesDirs) {
		if (dir.slice(-searchStr.length) === searchStr) {
			return false;
		}
	}
	
	const folder_name = await createNewDataDir(dataDir,searchStr);

	for (const temp of baseTemps) {
		try {
			await fs.promises.copyFile(tempsDir + temp, dataDir + folder_name + '/' + temp);
		}
		catch (err) {
			throw err;
		}
	}
	
	const modesDirPath = dataDir + folder_name + '/Modes/';
	await fs.promises.mkdir(modesDirPath);
	
	for (const m of cfg.modes) {
		const modeDirPath = modesDirPath + m.modeName;
		await fs.promises.mkdir(modeDirPath);
		await fs.promises.copyFile(tempsDir + 'ModeRatings.txt', modeDirPath + '/Ratings.txt');
	}
	
	
	//if (cfg.leagueConditions.leagueEnable) {
	//	await writeLeagueList();
	//}
	
	return folder_name;
}

export { getDirectories, createNewDataDir, initDatabase };