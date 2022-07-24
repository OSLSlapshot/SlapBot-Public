const environments = {
    development: 'development',
    production: 'production'
};

const cfg = {
    discordToken: (removed),	//bot token
    environment: environments.production,
    server: {
        development: 'test',	//not used
        production: ''	//server name
    },
    cmdChannels: {
        development: ['test'],	//not used
		production: {	//All the listed channels are required to be created and visible to the bot on the server or else the bot will throw an error on startup
			casualCh: 'rpugs-casual',
			leagueCh: 'rpugs-league',
			infoCh: 'rpugs-rules',
			modCh: 'moderation',
			otherCh: 'funzone',
			updatesCh: 'rpugs-status',
			tipsCh: 'general',
		}
    },
	idleParams: {	//Queue idle checking
		idleCheckerEnable: 1,	//0 or 1
		idleThresholdmin: 5,	//0.0025 ; // Threshold for when to alert players they will be kicked for idling in units of minutes
		kickThresholdmin: 5,	//0.1 ; // Threshold for when to kick players for idling after they have been alerted in units of minutes
		checkPeriodmin: 0.01	//0.01 ; // Period for calling idle check function in units of minutes
	},
    trueskill: {	//starting ratings
        casualInitTS: {
            initialRating: 1500,
            initialSigma: 1.813 * 2
        },
        leagueInitTS: {
            initialRating: 1500,
            initialSigma: 1.813 * 2
        }
    },
	checkinTime: 0.1,		//Time (in minutes) for checking in for rpugs match after queue has popped before match is cancelled
	rpugsSheet: {
		linkID: (removed),	//RPUGs Google sheet link/ID
		sheetNames: {
			leaguePlayers: 'League Player List',	//League Player list sheet name
			banPlayers: 'Ban List',	//Banned player list sheet name
			quoteList: 'Quote List',	//List of quotes sheet name
			tipList: 'Tip List',	//List of server tips
		}
	},
	leagueConditions: {
		leagueEnable: 1,
		//leagueDatabaseSheet: (removed),
	},
	moderators: {
		commissioners: [],	//list of discord IDs, commissioners also count as admins
		admins: []
	}
};

export default cfg;