import fs from 'fs';
import { writeLeagueList } from '../queries';
import cfg from '../../config';

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

function createNewDataDir(path, currStr) {
	const now = new Date();
	now.setHours(now.getHours() + 10); //AEST
	const folder_name = `${now.getUTCFullYear()}`+`${now.getUTCMonth()+1}`.padStart(2,"0")+`${now.getUTCDate()}`.padStart(2,"0")+` ${currStr}`;
	fs.mkdir(path + folder_name, err => { 
    if (err) throw err;
    });
	fs.mkdir(path + folder_name+'/PlayerData', err => { 
    if (err) throw err;
    });
	
	return folder_name;
}

async function initDatabase() {
	const dataDir = './Database/data/';
	const tempsDir = './Database/templates/';
	const temps = ['Players.txt','Matches.txt','RatingChanges.txt','Teams.txt'];
	
	const datesDirs = getDirectories(dataDir);
	const searchStr = '(current)';
	for (const dir of datesDirs) {
		if (dir.slice(-searchStr.length) === searchStr) {
			return false;
		}
	}
	
	const folder_name = createNewDataDir(dataDir,searchStr);

	for (const temp of temps) {
		fs.copyFileSync(tempsDir+temp, dataDir+folder_name+'/'+temp);
	}
	
	//if (cfg.leagueConditions.leagueEnable) {
	//	await writeLeagueList();
	//}
	
	return true;
}

export { getDirectories, createNewDataDir, initDatabase };